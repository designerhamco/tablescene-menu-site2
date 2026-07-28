begin;

create table if not exists public.menu_widget_translations (
  id uuid primary key default gen_random_uuid(),
  menu_widget_id uuid not null references public.menu_widgets(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  title text,
  description text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(menu_widget_id, locale)
);

grant select on table public.menu_widget_translations to anon;
grant select, insert, update, delete on table public.menu_widget_translations to authenticated;
grant select, delete on table public.menu_widget_translations to service_role;

alter table public.menu_widget_translations enable row level security;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) then
    if not exists (select 1 from pg_trigger where tgname = 'set_menu_widget_translations_updated_at') then
      create trigger set_menu_widget_translations_updated_at before update on public.menu_widget_translations
      for each row execute function public.set_updated_at();
    end if;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_widget_translations' and policyname = 'menu_widget_translations owner all') then
    create policy "menu_widget_translations owner all"
    on public.menu_widget_translations for all to authenticated
    using (
      exists (
        select 1
        from public.menu_widgets
        join public.menu_sites on menu_sites.id = menu_widgets.menu_site_id
        where menu_widgets.id = menu_widget_translations.menu_widget_id
          and menu_sites.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.menu_widgets
        join public.menu_sites on menu_sites.id = menu_widgets.menu_site_id
        where menu_widgets.id = menu_widget_translations.menu_widget_id
          and menu_sites.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_widget_translations' and policyname = 'menu_widget_translations public select') then
    create policy "menu_widget_translations public select"
    on public.menu_widget_translations for select to anon, authenticated
    using (
      exists (
        select 1
        from public.menu_widgets
        join public.menu_sites on menu_sites.id = menu_widgets.menu_site_id
        join public.menu_pages on menu_pages.id = menu_widgets.menu_page_id
        where menu_widgets.id = menu_widget_translations.menu_widget_id
          and menu_widgets.visible = true
          and menu_pages.visible = true
          and menu_sites.status = 'published'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_widget_translations' and policyname = 'menu_widget_translations admin select') then
    create policy "menu_widget_translations admin select"
    on public.menu_widget_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;
end
$$;

commit;
