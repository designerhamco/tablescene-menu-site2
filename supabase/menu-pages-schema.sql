create table if not exists public.menu_pages (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  title text not null,
  description text,
  description_visible boolean not null default true,
  legacy_section_key text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_pages
  add column if not exists description text,
  add column if not exists description_visible boolean not null default true,
  add column if not exists legacy_section_key text,
  add column if not exists visible boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.menu_categories
  add column if not exists menu_page_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_categories_menu_page_id_fkey'
      and conrelid = 'public.menu_categories'::regclass
  ) then
    alter table public.menu_categories
      add constraint menu_categories_menu_page_id_fkey
      foreign key (menu_page_id)
      references public.menu_pages(id)
      on delete set null;
  end if;
end;
$$;

update public.menu_categories category
set menu_page_id = page.id
from public.menu_pages page
where category.menu_page_id is null
  and page.menu_site_id = category.menu_site_id
  and page.legacy_section_key = category.section_key;

create index if not exists menu_pages_site_sort_idx
  on public.menu_pages(menu_site_id, sort_order);

create index if not exists menu_pages_site_visible_sort_idx
  on public.menu_pages(menu_site_id, visible, sort_order);

create index if not exists menu_pages_site_legacy_section_idx
  on public.menu_pages(menu_site_id, legacy_section_key);

create index if not exists menu_categories_site_page_sort_idx
  on public.menu_categories(menu_site_id, menu_page_id, sort_order);

alter table public.menu_pages enable row level security;

drop policy if exists "menu_pages owner select" on public.menu_pages;
create policy "menu_pages owner select"
  on public.menu_pages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_pages.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

drop policy if exists "menu_pages owner insert" on public.menu_pages;
create policy "menu_pages owner insert"
  on public.menu_pages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_pages.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

drop policy if exists "menu_pages owner update" on public.menu_pages;
create policy "menu_pages owner update"
  on public.menu_pages
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_pages.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_pages.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

drop policy if exists "menu_pages owner delete" on public.menu_pages;
create policy "menu_pages owner delete"
  on public.menu_pages
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_pages.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

drop policy if exists "menu_pages public visible select" on public.menu_pages;
create policy "menu_pages public visible select"
  on public.menu_pages
  for select
  to anon, authenticated
  using (
    visible = true
    and exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_pages.menu_site_id
        and menu_sites.status = 'published'
    )
  );

drop policy if exists "menu_pages admin select" on public.menu_pages;
create policy "menu_pages admin select"
  on public.menu_pages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

grant select on public.menu_pages to anon;
grant select, insert, update, delete on public.menu_pages to authenticated;

do $$
begin
  if not exists (
    select 1
    from information_schema.triggers
    where trigger_schema = 'public'
      and event_object_table = 'menu_pages'
      and trigger_name = 'set_menu_pages_updated_at'
  ) then
    create trigger set_menu_pages_updated_at
      before update on public.menu_pages
      for each row
      execute function public.set_updated_at();
  end if;
end;
$$;
