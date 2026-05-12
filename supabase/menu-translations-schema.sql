create extension if not exists "pgcrypto";

grant usage on schema public to anon, authenticated;

create table if not exists public.menu_site_translations (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  restaurant_name text,
  restaurant_category text,
  description text,
  brand_description text,
  intro_title text,
  intro_description text,
  menu_cover_title text,
  menu_cover_description text,
  menu_cover_label text,
  about_description text,
  opening_hours text,
  restaurant_address text,
  restaurant_phone text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(menu_site_id, locale)
);

create table if not exists public.menu_page_translations (
  id uuid primary key default gen_random_uuid(),
  menu_page_id uuid not null references public.menu_pages(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  title text,
  description text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(menu_page_id, locale)
);

create table if not exists public.menu_category_translations (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  name text,
  description text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id, locale)
);

create table if not exists public.menu_item_translations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  name text,
  set_name text,
  description text,
  price_label text,
  portion_label text,
  badge_label text,
  origin_info text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(item_id, locale)
);

create table if not exists public.menu_item_price_option_translations (
  id uuid primary key default gen_random_uuid(),
  price_option_id uuid not null references public.menu_item_price_options(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  label text,
  price_label text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(price_option_id, locale)
);

create table if not exists public.menu_item_trait_translations (
  id uuid primary key default gen_random_uuid(),
  trait_id uuid not null references public.menu_item_traits(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  label text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trait_id, locale)
);

create table if not exists public.menu_chef_translations (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.menu_chefs(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  chef_name text,
  chef_role text,
  chef_description text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(chef_id, locale)
);

create table if not exists public.menu_event_translations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.menu_events(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  event_title text,
  event_subtitle text,
  event_description text,
  event_period text,
  event_benefit text,
  event_detail text,
  event_regular_price_label text,
  event_sale_price_label text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, locale)
);

create table if not exists public.menu_social_link_translations (
  id uuid primary key default gen_random_uuid(),
  social_link_id uuid not null references public.menu_social_links(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  label text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(social_link_id, locale)
);

create table if not exists public.menu_translation_jobs (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  target_locales text[] not null default array['en', 'zh', 'ja']::text[],
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_site_translations
  add column if not exists description text,
  add column if not exists menu_cover_label text,
  add column if not exists source_text_hash text,
  add column if not exists status text not null default 'completed';

alter table public.menu_category_translations
  add column if not exists source_text_hash text,
  add column if not exists status text not null default 'completed';

alter table public.menu_item_translations
  add column if not exists set_name text,
  add column if not exists portion_label text,
  add column if not exists badge_label text,
  add column if not exists origin_info text,
  add column if not exists source_text_hash text,
  add column if not exists status text not null default 'completed';

alter table public.menu_event_translations
  add column if not exists event_regular_price_label text,
  add column if not exists event_sale_price_label text,
  add column if not exists source_text_hash text,
  add column if not exists status text not null default 'completed';

alter table public.menu_chef_translations
  add column if not exists source_text_hash text,
  add column if not exists status text not null default 'completed';

alter table public.menu_social_link_translations
  add column if not exists source_text_hash text,
  add column if not exists status text not null default 'completed';

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'menu_site_translations',
    'menu_page_translations',
    'menu_category_translations',
    'menu_item_translations',
    'menu_item_price_option_translations',
    'menu_item_trait_translations',
    'menu_chef_translations',
    'menu_event_translations',
    'menu_social_link_translations'
  ]
  loop
    if not exists (
      select 1
      from pg_constraint
      where conname = table_name || '_locale_supported_chk'
        and conrelid = ('public.' || table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (locale in (''en'', ''zh'', ''ja'')) not valid',
        table_name,
        table_name || '_locale_supported_chk'
      );
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = table_name || '_status_chk'
        and conrelid = ('public.' || table_name)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (status in (''pending'', ''completed'', ''failed'')) not valid',
        table_name,
        table_name || '_status_chk'
      );
    end if;
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_translation_jobs_target_locales_supported_chk'
      and conrelid = 'public.menu_translation_jobs'::regclass
  ) then
    alter table public.menu_translation_jobs
      add constraint menu_translation_jobs_target_locales_supported_chk
      check (target_locales <@ array['en', 'zh', 'ja']::text[]) not valid;
  end if;
end $$;

create index if not exists menu_site_translations_site_locale_idx on public.menu_site_translations(menu_site_id, locale);
create index if not exists menu_page_translations_page_locale_idx on public.menu_page_translations(menu_page_id, locale);
create index if not exists menu_category_translations_category_locale_idx on public.menu_category_translations(category_id, locale);
create index if not exists menu_item_translations_item_locale_idx on public.menu_item_translations(item_id, locale);
create index if not exists menu_item_price_option_translations_option_locale_idx on public.menu_item_price_option_translations(price_option_id, locale);
create index if not exists menu_item_trait_translations_trait_locale_idx on public.menu_item_trait_translations(trait_id, locale);
create index if not exists menu_chef_translations_chef_locale_idx on public.menu_chef_translations(chef_id, locale);
create index if not exists menu_event_translations_event_locale_idx on public.menu_event_translations(event_id, locale);
create index if not exists menu_social_link_translations_link_locale_idx on public.menu_social_link_translations(social_link_id, locale);
create index if not exists menu_translation_jobs_site_created_idx on public.menu_translation_jobs(menu_site_id, created_at desc);
create index if not exists menu_translation_jobs_requested_by_created_idx on public.menu_translation_jobs(requested_by, created_at desc);

grant select on
  public.menu_site_translations,
  public.menu_page_translations,
  public.menu_category_translations,
  public.menu_item_translations,
  public.menu_item_price_option_translations,
  public.menu_item_trait_translations,
  public.menu_chef_translations,
  public.menu_event_translations,
  public.menu_social_link_translations
to anon;

grant select, insert, update, delete on
  public.menu_site_translations,
  public.menu_page_translations,
  public.menu_category_translations,
  public.menu_item_translations,
  public.menu_item_price_option_translations,
  public.menu_item_trait_translations,
  public.menu_chef_translations,
  public.menu_event_translations,
  public.menu_social_link_translations,
  public.menu_translation_jobs
to authenticated;

alter table public.menu_site_translations enable row level security;
alter table public.menu_page_translations enable row level security;
alter table public.menu_category_translations enable row level security;
alter table public.menu_item_translations enable row level security;
alter table public.menu_item_price_option_translations enable row level security;
alter table public.menu_item_trait_translations enable row level security;
alter table public.menu_chef_translations enable row level security;
alter table public.menu_event_translations enable row level security;
alter table public.menu_social_link_translations enable row level security;
alter table public.menu_translation_jobs enable row level security;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) then
    if not exists (select 1 from pg_trigger where tgname = 'set_menu_site_translations_updated_at') then
      create trigger set_menu_site_translations_updated_at before update on public.menu_site_translations
      for each row execute function public.set_updated_at();
    end if;

    if not exists (select 1 from pg_trigger where tgname = 'set_menu_page_translations_updated_at') then
      create trigger set_menu_page_translations_updated_at before update on public.menu_page_translations
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

    if not exists (select 1 from pg_trigger where tgname = 'set_menu_item_price_option_translations_updated_at') then
      create trigger set_menu_item_price_option_translations_updated_at before update on public.menu_item_price_option_translations
      for each row execute function public.set_updated_at();
    end if;

    if not exists (select 1 from pg_trigger where tgname = 'set_menu_item_trait_translations_updated_at') then
      create trigger set_menu_item_trait_translations_updated_at before update on public.menu_item_trait_translations
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

    if not exists (select 1 from pg_trigger where tgname = 'set_menu_translation_jobs_updated_at') then
      create trigger set_menu_translation_jobs_updated_at before update on public.menu_translation_jobs
      for each row execute function public.set_updated_at();
    end if;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_site_translations' and policyname = 'menu_site_translations owner all') then
    create policy "menu_site_translations owner all"
    on public.menu_site_translations for all to authenticated
    using (exists (select 1 from public.menu_sites where id = menu_site_translations.menu_site_id and user_id = auth.uid()))
    with check (exists (select 1 from public.menu_sites where id = menu_site_translations.menu_site_id and user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_site_translations' and policyname = 'menu_site_translations public select') then
    create policy "menu_site_translations public select"
    on public.menu_site_translations for select to anon, authenticated
    using (exists (select 1 from public.menu_sites where id = menu_site_translations.menu_site_id and status = 'published'));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_site_translations' and policyname = 'menu_site_translations admin select') then
    create policy "menu_site_translations admin select"
    on public.menu_site_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_page_translations' and policyname = 'menu_page_translations owner all') then
    create policy "menu_page_translations owner all"
    on public.menu_page_translations for all to authenticated
    using (
      exists (
        select 1
        from public.menu_pages
        join public.menu_sites on menu_sites.id = menu_pages.menu_site_id
        where menu_pages.id = menu_page_translations.menu_page_id
          and menu_sites.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.menu_pages
        join public.menu_sites on menu_sites.id = menu_pages.menu_site_id
        where menu_pages.id = menu_page_translations.menu_page_id
          and menu_sites.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_page_translations' and policyname = 'menu_page_translations public select') then
    create policy "menu_page_translations public select"
    on public.menu_page_translations for select to anon, authenticated
    using (
      exists (
        select 1
        from public.menu_pages
        join public.menu_sites on menu_sites.id = menu_pages.menu_site_id
        where menu_pages.id = menu_page_translations.menu_page_id
          and menu_pages.visible = true
          and menu_sites.status = 'published'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_page_translations' and policyname = 'menu_page_translations admin select') then
    create policy "menu_page_translations admin select"
    on public.menu_page_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_category_translations' and policyname = 'menu_category_translations owner all') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_category_translations' and policyname = 'menu_category_translations public select') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_category_translations' and policyname = 'menu_category_translations admin select') then
    create policy "menu_category_translations admin select"
    on public.menu_category_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_item_translations' and policyname = 'menu_item_translations owner all') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_item_translations' and policyname = 'menu_item_translations public select') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_item_translations' and policyname = 'menu_item_translations admin select') then
    create policy "menu_item_translations admin select"
    on public.menu_item_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_item_price_option_translations' and policyname = 'menu_item_price_option_translations owner all') then
    create policy "menu_item_price_option_translations owner all"
    on public.menu_item_price_option_translations for all to authenticated
    using (
      exists (
        select 1
        from public.menu_item_price_options
        join public.menu_sites on menu_sites.id = menu_item_price_options.menu_site_id
        where menu_item_price_options.id = menu_item_price_option_translations.price_option_id
          and menu_sites.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.menu_item_price_options
        join public.menu_sites on menu_sites.id = menu_item_price_options.menu_site_id
        where menu_item_price_options.id = menu_item_price_option_translations.price_option_id
          and menu_sites.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_item_price_option_translations' and policyname = 'menu_item_price_option_translations public select') then
    create policy "menu_item_price_option_translations public select"
    on public.menu_item_price_option_translations for select to anon, authenticated
    using (
      exists (
        select 1
        from public.menu_item_price_options
        join public.menu_items on menu_items.id = menu_item_price_options.menu_item_id
        join public.menu_sites on menu_sites.id = menu_item_price_options.menu_site_id
        where menu_item_price_options.id = menu_item_price_option_translations.price_option_id
          and menu_item_price_options.visible = true
          and menu_items.visible = true
          and menu_sites.status = 'published'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_item_price_option_translations' and policyname = 'menu_item_price_option_translations admin select') then
    create policy "menu_item_price_option_translations admin select"
    on public.menu_item_price_option_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_item_trait_translations' and policyname = 'menu_item_trait_translations owner all') then
    create policy "menu_item_trait_translations owner all"
    on public.menu_item_trait_translations for all to authenticated
    using (
      exists (
        select 1
        from public.menu_item_traits
        join public.menu_sites on menu_sites.id = menu_item_traits.menu_site_id
        where menu_item_traits.id = menu_item_trait_translations.trait_id
          and menu_sites.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.menu_item_traits
        join public.menu_sites on menu_sites.id = menu_item_traits.menu_site_id
        where menu_item_traits.id = menu_item_trait_translations.trait_id
          and menu_sites.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_item_trait_translations' and policyname = 'menu_item_trait_translations public select') then
    create policy "menu_item_trait_translations public select"
    on public.menu_item_trait_translations for select to anon, authenticated
    using (
      exists (
        select 1
        from public.menu_item_traits
        join public.menu_items on menu_items.id = menu_item_traits.menu_item_id
        join public.menu_sites on menu_sites.id = menu_item_traits.menu_site_id
        where menu_item_traits.id = menu_item_trait_translations.trait_id
          and menu_item_traits.visible = true
          and menu_items.visible = true
          and menu_sites.status = 'published'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_item_trait_translations' and policyname = 'menu_item_trait_translations admin select') then
    create policy "menu_item_trait_translations admin select"
    on public.menu_item_trait_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_chef_translations' and policyname = 'menu_chef_translations owner all') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_chef_translations' and policyname = 'menu_chef_translations public select') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_chef_translations' and policyname = 'menu_chef_translations admin select') then
    create policy "menu_chef_translations admin select"
    on public.menu_chef_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_event_translations' and policyname = 'menu_event_translations owner all') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_event_translations' and policyname = 'menu_event_translations public select') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_event_translations' and policyname = 'menu_event_translations admin select') then
    create policy "menu_event_translations admin select"
    on public.menu_event_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_social_link_translations' and policyname = 'menu_social_link_translations owner all') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_social_link_translations' and policyname = 'menu_social_link_translations public select') then
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
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_social_link_translations' and policyname = 'menu_social_link_translations admin select') then
    create policy "menu_social_link_translations admin select"
    on public.menu_social_link_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_translation_jobs' and policyname = 'menu_translation_jobs owner all') then
    create policy "menu_translation_jobs owner all"
    on public.menu_translation_jobs for all to authenticated
    using (
      requested_by = auth.uid()
      and exists (
        select 1 from public.menu_sites
        where id = menu_translation_jobs.menu_site_id
          and user_id = auth.uid()
      )
    )
    with check (
      requested_by = auth.uid()
      and exists (
        select 1 from public.menu_sites
        where id = menu_translation_jobs.menu_site_id
          and user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_translation_jobs' and policyname = 'menu_translation_jobs admin select') then
    create policy "menu_translation_jobs admin select"
    on public.menu_translation_jobs for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;
end $$;
