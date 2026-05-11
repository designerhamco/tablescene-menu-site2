-- Separate internal restaurant type from public menu cover label.
-- Run this manually in Supabase SQL Editor after review.
--
-- Safety notes:
-- - No existing data is deleted.
-- - Existing menu_sites.restaurant_category is kept as a legacy fallback.
-- - This migration only adds nullable columns and backfills empty menu_cover_label values.

alter table public.menu_sites
  add column if not exists restaurant_type text;

alter table public.menu_sites
  add column if not exists menu_cover_label text;

update public.menu_sites
set menu_cover_label = restaurant_category
where menu_cover_label is null
  and restaurant_category is not null;
