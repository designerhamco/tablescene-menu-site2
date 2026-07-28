begin;

alter table public.menu_translation_jobs
  add column if not exists draft_payload jsonb,
  add column if not exists locale_results jsonb,
  add column if not exists applied_at timestamptz,
  add column if not exists discarded_at timestamptz,
  add column if not exists result_version integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_translation_jobs_result_version_positive_chk'
      and conrelid = 'public.menu_translation_jobs'::regclass
  ) then
    alter table public.menu_translation_jobs
      add constraint menu_translation_jobs_result_version_positive_chk
      check (result_version >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_translation_jobs_not_applied_and_discarded_chk'
      and conrelid = 'public.menu_translation_jobs'::regclass
  ) then
    alter table public.menu_translation_jobs
      add constraint menu_translation_jobs_not_applied_and_discarded_chk
      check (applied_at is null or discarded_at is null);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_translation_jobs_draft_payload_array_chk'
      and conrelid = 'public.menu_translation_jobs'::regclass
  ) then
    alter table public.menu_translation_jobs
      add constraint menu_translation_jobs_draft_payload_array_chk
      check (draft_payload is null or jsonb_typeof(draft_payload) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_translation_jobs_locale_results_array_chk'
      and conrelid = 'public.menu_translation_jobs'::regclass
  ) then
    alter table public.menu_translation_jobs
      add constraint menu_translation_jobs_locale_results_array_chk
      check (locale_results is null or jsonb_typeof(locale_results) = 'array');
  end if;
end $$;

create index if not exists menu_translation_jobs_unapplied_result_idx
on public.menu_translation_jobs(menu_site_id, requested_by, completed_at desc)
where status = 'completed'
  and applied_at is null
  and discarded_at is null
  and draft_payload is not null;

commit;
