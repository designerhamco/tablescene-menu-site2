-- Menu schema compatibility patch for columns already used by the app.
-- Run manually in Supabase SQL Editor after review.
--
-- Safety notes:
-- - No existing data is deleted.
-- - No existing table or column is dropped.
-- - All columns are nullable for backward compatibility.
-- - Existing legacy columns such as restaurant_category, badge_type, and recommended are kept.

alter table public.menu_sites
  add column if not exists restaurant_type text;

alter table public.menu_sites
  add column if not exists menu_cover_label text;

alter table public.menu_items
  add column if not exists badge_label text;

update public.menu_sites
set menu_cover_label = restaurant_category
where menu_cover_label is null
  and restaurant_category is not null;
