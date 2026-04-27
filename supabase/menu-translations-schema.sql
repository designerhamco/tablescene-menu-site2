create extension if not exists "pgcrypto";

grant usage on schema public to anon, authenticated;

create table if not exists public.menu_site_translations (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  locale text not null check (locale in ('ko', 'en', 'zh', 'ja')),
  restaurant_name text,
  restaurant_category text,
  brand_description text,
  intro_title text,
  intro_description text,
  menu_cover_title text,
  menu_cover_description text,
  about_description text,
  opening_hours text,
  restaurant_address text,
  restaurant_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(menu_site_id, locale)
);

create table if not exists public.menu_category_translations (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  locale text not null check (locale in ('ko', 'en', 'zh', 'ja')),
  name text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id, locale)
);

create table if not exists public.menu_item_translations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items(id) on delete cascade,
  locale text not null check (locale in ('ko', 'en', 'zh', 'ja')),
  name text,
  description text,
  price_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(item_id, locale)
);

create table if not exists public.menu_chef_translations (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.menu_chefs(id) on delete cascade,
  locale text not null check (locale in ('ko', 'en', 'zh', 'ja')),
  chef_name text,
  chef_role text,
  chef_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(chef_id, locale)
);

create table if not exists public.menu_event_translations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.menu_events(id) on delete cascade,
  locale text not null check (locale in ('ko', 'en', 'zh', 'ja')),
  event_title text,
  event_subtitle text,
  event_description text,
  event_period text,
  event_benefit text,
  event_detail text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, locale)
);

create table if not exists public.menu_social_link_translations (
  id uuid primary key default gen_random_uuid(),
  social_link_id uuid not null references public.menu_social_links(id) on delete cascade,
  locale text not null check (locale in ('ko', 'en', 'zh', 'ja')),
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(social_link_id, locale)
);

create index if not exists menu_site_translations_site_locale_idx on public.menu_site_translations(menu_site_id, locale);
create index if not exists menu_category_translations_category_locale_idx on public.menu_category_translations(category_id, locale);
create index if not exists menu_item_translations_item_locale_idx on public.menu_item_translations(item_id, locale);
create index if not exists menu_chef_translations_chef_locale_idx on public.menu_chef_translations(chef_id, locale);
create index if not exists menu_event_translations_event_locale_idx on public.menu_event_translations(event_id, locale);
create index if not exists menu_social_link_translations_link_locale_idx on public.menu_social_link_translations(social_link_id, locale);

revoke all privileges on public.menu_site_translations, public.menu_category_translations, public.menu_item_translations, public.menu_chef_translations, public.menu_event_translations, public.menu_social_link_translations from anon, authenticated;

grant select on public.menu_site_translations, public.menu_category_translations, public.menu_item_translations, public.menu_chef_translations, public.menu_event_translations, public.menu_social_link_translations to anon;
grant select, insert, update, delete on public.menu_site_translations, public.menu_category_translations, public.menu_item_translations, public.menu_chef_translations, public.menu_event_translations, public.menu_social_link_translations to authenticated;

alter table public.menu_site_translations enable row level security;
alter table public.menu_category_translations enable row level security;
alter table public.menu_item_translations enable row level security;
alter table public.menu_chef_translations enable row level security;
alter table public.menu_event_translations enable row level security;
alter table public.menu_social_link_translations enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_menu_site_translations_updated_at') then
    create trigger set_menu_site_translations_updated_at before update on public.menu_site_translations
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_menu_category_translations_updated_at') then
    create trigger set_menu_category_translations_updated_at before update on public.menu_category_translations
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_menu_item_translations_updated_at') then
    create trigger set_menu_item_translations_updated_at before update on public.menu_item_translations
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_menu_chef_translations_updated_at') then
    create trigger set_menu_chef_translations_updated_at before update on public.menu_chef_translations
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_menu_event_translations_updated_at') then
    create trigger set_menu_event_translations_updated_at before update on public.menu_event_translations
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_menu_social_link_translations_updated_at') then
    create trigger set_menu_social_link_translations_updated_at before update on public.menu_social_link_translations
    for each row execute function public.set_updated_at();
  end if;
end $$;

drop policy if exists "menu_site_translations owner all" on public.menu_site_translations;
create policy "menu_site_translations owner all"
on public.menu_site_translations for all to authenticated
using (
  exists (
    select 1 from public.menu_sites
    where id = menu_site_translations.menu_site_id
      and user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.menu_sites
    where id = menu_site_translations.menu_site_id
      and user_id = auth.uid()
  )
);

drop policy if exists "menu_site_translations public select" on public.menu_site_translations;
create policy "menu_site_translations public select"
on public.menu_site_translations for select to anon, authenticated
using (
  exists (
    select 1 from public.menu_sites
    where id = menu_site_translations.menu_site_id
      and status = 'published'
  )
);

drop policy if exists "menu_site_translations admin select" on public.menu_site_translations;
create policy "menu_site_translations admin select"
on public.menu_site_translations for select to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "menu_category_translations owner all" on public.menu_category_translations;
create policy "menu_category_translations owner all"
on public.menu_category_translations for all to authenticated
using (
  exists (
    select 1
    from public.menu_categories
    join public.menu_sites on menu_sites.id = menu_categories.menu_site_id
    where menu_categories.id = menu_category_translations.category_id
      and menu_sites.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.menu_categories
    join public.menu_sites on menu_sites.id = menu_categories.menu_site_id
    where menu_categories.id = menu_category_translations.category_id
      and menu_sites.user_id = auth.uid()
  )
);

drop policy if exists "menu_category_translations public select" on public.menu_category_translations;
create policy "menu_category_translations public select"
on public.menu_category_translations for select to anon, authenticated
using (
  exists (
    select 1
    from public.menu_categories
    join public.menu_sites on menu_sites.id = menu_categories.menu_site_id
    where menu_categories.id = menu_category_translations.category_id
      and menu_categories.visible = true
      and menu_sites.status = 'published'
  )
);

drop policy if exists "menu_category_translations admin select" on public.menu_category_translations;
create policy "menu_category_translations admin select"
on public.menu_category_translations for select to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "menu_item_translations owner all" on public.menu_item_translations;
create policy "menu_item_translations owner all"
on public.menu_item_translations for all to authenticated
using (
  exists (
    select 1
    from public.menu_items
    join public.menu_sites on menu_sites.id = menu_items.menu_site_id
    where menu_items.id = menu_item_translations.item_id
      and menu_sites.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.menu_items
    join public.menu_sites on menu_sites.id = menu_items.menu_site_id
    where menu_items.id = menu_item_translations.item_id
      and menu_sites.user_id = auth.uid()
  )
);

drop policy if exists "menu_item_translations public select" on public.menu_item_translations;
create policy "menu_item_translations public select"
on public.menu_item_translations for select to anon, authenticated
using (
  exists (
    select 1
    from public.menu_items
    join public.menu_sites on menu_sites.id = menu_items.menu_site_id
    where menu_items.id = menu_item_translations.item_id
      and menu_items.visible = true
      and menu_sites.status = 'published'
  )
);

drop policy if exists "menu_item_translations admin select" on public.menu_item_translations;
create policy "menu_item_translations admin select"
on public.menu_item_translations for select to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "menu_chef_translations owner all" on public.menu_chef_translations;
create policy "menu_chef_translations owner all"
on public.menu_chef_translations for all to authenticated
using (
  exists (
    select 1
    from public.menu_chefs
    join public.menu_sites on menu_sites.id = menu_chefs.menu_site_id
    where menu_chefs.id = menu_chef_translations.chef_id
      and menu_sites.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.menu_chefs
    join public.menu_sites on menu_sites.id = menu_chefs.menu_site_id
    where menu_chefs.id = menu_chef_translations.chef_id
      and menu_sites.user_id = auth.uid()
  )
);

drop policy if exists "menu_chef_translations public select" on public.menu_chef_translations;
create policy "menu_chef_translations public select"
on public.menu_chef_translations for select to anon, authenticated
using (
  exists (
    select 1
    from public.menu_chefs
    join public.menu_sites on menu_sites.id = menu_chefs.menu_site_id
    where menu_chefs.id = menu_chef_translations.chef_id
      and menu_chefs.visible = true
      and menu_sites.status = 'published'
  )
);

drop policy if exists "menu_chef_translations admin select" on public.menu_chef_translations;
create policy "menu_chef_translations admin select"
on public.menu_chef_translations for select to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "menu_event_translations owner all" on public.menu_event_translations;
create policy "menu_event_translations owner all"
on public.menu_event_translations for all to authenticated
using (
  exists (
    select 1
    from public.menu_events
    join public.menu_sites on menu_sites.id = menu_events.menu_site_id
    where menu_events.id = menu_event_translations.event_id
      and menu_sites.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.menu_events
    join public.menu_sites on menu_sites.id = menu_events.menu_site_id
    where menu_events.id = menu_event_translations.event_id
      and menu_sites.user_id = auth.uid()
  )
);

drop policy if exists "menu_event_translations public select" on public.menu_event_translations;
create policy "menu_event_translations public select"
on public.menu_event_translations for select to anon, authenticated
using (
  exists (
    select 1
    from public.menu_events
    join public.menu_sites on menu_sites.id = menu_events.menu_site_id
    where menu_events.id = menu_event_translations.event_id
      and menu_events.visible = true
      and menu_sites.status = 'published'
  )
);

drop policy if exists "menu_event_translations admin select" on public.menu_event_translations;
create policy "menu_event_translations admin select"
on public.menu_event_translations for select to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));

drop policy if exists "menu_social_link_translations owner all" on public.menu_social_link_translations;
create policy "menu_social_link_translations owner all"
on public.menu_social_link_translations for all to authenticated
using (
  exists (
    select 1
    from public.menu_social_links
    join public.menu_sites on menu_sites.id = menu_social_links.menu_site_id
    where menu_social_links.id = menu_social_link_translations.social_link_id
      and menu_sites.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.menu_social_links
    join public.menu_sites on menu_sites.id = menu_social_links.menu_site_id
    where menu_social_links.id = menu_social_link_translations.social_link_id
      and menu_sites.user_id = auth.uid()
  )
);

drop policy if exists "menu_social_link_translations public select" on public.menu_social_link_translations;
create policy "menu_social_link_translations public select"
on public.menu_social_link_translations for select to anon, authenticated
using (
  exists (
    select 1
    from public.menu_social_links
    join public.menu_sites on menu_sites.id = menu_social_links.menu_site_id
    where menu_social_links.id = menu_social_link_translations.social_link_id
      and menu_social_links.visible = true
      and menu_sites.status = 'published'
  )
);

drop policy if exists "menu_social_link_translations admin select" on public.menu_social_link_translations;
create policy "menu_social_link_translations admin select"
on public.menu_social_link_translations for select to authenticated
using (exists (select 1 from public.admin_users where user_id = auth.uid()));
