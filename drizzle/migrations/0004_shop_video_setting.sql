create table public.shop_settings (
  id smallint primary key default 1 check (id = 1),
  video text,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.shop_settings to authenticated;
grant all on public.shop_settings to service_role;
alter table public.shop_settings enable row level security;
create policy "Admins read shop settings" on public.shop_settings for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins add shop settings" on public.shop_settings for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins change shop settings" on public.shop_settings for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

insert into public.shop_settings (id, video)
values (1, (select video from public.products where video is not null order by updated_at desc limit 1));

delete from public.products where name = 'test video' and image_path is null and image_url is null;

update public.products set video = null where video is not null;
comment on column public.products.video is 'DEPRECATED: the shop video lives in shop_settings.video';