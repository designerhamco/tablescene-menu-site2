-- Grants required by scripts/hard-delete-expired-menu-sites.mjs.
--
-- This migration does not delete data and does not change RLS policies.
-- It only lets the server-side service role preflight and delete menu content
-- rows during the approved lifecycle hard-delete procedure.
--
-- Rollback candidate, if this access must be revoked later:
-- revoke select, delete on table public.<table_name> from service_role;

grant select, delete on table public.menu_site_translations to service_role;
grant select, delete on table public.menu_page_translations to service_role;
grant select, delete on table public.menu_category_translations to service_role;
grant select, delete on table public.menu_item_translations to service_role;
grant select, delete on table public.menu_item_price_option_translations to service_role;
grant select, delete on table public.menu_item_trait_translations to service_role;

grant select, delete on table public.menu_chefs to service_role;
grant select, delete on table public.menu_chef_translations to service_role;
grant select, delete on table public.menu_events to service_role;
grant select, delete on table public.menu_event_translations to service_role;
grant select, delete on table public.menu_social_links to service_role;
grant select, delete on table public.menu_social_link_translations to service_role;

grant select, delete on table public.menu_translation_jobs to service_role;

-- Legacy widget runtime has been removed from the app, but historical rows may
-- still exist and must not block lifecycle cleanup.
grant select, delete on table public.menu_widgets to service_role;
grant select, delete on table public.menu_widget_items to service_role;
