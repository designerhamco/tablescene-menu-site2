alter table public.inquiries
  add column if not exists category text not null default 'general';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inquiries'::regclass
      and conname = 'inquiries_category_check'
  ) then
    alter table public.inquiries
      add constraint inquiries_category_check
      check (
        category in (
          'general',
          'billing',
          'menu_management',
          'business_verification',
          'bug',
          'ai_credit',
          'other'
        )
      );
  end if;
end $$;

notify pgrst, 'reload schema';
