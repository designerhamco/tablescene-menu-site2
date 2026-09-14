# Staff Permission Overrides Migration

## Scope

This record covers only `supabase/migrations/20260914074800_add_staff_permission_overrides.sql`.
It adds validated per-member permission overrides and an owner-scoped atomic update RPC. It does not change billing, subscriptions, payments, menu content, Storage, or existing staff rows beyond adding the non-null empty override default.

## Production application record

- Target: `tablescene-prod` (`kfbekbapwsyeanobyjsv`)
- Applied: 2026-09-14
- Method: `supabase db query --linked --file` for this exact SQL file
- `supabase db push` and linked migration replay were not used.
- Precheck confirmed `permission_overrides` did not exist.
- The command completed without SQL errors.

## Postcheck

- `public.menu_site_members.permission_overrides` exists, is `NOT NULL`, and defaults to empty `allow` and `deny` arrays.
- `menu_site_members_permission_overrides_check` exists and is validated.
- `public.update_menu_site_member_access(...)` is `SECURITY DEFINER`.
- `service_role` has execute permission on the RPC.
- `anon` and `authenticated` do not have execute permission on the RPC.

Application code must continue to verify Owner identity and allowed override keys before calling the RPC. Owner-only billing, staff management, archive, delete, and baseline read permissions are never part of the override surface.
