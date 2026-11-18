create or replace function public.is_shop_media(_bucket text, _path text)
returns boolean language sql stable security definer set search_path = public as $$
  select case _bucket
    when 'product-photos' then exists (
      select 1 from public.products pr join public.departments d on d.id = pr.department
      where pr.is_active and d.enabled and (pr.image_path = _path or _path = any (pr.gallery)))
    when 'product-videos' then exists (select 1 from public.shop_settings s where s.id = 1 and s.video = _path)
    else false end
$$;
grant execute on function public.is_shop_media(text, text) to anon, authenticated;

create policy "Shoppers view shop media" on storage.objects for select to anon, authenticated
  using (bucket_id in ('product-photos', 'product-videos') and public.is_shop_media(bucket_id, name));

create or replace function public.get_shop_video()
returns text language sql stable security definer set search_path = public as $$
  select video from public.shop_settings where id = 1
$$;
grant execute on function public.get_shop_video() to anon, authenticated;

create or replace function public.place_order(
  p_customer_name text, p_phone text, p_email text, p_address text, p_notes text, p_lines jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l jsonb; p record; q int; s text; n int;
  items jsonb := '[]'::jsonb; t numeric := 0;
begin
  if length(trim(coalesce(p_customer_name, ''))) not between 2 and 100 then raise exception 'Please enter your name'; end if;
  if length(trim(coalesce(p_phone, ''))) not between 7 and 20 then raise exception 'Please enter a phone number'; end if;
  if length(trim(coalesce(p_address, ''))) not between 5 and 500 then raise exception 'Please enter a delivery address'; end if;
  if length(coalesce(p_email, '')) > 255 or length(coalesce(p_notes, '')) > 500 then raise exception 'Please check your details'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'Your bag is empty.'; end if;
  if jsonb_array_length(p_lines) > 50 then raise exception 'Too many items in your bag.'; end if;

  for l in select value from jsonb_array_elements(p_lines) loop
    select pr.id, pr.name, pr.price, pr.sizes into p
      from public.products pr join public.departments d on d.id = pr.department
      where pr.id::text = l->>'productId' and pr.is_active and d.enabled;
    if not found then raise exception 'One of the items in your bag is no longer available.'; end if;
    q := (l->>'qty')::int;
    if q is null or q < 1 or q > 20 then raise exception 'Invalid quantity.'; end if;
    s := nullif(l->>'size', '');
    if cardinality(p.sizes) > 0 then
      if s is null then raise exception 'Please choose a size for %.', p.name; end if;
      if not (s = any (p.sizes)) then raise exception 'Size % of % is sold out.', s, p.name; end if;
    else
      s := null;
    end if;
    items := items || jsonb_strip_nulls(jsonb_build_object('productId', p.id, 'name', p.name, 'price', p.price, 'qty', q, 'size', s));
    t := t + p.price * q;
  end loop;

  insert into public.orders (customer_name, phone, email, address, notes, items, total)
  values (trim(p_customer_name), trim(p_phone), nullif(trim(coalesce(p_email, '')), ''), trim(p_address),
          nullif(trim(coalesce(p_notes, '')), ''), items, t)
  returning order_number into n;
  return jsonb_build_object('orderNumber', n, 'total', t);
end
$$;
revoke all on function public.place_order(text, text, text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, text, text, jsonb) to anon, authenticated;

update public.products
set image_path = regexp_replace(image_url, '^/__l5e/assets-v1/[^/]+/', 'real/'),
    image_url = null
where image_url like '/__l5e/assets-v1/%' and image_path is null;

update public.products
set gallery = array(select regexp_replace(g, '^/__l5e/assets-v1/[^/]+/', 'real/') from unnest(gallery) as g)
where exists (select 1 from unnest(gallery) as g where g like '/__l5e/assets-v1/%');