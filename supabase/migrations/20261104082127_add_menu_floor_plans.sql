-- Internal operation layouts only. Existing tables, tokens, orders and customer menus are untouched.
begin;
create table public.menu_floor_plans (
  menu_site_id uuid primary key references public.menu_sites(id) on delete cascade,
  revision integer not null default 1 check (revision >= 1),
  document jsonb not null default '{"rooms":[],"placements":[]}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint menu_floor_plans_document_check check (
    jsonb_typeof(document) = 'object'
    and document ?& array['rooms','placements']
    and jsonb_typeof(document->'rooms') = 'array'
    and jsonb_typeof(document->'placements') = 'array'
    and jsonb_array_length(document->'rooms') <= 30
    and jsonb_array_length(document->'placements') <= 200
    and octet_length(document::text) <= 131072
  )
);
create index menu_floor_plans_updated_by_idx on public.menu_floor_plans(updated_by) where updated_by is not null;
alter table public.menu_floor_plans enable row level security;
revoke all on public.menu_floor_plans from public, anon, authenticated;
grant select, insert, update, delete on public.menu_floor_plans to service_role;
create policy menu_floor_plans_service_only on public.menu_floor_plans
  for all to service_role using (true) with check (true);
comment on table public.menu_floor_plans is 'Internal room/point geometry. Server authorizes table.manage plus lifecycle/runtime; revision is a compare-and-swap lock. No browser or public-menu access.';
notify pgrst, 'reload schema';
commit;
