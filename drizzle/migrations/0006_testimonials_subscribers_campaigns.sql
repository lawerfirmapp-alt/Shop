create extension if not exists pg_net with schema extensions;

create or replace function public.html_escape(t text) returns text language sql immutable set search_path = public as $$
  select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

-- Removes HTML tags and stray angle brackets; keep_lines keeps line breaks (max one blank line).
create or replace function public.clean_text(t text, keep_lines boolean default false) returns text language sql immutable set search_path = public as $$
  select btrim(case when keep_lines
    then regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(t, ''), '<[^>]*>', '', 'g'), '[<>]', '', 'g'), '[ \t]+', ' ', 'g'), '\n\s*\n(\s*\n)+', E'\n\n', 'g')
    else regexp_replace(regexp_replace(regexp_replace(coalesce(t, ''), '<[^>]*>', '', 'g'), '[<>]', '', 'g'), '\s+', ' ', 'g') end)
$$;

-- ===== Testimonials =====
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  message text not null check (length(message) between 10 and 600),
  product_id uuid references public.products(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.testimonials to anon, authenticated;
grant update, delete on public.testimonials to authenticated;
grant all on public.testimonials to service_role;
alter table public.testimonials enable row level security;
create policy "Shoppers see approved testimonials" on public.testimonials for select to anon, authenticated using (status = 'approved');
create policy "Admins see all testimonials" on public.testimonials for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins edit testimonials" on public.testimonials for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete testimonials" on public.testimonials for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger testimonials_updated_at before update on public.testimonials for each row execute function public.update_updated_at();

create or replace function public.submit_testimonial(p_name text, p_rating int, p_message text, p_product_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  n text := public.clean_text(p_name);
  m text := public.clean_text(p_message, true);
  pid uuid := p_product_id;
begin
  if length(n) not between 2 and 60 then raise exception 'Please enter your name (2 to 60 characters).'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'Please choose a star rating.'; end if;
  if length(m) not between 10 and 600 then raise exception 'Please write between 10 and 600 characters.'; end if;
  if pid is not null and not exists (select 1 from public.products where id = pid and is_active) then pid := null; end if;
  if (select count(*) from public.testimonials where status = 'pending' and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'We are receiving a lot of reviews right now. Please try again later.';
  end if;
  insert into public.testimonials (name, rating, message, product_id) values (n, p_rating, m, pid);
end $$;
revoke all on function public.submit_testimonial(text, int, text, uuid) from public;
grant execute on function public.submit_testimonial(text, int, text, uuid) to anon, authenticated;

-- ===== Email settings =====
create table public.email_settings (
  id smallint primary key default 1 check (id = 1),
  provider text not null default 'brevo',
  sender_name text not null default 'Tsholo R Fashion House',
  sender_email text,
  site_url text not null default 'https://tsholo-ankara-accessory-boutique.lovable.app' check (site_url ~ '^https?://[^\s<>"]+$'),
  shop_address text not null default '56 Augrabies Street, 71 Stone Forest, Mooikloof Ridge Estate, 0081',
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.email_settings to authenticated;
grant all on public.email_settings to service_role;
alter table public.email_settings enable row level security;
create policy "Admins read email settings" on public.email_settings for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins add email settings" on public.email_settings for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins change email settings" on public.email_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- The email service key: no policies and no grants, so it can never be read back through the app.
create table public.email_secrets (
  id smallint primary key default 1 check (id = 1),
  api_key text not null,
  updated_at timestamptz not null default now()
);
grant all on public.email_secrets to service_role;
alter table public.email_secrets enable row level security;

create or replace function public.set_email_api_key(p_key text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Only the shop owner can do this.'; end if;
  if coalesce(btrim(p_key), '') = '' then
    delete from public.email_secrets where id = 1;
  else
    insert into public.email_secrets (id, api_key) values (1, btrim(p_key))
    on conflict (id) do update set api_key = excluded.api_key, updated_at = now();
  end if;
end $$;
revoke all on function public.set_email_api_key(text) from public;
grant execute on function public.set_email_api_key(text) to authenticated;

create or replace function public.email_status() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare k text;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Only the shop owner can do this.'; end if;
  select api_key into k from public.email_secrets where id = 1;
  return jsonb_build_object('connected', k is not null, 'key_hint', case when k is null then null else right(k, 4) end);
end $$;
revoke all on function public.email_status() from public;
grant execute on function public.email_status() to authenticated;

-- Internal: hands one email request to the email service (Brevo). Returns the request number.
create or replace function public.email_http_send(p_body jsonb) returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare k text;
begin
  select api_key into k from public.email_secrets where id = 1;
  if k is null then return null; end if;
  return net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    body := p_body,
    headers := jsonb_build_object('api-key', k, 'Content-Type', 'application/json', 'Accept', 'application/json'),
    timeout_milliseconds := 20000
  );
end $$;
revoke all on function public.email_http_send(jsonb) from public, anon, authenticated;

create or replace function public.email_request_result(p_request_id bigint) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r record;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Only the shop owner can do this.'; end if;
  select status_code, content, error_msg into r from net._http_response where id = p_request_id;
  if not found then return jsonb_build_object('done', false); end if;
  return jsonb_build_object('done', true, 'ok', coalesce(r.status_code between 200 and 299, false),
    'error', case when r.status_code between 200 and 299 then null else left(coalesce(r.error_msg, r.content::text, 'Unknown error'), 300) end);
end $$;
revoke all on function public.email_request_result(bigint) from public;
grant execute on function public.email_request_result(bigint) to authenticated;

-- ===== Subscribers =====
create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  whatsapp text,
  consent_email boolean not null default false,
  consent_whatsapp boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  source text not null default 'footer',
  consent_text text,
  consent_at timestamptz not null default now(),
  confirm_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or whatsapp is not null)
);
create unique index subscribers_email_key on public.subscribers (lower(email)) where email is not null;
create unique index subscribers_whatsapp_only_key on public.subscribers (whatsapp) where email is null;
grant select, update, delete on public.subscribers to authenticated;
grant all on public.subscribers to service_role;
alter table public.subscribers enable row level security;
create policy "Admins see subscribers" on public.subscribers for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins change subscribers" on public.subscribers for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins remove subscribers" on public.subscribers for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger subscribers_updated_at before update on public.subscribers for each row execute function public.update_updated_at();

-- Internal: sends the "please confirm" email (double opt-in).
create or replace function public.send_subscription_confirmation(p_id uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare s public.subscribers; cfg public.email_settings; site text; link text; unsub text; html text; rid bigint;
begin
  select * into s from public.subscribers where id = p_id;
  select * into cfg from public.email_settings where id = 1;
  if s.id is null or s.email is null or not s.consent_email or s.status <> 'pending' or cfg.id is null or cfg.sender_email is null then return false; end if;
  site := rtrim(cfg.site_url, '/');
  link := site || '/subscribe/confirm?token=' || s.token;
  unsub := site || '/unsubscribe?token=' || s.token;
  html := format($h$<div style="background:#fbeee8;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;color:#4a3328">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ead6cc;padding:32px 28px">
<img src="%s/brand/tsholo-r-fashion-house-logo.png" alt="%s" width="200" style="display:block;margin:0 auto 20px;max-width:200px;height:auto">
<h1 style="font-size:24px;margin:0 0 12px;text-align:center">Please confirm your subscription</h1>
<p style="font-size:16px;line-height:1.6">Hi %s,</p>
<p style="font-size:16px;line-height:1.6">You asked to hear about new collections and specials from %s by email. Please confirm by pressing the button below. If you did not ask for this, simply ignore this email and you will not hear from us.</p>
<p style="text-align:center;margin:28px 0"><a href="%s" style="background:#b8735a;color:#ffffff;text-decoration:none;padding:14px 28px;font-family:Arial,sans-serif;font-weight:bold;display:inline-block">Yes, subscribe me</a></p>
<p style="font-size:13px;line-height:1.6;color:#8a6f63">Or open this link: <a href="%s" style="color:#b8735a">%s</a></p>
<hr style="border:none;border-top:1px solid #ead6cc;margin:24px 0">
<p style="font-size:12px;line-height:1.6;color:#8a6f63;text-align:center">%s · %s<br>Don't want these emails? <a href="%s" style="color:#b8735a">Unsubscribe</a></p>
</div></div>$h$,
    site, public.html_escape(cfg.sender_name), public.html_escape(s.name), public.html_escape(cfg.sender_name), link, link, link,
    public.html_escape(cfg.sender_name), public.html_escape(cfg.shop_address), unsub);
  rid := public.email_http_send(jsonb_build_object(
    'sender', jsonb_build_object('name', cfg.sender_name, 'email', cfg.sender_email),
    'to', jsonb_build_array(jsonb_build_object('email', s.email, 'name', s.name)),
    'subject', 'Please confirm your subscription to ' || cfg.sender_name,
    'htmlContent', html,
    'headers', jsonb_build_object('List-Unsubscribe', '<' || site || '/api/public/unsubscribe?token=' || s.token || '>', 'List-Unsubscribe-Post', 'List-Unsubscribe=One-Click')
  ));
  if rid is null then return false; end if;
  update public.subscribers set confirm_sent_at = now() where id = p_id;
  return true;
end $$;
revoke all on function public.send_subscription_confirmation(uuid) from public, anon, authenticated;

create or replace function public.subscribe(p_name text, p_email text, p_whatsapp text, p_consent_email boolean, p_consent_whatsapp boolean, p_source text default 'footer')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  n text := public.clean_text(p_name);
  e text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  w text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '[^0-9+]', '', 'g'), '');
  ce boolean := coalesce(p_consent_email, false);
  cw boolean := coalesce(p_consent_whatsapp, false);
  src text := case when p_source = 'checkout' then 'checkout' else 'footer' end;
  s public.subscribers;
  sent boolean := false;
  ctext text;
begin
  if length(n) not between 2 and 80 then raise exception 'Please enter your name.'; end if;
  if e is not null and (length(e) > 255 or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'Please enter a valid email address.'; end if;
  if w is not null and length(regexp_replace(w, '\D', '', 'g')) not between 9 and 15 then raise exception 'Please enter a valid WhatsApp number.'; end if;
  if not ce and not cw then raise exception 'Please tick how we may contact you: by email, WhatsApp or both.'; end if;
  if ce and e is null then raise exception 'Please enter your email address to get our emails.'; end if;
  if cw and w is null then raise exception 'Please enter your WhatsApp number to get WhatsApp messages.'; end if;
  ctext := 'Agreed to receive new collections and specials from Tsholo R Fashion House by '
    || concat_ws(' and ', case when ce then 'email' end, case when cw then 'WhatsApp' end) || ' (' || src || ' form).';

  if e is not null then
    select * into s from public.subscribers where lower(email) = e;
  else
    select * into s from public.subscribers where email is null and whatsapp = w;
  end if;

  if s.id is null then
    insert into public.subscribers (name, email, whatsapp, consent_email, consent_whatsapp, source, consent_text)
    values (n, e, w, ce, cw, src, ctext) returning * into s;
  elsif s.status = 'confirmed' then
    return jsonb_build_object('status', 'already');
  else
    update public.subscribers set name = n, whatsapp = coalesce(w, whatsapp), consent_email = ce, consent_whatsapp = cw,
      status = 'pending', source = src, consent_text = ctext, consent_at = now(), unsubscribed_at = null,
      token = case when s.status = 'unsubscribed' then gen_random_uuid() else token end
    where id = s.id returning * into s;
  end if;

  if ce and (s.confirm_sent_at is null or s.confirm_sent_at < now() - interval '10 minutes') then
    sent := public.send_subscription_confirmation(s.id);
  end if;
  return jsonb_build_object('status', case when ce then 'check_email' else 'saved' end, 'sent', sent);
end $$;
revoke all on function public.subscribe(text, text, text, boolean, boolean, text) from public;
grant execute on function public.subscribe(text, text, text, boolean, boolean, text) to anon, authenticated;

create or replace function public.confirm_subscription(p_token uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.subscribers;
begin
  update public.subscribers set status = 'confirmed', confirmed_at = now()
  where token = p_token and status = 'pending' and consent_email returning * into s;
  if s.id is null then select * into s from public.subscribers where token = p_token; end if;
  if s.id is null then return jsonb_build_object('status', 'unknown'); end if;
  return jsonb_build_object('status', s.status, 'name', s.name);
end $$;
revoke all on function public.confirm_subscription(uuid) from public;
grant execute on function public.confirm_subscription(uuid) to anon, authenticated;

create or replace function public.unsubscribe(p_token uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.subscribers;
begin
  update public.subscribers set status = 'unsubscribed', unsubscribed_at = coalesce(unsubscribed_at, now()),
    consent_email = false, consent_whatsapp = false
  where token = p_token returning * into s;
  return jsonb_build_object('status', case when s.id is null then 'unknown' else 'unsubscribed' end);
end $$;
revoke all on function public.unsubscribe(uuid) from public;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;

create or replace function public.resend_confirmations() returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Only the shop owner can do this.'; end if;
  for r in select id from public.subscribers where status = 'pending' and consent_email and email is not null
      and (confirm_sent_at is null or confirm_sent_at < now() - interval '10 minutes') loop
    if public.send_subscription_confirmation(r.id) then n := n + 1; end if;
  end loop;
  return n;
end $$;
revoke all on function public.resend_confirmations() from public;
grant execute on function public.resend_confirmations() to authenticated;

-- ===== Campaigns =====
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'new_collection' check (kind in ('new_collection', 'special')),
  channel text not null default 'email' check (channel in ('email', 'whatsapp')),
  subject text not null check (length(subject) between 2 and 150),
  message text not null check (length(message) <= 5000),
  image_path text,
  product_ids uuid[] not null default '{}',
  ends_on date,
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  html text,
  recipients int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create policy "Admins manage campaigns" on public.campaigns for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger campaigns_updated_at before update on public.campaigns for each row execute function public.update_updated_at();

create table public.campaign_batches (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  request_id bigint,
  recipients int not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
grant select on public.campaign_batches to authenticated;
grant all on public.campaign_batches to service_role;
alter table public.campaign_batches enable row level security;
create policy "Admins see campaign batches" on public.campaign_batches for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Sends a campaign to every confirmed email subscriber in batches of 50 (or a test to the owner).
-- The email must contain {{ params.unsubscribe_url }}; each person gets their own unsubscribe link.
create or replace function public.send_campaign(p_id uuid, p_html text, p_test boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.campaigns; cfg public.email_settings; site text; me text := auth.jwt() ->> 'email';
  rid bigint; v jsonb; cnt int; total int := 0; batches int := 0; base jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Only the shop owner can send campaigns.'; end if;
  select * into c from public.campaigns where id = p_id;
  if c.id is null then raise exception 'Campaign not found.'; end if;
  if c.channel <> 'email' then raise exception 'WhatsApp campaigns are coming soon.'; end if;
  select * into cfg from public.email_settings where id = 1;
  if cfg.id is null or cfg.sender_email is null or not exists (select 1 from public.email_secrets where id = 1) then
    raise exception 'Connect your email service and sender address first.';
  end if;
  if p_html is null or length(p_html) > 200000 or position('{{ params.unsubscribe_url }}' in p_html) = 0 then
    raise exception 'The email is missing its unsubscribe link.';
  end if;
  site := rtrim(cfg.site_url, '/');
  base := jsonb_build_object('sender', jsonb_build_object('name', cfg.sender_name, 'email', cfg.sender_email), 'htmlContent', p_html);

  if p_test then
    if me is null then raise exception 'Your account has no email address.'; end if;
    rid := public.email_http_send(base || jsonb_build_object('subject', '[Test] ' || c.subject,
      'messageVersions', jsonb_build_array(jsonb_build_object('to', jsonb_build_array(jsonb_build_object('email', me)),
        'params', jsonb_build_object('name', 'there', 'unsubscribe_url', site || '/unsubscribe')))));
    return jsonb_build_object('test', true, 'to', me, 'request_id', rid);
  end if;

  if c.status <> 'draft' then raise exception 'This campaign has already been sent.'; end if;
  for v, cnt in
    select jsonb_agg(jsonb_build_object('to', jsonb_build_array(jsonb_build_object('email', x.email, 'name', x.name)),
             'params', jsonb_build_object('name', split_part(x.name, ' ', 1), 'unsubscribe_url', site || '/unsubscribe?token=' || x.token))), count(*)
    from (select email, name, token, (row_number() over (order by created_at) - 1) / 50 as b
          from public.subscribers where status = 'confirmed' and consent_email and email is not null) x
    group by x.b order by x.b
  loop
    rid := public.email_http_send(base || jsonb_build_object('subject', c.subject, 'messageVersions', v));
    insert into public.campaign_batches (campaign_id, request_id, recipients, status, error)
    values (c.id, rid, cnt, case when rid is null then 'failed' else 'queued' end, case when rid is null then 'Email service not connected' end);
    total := total + cnt; batches := batches + 1;
  end loop;
  if total = 0 then raise exception 'You have no confirmed email subscribers yet.'; end if;
  update public.campaigns set status = 'sending', recipients = total, sent_at = now(), html = p_html where id = c.id;
  return jsonb_build_object('recipients', total, 'batches', batches);
end $$;
revoke all on function public.send_campaign(uuid, text, boolean) from public;
grant execute on function public.send_campaign(uuid, text, boolean) to authenticated;

-- Reads the email service's replies and updates sent / failed counts.
create or replace function public.refresh_campaign(p_id uuid) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare b record; r record; c public.campaigns;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Only the shop owner can do this.'; end if;
  for b in select * from public.campaign_batches where campaign_id = p_id and status = 'queued' loop
    select status_code, content, error_msg into r from net._http_response where id = b.request_id;
    if found then
      update public.campaign_batches set
        status = case when r.status_code between 200 and 299 then 'sent' else 'failed' end,
        error = case when r.status_code between 200 and 299 then null else left(coalesce(r.error_msg, r.content::text, 'Unknown error'), 300) end
      where id = b.id;
    elsif b.created_at < now() - interval '15 minutes' then
      update public.campaign_batches set status = 'failed', error = 'No reply from the email service' where id = b.id;
    end if;
  end loop;
  update public.campaigns set
    sent_count = coalesce((select sum(recipients) from public.campaign_batches where campaign_id = p_id and status = 'sent'), 0),
    failed_count = coalesce((select sum(recipients) from public.campaign_batches where campaign_id = p_id and status = 'failed'), 0),
    status = case
      when exists (select 1 from public.campaign_batches where campaign_id = p_id and status = 'queued') then 'sending'
      when exists (select 1 from public.campaign_batches where campaign_id = p_id and status = 'sent') then 'sent'
      else 'failed' end
  where id = p_id and status = 'sending';
  select * into c from public.campaigns where id = p_id;
  return jsonb_build_object('status', c.status, 'sent', c.sent_count, 'failed', c.failed_count, 'recipients', c.recipients,
    'error', (select error from public.campaign_batches where campaign_id = p_id and status = 'failed' order by id limit 1));
end $$;
revoke all on function public.refresh_campaign(uuid) from public;
grant execute on function public.refresh_campaign(uuid) to authenticated;