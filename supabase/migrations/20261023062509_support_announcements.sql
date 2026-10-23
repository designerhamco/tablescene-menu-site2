-- Additive only. Production application requires a separate approval.
begin;

create table public.support_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 20000),
  category text not null default 'service' check (category in ('service', 'update', 'maintenance')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  pinned boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_announcements_have_date check (status <> 'published' or published_at is not null)
);

create index support_announcements_public_order_idx
  on public.support_announcements (pinned desc, published_at desc, id desc)
  where status = 'published';

create function public.touch_support_announcement() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := old.created_at;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.touch_support_announcement() from public, anon, authenticated;
create trigger touch_support_announcement before update on public.support_announcements
  for each row execute function public.touch_support_announcement();

alter table public.support_announcements enable row level security;
alter table public.support_announcements force row level security;
revoke all on public.support_announcements from public, anon, authenticated;
grant select on public.support_announcements to anon, authenticated;
grant insert, update on public.support_announcements to authenticated;
grant all on public.support_announcements to service_role;

create policy announcements_public_read on public.support_announcements
  for select to anon, authenticated
  using (status = 'published' and published_at <= now());

create policy announcements_admin_read on public.support_announcements
  for select to authenticated
  using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

create policy announcements_admin_insert on public.support_announcements
  for insert to authenticated
  with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

create policy announcements_admin_update on public.support_announcements
  for update to authenticated
  using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

commit;
