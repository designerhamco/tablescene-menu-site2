begin;

create table if not exists public.menu_promotion_translations (
  id uuid primary key default gen_random_uuid(),
  menu_promotion_id uuid not null references public.menu_promotions(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh', 'ja')),
  badge_text text,
  time_display_text text,
  source_text_hash text,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(menu_promotion_id, locale)
);

revoke all on table public.menu_promotion_translations from public;
revoke all on table public.menu_promotion_translations from anon;

grant select, insert, update, delete on table public.menu_promotion_translations to authenticated;
grant select, delete on table public.menu_promotion_translations to service_role;

alter table public.menu_promotion_translations enable row level security;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) then
    if not exists (select 1 from pg_trigger where tgname = 'set_menu_promotion_translations_updated_at') then
      create trigger set_menu_promotion_translations_updated_at before update on public.menu_promotion_translations
      for each row execute function public.set_updated_at();
    end if;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_promotion_translations' and policyname = 'menu_promotion_translations owner all') then
    create policy "menu_promotion_translations owner all"
    on public.menu_promotion_translations for all to authenticated
    using (
      exists (
        select 1
        from public.menu_promotions
        join public.menu_sites on menu_sites.id = menu_promotions.menu_site_id
        where menu_promotions.id = menu_promotion_translations.menu_promotion_id
          and menu_sites.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from public.menu_promotions
        join public.menu_sites on menu_sites.id = menu_promotions.menu_site_id
        where menu_promotions.id = menu_promotion_translations.menu_promotion_id
          and menu_sites.user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'menu_promotion_translations' and policyname = 'menu_promotion_translations admin select') then
    create policy "menu_promotion_translations admin select"
    on public.menu_promotion_translations for select to authenticated
    using (exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;
end
$$;

commit;
