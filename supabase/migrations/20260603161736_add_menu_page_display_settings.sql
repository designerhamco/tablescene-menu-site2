alter table public.menu_pages
add column if not exists display_settings jsonb not null default '{}'::jsonb;
