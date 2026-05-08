-- Adds template category metadata for menu sites.
-- Safe to run in Supabase SQL Editor after reviewing.

alter table public.menu_sites add column if not exists template_category text;
