-- Display badge labels for menu items.
-- Run this manually in Supabase SQL Editor after review.
--
-- Safety notes:
-- - No existing data is deleted.
-- - Existing menu_items.recommended and menu_items.badge_type are kept for compatibility.

alter table public.menu_items
add column if not exists badge_label text;
