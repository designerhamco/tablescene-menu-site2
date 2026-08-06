# Menu Site Staff Access Contract

Status: Phase A foundation approved; Phase B runtime authorization pending
Audit date: 2026-08-05
Code baseline: `594b277 fix: align menu site purchase policy copy`
Scope: product policy and read-only audit only

## 1. Audit Boundary

This document defines the first owner/staff access contract for MenuLink and records the current repository authorization structure.

The audit used the current application code, generated Supabase types, schema SQL, migrations, existing product contracts, and a read-only Production catalog query. The query confirmed `menu_sites` RLS, its current policies, `private` schema, `pgcrypto`, `set_updated_at()`, and the existing private owner helper. It did not mutate Production. Because this project has historically applied some SQL manually, the migration runbook still begins with a repeatable read-only precheck of RLS, policies, grants, functions, Storage policies, constraints, and existing rows.

This step did not:

- create or apply a migration;
- change RLS, grants, Storage policies, Auth settings, or generated types;
- implement invitation UI, email delivery, staff pages, Order, or Call;
- write to Database or Storage;
- change billing, payment, subscription, refund, retention, or AI credit behavior.

## 2. Decisions

The following decisions are approved for the MVP contract.

1. `menu_sites.user_id` remains the single menu-site owner source of truth.
2. The owner is not duplicated in `menu_site_members`.
3. Staff access is stored per menu site, never as an account-wide role.
4. The staff roles are `manager`, `editor`, `order_staff`, and `viewer`.
5. Ownership transfer and custom roles are not supported in the MVP.
6. UI visibility is not authorization. Server actions, API routes, RLS, Storage policies, and privileged functions must enforce the same contract.
7. Billing, subscription, refund, restore, staff management, archive/delete, and additional purchases remain owner-only.
8. Menu content and public status are separate permissions. Editors may save content but may not publish.
9. Owner/Manager/Editor may use menu AI features. Usage consumes the owner's account wallet and records the employee as actor.
10. Order/Call roles are contractual placeholders until their tables and APIs exist. The current locked shell remains unchanged.
11. Viewer access is limited to menu settings, owner/staff preview, and the public menu. Viewer cannot read Order, Call, sales, billing, staff, or audit data.
12. Order Staff may cancel only unpaid, pre-served orders and must provide a reason. Paid-order cancellation/refund is Owner/Manager only.
13. Manager may edit a slug only while the site is `draft` and `published_at` is null. After first publication, normal UI cannot change the slug for any role.
14. Archived, pending-delete, and retention menu sites are hidden from staff. Only Owner receives recovery access.
15. The MVP has no staff seat limit. Invitation endpoints require rate limiting and audit logging.
16. The first database foundation includes append-only audit logs.
17. A multi-site invite creates one invitation row per site but uses one batch ID, one shared token, one email, and one acceptance link.

## 3. Ownership Model

```text
auth user
|- menu_sites.user_id                  owned menu sites
`- menu_site_members.user_id          staff memberships
```

### Owner

The owner is the user identified by `menu_sites.user_id`.

- The owner is the payment and subscription principal.
- The owner has all menu-site permissions while the service lifecycle permits them.
- The owner manages staff, dangerous operations, billing, refunds, and recovery.
- The owner cannot be demoted or removed through membership operations.
- The owner must never be inserted into `menu_site_members` for the same site.
- Ownership transfer is unsupported. Active owned services must be resolved before owner account deletion can complete.

### Staff

Staff receive access through one active membership row per menu site.

- A membership grants no ownership or billing rights.
- A staff user sees only assigned menu sites.
- Revocation removes access immediately on the next server/RLS check.
- Membership is tied to `auth.users.id`; a later email change does not change the membership identity.
- Staff cannot view billing keys, payment instruments, owner AI wallet history, or unrelated owned menu sites.

### Why Owner Is Not a Membership Role

Keeping the owner outside membership preserves the existing payment, lifecycle, provisioning, and legacy multi-site contracts. It also prevents accidental removal of the last owner and avoids backfilling every existing site before staff access can launch.

The tradeoff is that access helpers and RLS must evaluate two sources: direct ownership and active membership. This is acceptable if all checks use one shared access contract rather than ad hoc role queries.

## 4. Roles

### Manager

Operational administrator for one menu site.

- May read and edit menu content, design, translations, images, and supported template content.
- May preview and publish/unpublish.
- May manage general QR, future tables, table QR, sessions, Order, Call, manual payment completion, and sales.
- May use AI from the owner's wallet.
- May not manage staff, billing, subscription, refunds, recovery, archive/delete, or additional purchases.

### Editor

Content and design editor.

- May read and edit non-sensitive menu content, design, localization, and supported template content.
- May upload/delete menu assets, run AI, final-save drafts, and preview.
- May not edit slug, publish, manage QR/tables, operate Order/Call, view sales, or access owner operations.

### Order Staff

Future store-floor operator.

- May read the public menu data needed for operations.
- May read and process orders and calls, complete a manual payment, and view/print browser receipts.
- May cancel only unpaid orders before `served`, with a required reason and actor audit.
- May not reverse/refund a manual payment record, edit menu content, publish, view aggregate sales, or access owner operations.

### Viewer

Read-only menu observer.

- May read assigned menu settings, preview, and the public menu.
- Has no write permission.
- May not read Order, Call, sales, billing, staff, or audit data.

## 5. Permission Notation

- `A`: allowed.
- `R`: read-only.
- `-`: denied.
- `F`: future feature; the role contract is reserved but no current runtime exists.
- `Owner only`: must be enforced independently of menu edit access.

## 6. Permission Matrix

### Menu Board

| Function | Owner | Manager | Editor | Order Staff | Viewer |
| --- | --- | --- | --- | --- | --- |
| Assigned menu-site list | A | R | R | R | R |
| Basic information read | A | R | R | R, operational subset | R |
| Store/content basic information edit | A | A | A | - | - |
| Slug edit while `draft` and never published | A | A | - | - | - |
| Page settings | A | A | A | - | - |
| Cover/featured area | A | A | A | - | - |
| Categories, items, options, traits | A | A | A | - | R |
| Image upload/delete | A | A | A | - | - |
| Video upload/delete when entitled | A | A | A | - | - |
| Widget content and assets | A | A | A | - | R |
| Design and typography | A | A | A | - | R |
| About/SNS/chef | A | A | A | - | R |
| Event content when template supports it | A | A | A | - | R |
| Promotion/time-sale content | A | A | A | R | R |
| Translation read | A | R | R | - | R |
| Translation edit/final save | A | A | A | - | - |
| Automatic translation | A | A | A | - | - |
| AI description/content generation | A | A | A | - | - |
| AI credit spending | A | A, owner wallet | A, owner wallet | - | - |
| Final save | A | A | A | - | - |
| Owner/staff preview | A | A | A | R, public/operational | R |
| Publish/unpublish | A | A | - | - | - |

Editor basic-information updates exclude owner identity, service state, billing linkage, subscription linkage, slug, publication state, retention state, and any future permission fields.

### QR and Table

| Function | Owner | Manager | Editor | Order Staff | Viewer |
| --- | --- | --- | --- | --- | --- |
| General QR management/download UI | A | A | - | - | - |
| Public QR image access for a published slug | public | public | public | public | public |
| Table list | A/F | A/F | - | R/F | R/F |
| Table create/update/delete | A/F | A/F | - | - | - |
| Table QR download | A/F | A/F | - | R/F | R/F |
| Visit session read | A/F | A/F | - | R/F | R/F |
| Visit session end | A/F | A/F | - | A/F | - |

The current `/api/qr?slug=...` route is intentionally based on public slug and active published state, not owner authentication. The permission above controls management UI, not the public QR artifact. Future table QR must use a separate authenticated management route and a public scan contract.

### Order

| Function | Owner | Manager | Editor | Order Staff | Viewer |
| --- | --- | --- | --- | --- | --- |
| Order list/detail | A/F | A/F | - | A/F | - |
| Order status change | A/F | A/F | - | A/F | - |
| Unpaid, pre-served order cancellation with reason | A/F | A/F | - | A/F | - |
| Paid-order cancellation/refund | A/F | A/F | - | - | - |
| Manual payment complete | A/F | A/F | - | A/F | - |
| Manual payment reversal/refund record | A/F | A/F | - | - | - |
| Receipt read/print | A/F | A/F | - | A/F | - |

The existing `orders` and `payments` tables are MenuLink service-purchase records. They are not restaurant Order tables and must not be reused for customer dining orders.

### Call

| Function | Owner | Manager | Editor | Order Staff | Viewer |
| --- | --- | --- | --- | --- | --- |
| Call list/detail | A/F | A/F | - | A/F | - |
| Call process/complete | A/F | A/F | - | A/F | - |
| Call configuration | A/F | A/F | - | - | - |

### Sales

| Function | Owner | Manager | Editor | Order Staff | Viewer |
| --- | --- | --- | --- | --- | --- |
| Operational order amounts for assigned shift | A/F | A/F | - | R/F | - |
| Aggregate order statistics | A/F | A/F | - | - | - |
| Sales report | A/F | A/F | - | - | - |
| Payment-method aggregation | A/F | A/F | - | - | - |
| CSV export | A/F | A/F | - | - | - |

Order Staff may see the amount needed to operate an individual order but not aggregate revenue, owner settlement, or billing data. Viewer sales access is disabled in the MVP.

### Billing and Owner Operations

| Function | Owner | Manager | Editor | Order Staff | Viewer |
| --- | --- | --- | --- | --- | --- |
| Derived service availability | A | R | R | R | R |
| Subscription details | A | - | - | - | - |
| MenuLink payment history | A | - | - | - | - |
| Cancellation reservation | A | - | - | - | - |
| Refund request/status | A | - | - | - | - |
| Restore/resubscribe | A | - | - | - | - |
| Additional menu-site purchase | A | - | - | - | - |
| AI wallet balance/history | A | - | - | - | - |

Staff may receive a derived state such as `active`, `read_only`, or `unavailable`. They must not query `business_subscriptions`, service-purchase `orders/payments`, refund rows, billing keys, or the owner's wallet directly.

### Staff and Dangerous Operations

| Function | Owner | Manager | Editor | Order Staff | Viewer |
| --- | --- | --- | --- | --- | --- |
| Staff list | A | - | - | - | - |
| Invitation create/resend/cancel | A | - | - | - | - |
| Membership role change | A | - | - | - | - |
| Membership revoke/reactivate | A | - | - | - | - |
| Menu-site archive | A | - | - | - | - |
| Hard-delete request | A | - | - | - | - |
| Service termination | A | - | - | - | - |
| Ownership transfer | unsupported | - | - | - | - |

## 7. Authorization Evaluation Order

Every protected operation evaluates gates in this order:

1. Authenticate the actor with Supabase Auth.
2. Reject deleted, suspended, or otherwise blocked accounts.
3. Resolve menu site and actor relationship: owner or active membership.
4. Resolve the role permission for the requested operation.
5. Resolve service entitlement and menu-site lifecycle state.
6. Resolve feature/add-on entitlement and template capability.
7. Validate target entities belong to the same menu site.
8. Validate request payload and perform the operation.
9. Record the actor and result for auditable operations.

Passing a lower gate never overrides a failed upper gate. The client-provided role, owner ID, menu-site ID relationship, price, service state, or permission is never trusted.

## 8. Current Repository Authorization Audit

### Application Paths

| Function | UI/loader check | Server/API check | RLS evidence in repository | Current boundary | Staff expansion |
| --- | --- | --- | --- | --- | --- |
| My page menu list | `app/mypage/page.tsx` queries `menu_sites.user_id = user.id` | Server component session | Remote RLS enabled; owner/public/admin policies confirmed | Owner only | High: union owned sites and active memberships |
| Edit loader | `edit/page.tsx` filters site by `id + user_id` | Lifecycle helper requires `canEdit` | Child-table reads rely on owner RLS | Owner only | High: access context before lifecycle |
| Owner preview | Preview route authenticates | `getOwnerPreviewMenuPageData` filters `id + user_id` | Owner/public content policies | Owner only | Medium: `menu.read` plus preview lifecycle |
| Public menu | Published slug only | Service lifecycle requires `canViewPublic` | Public visible SELECT policies | Public, separate from staff | None; keep separate |
| Menu actions | Forms hide/enable by lifecycle | Central `requireOwnedMenuSite` filters `id + user_id`; child assertions check same-site relation | Owner-all policies on content | Owner only | High: replace entry gate with permission-specific helper |
| Publish | Owner edit UI | Uses the same broad owner helper then updates `menu_sites.status` | `menu_sites` policy must be remotely verified | Owner only | High: owner/manager only; separate from edit |
| Widget save | Owner edit UI | Widget services query site by `id + user_id` and lifecycle | Widget owner policies | Owner only | Medium: `menu.edit` |
| Image upload/delete | Owner edit UI | `/api/menu-images` checks site `id + user_id` and lifecycle | `menu-images` Storage helper checks owner | Owner only | High: Storage helper must admit manager/editor |
| Widget images | Owner edit UI | Route checks owner; some DB lookup uses admin client | Bucket policy not defined in tracked SQL | Owner only | High: verify remote policy, add role-aware Storage check |
| Display video | Owner edit UI | Route checks owner/lifecycle/entitlement, then admin Storage upload | Bucket policy not defined in tracked SQL | Owner only | Medium: role check before service role operation |
| AI translation | Owner localization UI | Owner helper; account credit service uses menu owner | Job RLS requires requester to be owner | Owner only | High: separate owner wallet from actor identity |
| General QR | Owner UI only | QR route checks published lifecycle by slug, no auth | Public menu contract | Public artifact | Low: manager UI permission only |
| Billing/subscription | Owner mypage | User ownership checks plus admin client/service routes | User or service-role policies | Owner only | Do not expand |
| Refund/restore | Owner mypage | User ownership checks plus admin client | Owner SELECT/service role writes | Owner only | Do not expand |
| Admin | Admin UI | `admin_users` checks | Admin policies | Platform admin only | Do not mix with staff |
| Order/Call | No active product UI | Locked entry shell returns children only | No restaurant Order/Call tables | Not implemented | Define later from this contract |

### Current Helper Assessment

`lib/server/menu-site-access-service.ts` is a lifecycle/service-state helper, not a role authorization helper. When a `userId` is supplied it also filters `menu_sites.user_id`, which couples lifecycle lookup to ownership. It should remain the lifecycle source but must be called after a new relationship/permission context has authorized the actor.

The repeated owner gates in `app/mypage/menus/actions.ts`, widget services, image routes, video routes, preview loaders, and AI services cannot safely be broadened one at a time. A shared permission helper must land first.

Recommended server API:

```ts
type MenuSitePermission =
  | "menu.read"
  | "menu.edit"
  | "menu.publish"
  | "qr.manage"
  | "table.manage"
  | "order.read"
  | "order.manage"
  | "payment.manual"
  | "call.read"
  | "call.manage"
  | "sales.read"
  | "staff.manage"
  | "billing.manage"
  | "menu.archive";

type MenuSiteAccessContext = {
  menuSiteId: string;
  ownerUserId: string;
  actorUserId: string;
  isOwner: boolean;
  role: "owner" | "manager" | "editor" | "order_staff" | "viewer";
  permissions: ReadonlySet<MenuSitePermission>;
};
```

Recommended helpers:

- `getMenuSiteAccessContext(menuSiteId, actorUserId)`
- `requireMenuSitePermission(menuSiteId, permission)`
- `hasMenuSitePermission(context, permission)`
- `getAccessibleMenuSiteIds(actorUserId)`
- `requireActiveMenuSiteFeature(context, feature)` as a lifecycle/add-on gate after permission

Recommended location: `lib/server/menu-site-permissions.ts`. The role-to-permission map should be pure and unit-tested. Route helpers must derive `actorUserId` from `supabase.auth.getUser()`, never from request input.

## 9. Current RLS and Grant Audit

The table below describes tracked repository SQL. `Remote verify` means the next runbook must query `pg_class`, `pg_policies`, `information_schema.role_table_grants`, functions, and Storage policies before applying anything.

| Table/group | Tracked state | Current owner rule | Staff change | Final exposure |
| --- | --- | --- | --- | --- |
| `menu_sites` | Remote RLS enabled; owner ALL uses `auth.uid() = user_id`; anon SELECT requires published; admin SELECT exists | Application also filters `user_id` | Phase A leaves it unchanged; Phase B adds staff SELECT only and server-bounded writes | Repeat verification before manual apply |
| `menu_pages` | RLS enabled; owner CRUD, public visible SELECT, admin SELECT | Join to site owner | Manager/Editor CRUD; assigned staff SELECT | Public policy remains separate |
| `menu_categories`, `menu_items` | RLS enabled; owner all, public visible SELECT, admin SELECT | Join to `menu_sites.user_id` | Manager/Editor writes; all assigned roles read | Preserve anonymous published rows |
| Price options/traits/price columns | RLS enabled with owner CRUD and public visible SELECT | Site ownership through item/category | Manager/Editor writes; assigned roles read | Preserve cross-site consistency checks |
| `menu_chefs`, `menu_events`, `menu_social_links` | RLS enabled; owner all, public visible SELECT, admin SELECT | Site ownership | Manager/Editor writes; assigned roles read | Preserve visible/published public checks |
| `menu_widgets`, `menu_widget_items` | RLS enabled; owner CRUD, public visible SELECT, admin SELECT | Site ownership | Manager/Editor writes; assigned roles read | Preserve widget/page/site relationship checks |
| `menu_promotions`, `menu_promotion_items` | RLS enabled; owner CRUD, public active SELECT, admin SELECT, service role | Site ownership | Manager/Editor writes; operational roles read | Public active-time policy remains separate |
| Translation tables | RLS enabled; owner all, public translated SELECT, admin SELECT | Direct or joined site ownership | Manager/Editor writes; assigned roles read | Preserve locale/public visibility checks |
| `menu_translation_jobs` | RLS enabled; owner all requires `requested_by = auth.uid()` and site ownership | Owner is both payer and requester | Make requester the actor; allow edit roles to create/read site jobs through server/RLS | Never expose provider raw responses |
| `service_entitlements` | RLS enabled; authenticated owner SELECT by `user_id`; service role writes | Account owner | No staff direct access | Staff receive derived service availability only |
| `business_subscriptions` | RLS enabled; authenticated revoked; service role select/insert/update | Server owner validation | No staff access | Owner API only |
| Service-purchase `orders`, `payments` | RLS enabled; owner `user_id` SELECT/insert/update plus admin SELECT | Account owner | No staff access | Do not confuse with restaurant orders |
| `refund_requests` | RLS enabled; authenticated own SELECT; service role all | Account owner | No staff access | Owner API only |
| AI balances/transactions | RLS enabled; owner SELECT, service role mutations | Account owner | No staff direct read; staff AI invokes server using owner ID | Add actor metadata/audit |
| `notification_events` | RLS enabled; owner SELECT/read update; service role all | Account owner | No generic staff access | Not an authorization audit log |
| Restaurant Order/Call/table/session tables | Not present in generated types | None | Future migration | Must be menu-site scoped from creation |

### `menu_sites` Remote Verification

The 2026-08-05 read-only Production query confirmed:

- RLS enabled and FORCE RLS disabled;
- authenticated owner `ALL` policy with `auth.uid() = user_id` in `USING` and `WITH CHECK`;
- anon SELECT policy restricted to `status = 'published'`;
- authenticated admin SELECT policy through `admin_users`;
- `private` schema and `private.user_owns_menu_site(text)` security-definer helper;
- `pgcrypto` and public `set_updated_at()` available;
- no existing public table with `audit` or `activity` in its name returned by the audit query.

Phase A does not change these `menu_sites` policies. The SQL Editor precheck repeats this verification and stops on incompatible state.

### Column-Sensitive `menu_sites` Writes

RLS UPDATE policies are row-based, not a complete field-level permission system. Giving Editor a broad UPDATE policy on `menu_sites` could allow publication, owner ID, slug, or lifecycle fields to change if grants and payloads permit it.

Therefore:

- Staff get authenticated SELECT on assigned sites.
- Owner retains existing full owner path.
- Manager/Editor `menu_sites` writes must go through permission-checked server actions with strict allowlisted payloads.
- Publish is a separate Owner/Manager server action.
- Slug update is allowed only for Owner/Manager while `status = 'draft'` and `published_at is null`; no normal UI change is allowed after first publication.
- Billing/lifecycle/owner fields are never accepted from staff payloads.
- If direct Data API update remains anywhere, use column grants or split RPCs; do not rely on UI omission.

## 10. Recommended Database Model

### `menu_site_members`

Recommended columns:

| Column | Contract |
| --- | --- |
| `id` | UUID primary key |
| `menu_site_id` | UUID not null, FK `menu_sites(id)` on delete cascade |
| `user_id` | UUID not null, FK `auth.users(id)` on delete cascade |
| `role` | `manager`, `editor`, `order_staff`, or `viewer` |
| `status` | `active` or `revoked` |
| `invited_by` | UUID nullable, FK `auth.users(id)` on delete set null |
| `accepted_at` | timestamptz nullable; required for active rows |
| `revoked_at` | timestamptz nullable; required for revoked rows |
| `created_at`, `updated_at` | timestamptz not null |

Recommended constraints:

- Unique `(menu_site_id, user_id)` across all statuses. Revocation updates the existing row and reactivation reuses it.
- Role and status CHECK constraints.
- Owner exclusion enforced in the invitation/acceptance server transaction and, preferably, a private trigger/function check.
- State consistency checks for `accepted_at` and `revoked_at`.
- Index `(user_id, status, menu_site_id)` for staff mypage.
- Index `(menu_site_id, status, role)` for owner management.

Soft revoke is preferred to deletion because it preserves operational context. The immutable audit log preserves role history; the membership row represents current access.

### `menu_site_invitations`

Recommended columns:

| Column | Contract |
| --- | --- |
| `id` | UUID primary key |
| `invite_batch_id` | UUID not null; shared by all rows created by one invite action |
| `menu_site_id` | UUID not null, FK `menu_sites(id)` on delete cascade |
| `email_normalized` | Lowercase normalized value used for equality |
| `role` | Staff role CHECK |
| `token_hash` | Shared batch hash of a cryptographically random one-time token; raw token never stored |
| `status` | `pending`, `accepted`, `revoked`, or `expired` |
| `invited_by` | UUID nullable, FK `auth.users(id)` on delete set null |
| `accepted_by` | UUID nullable, FK `auth.users(id)` on delete set null |
| `expires_at` | Seven days after issue |
| `accepted_at`, `revoked_at` | Terminal timestamps |
| `created_at`, `updated_at` | timestamptz not null |

Recommended constraints:

- Partial unique index `(menu_site_id, email_normalized)` where `status = 'pending'`.
- Non-unique `token_hash` lookup index because all rows in one batch share the hash.
- Batch lookup index `(invite_batch_id, status, menu_site_id)`.
- Email normalization and non-empty checks.
- Role, status, terminal timestamp, and expiry checks.
- Index `(email_normalized, status, expires_at)` for safe validation after token resolution.
- Index `(menu_site_id, status, created_at desc)` for owner UI.

An expired invitation should be marked expired by acceptance/resend logic; a scheduled cleanup may update stale pending rows later. Acceptance always rechecks the current invitation status, expiry, owner, site lifecycle, authenticated email, existing membership, and current role.

### Multiple Menu Sites in One Invite Operation

The MVP stores one invitation row per menu site. No organization, team, account-wide role, or separate invitation batch table is introduced.

The owner UI may select several sites. The server creates each row in one controlled operation with the same `invite_batch_id`, `email_normalized`, `token_hash`, and expiry. Roles remain row-specific. Delivery sends one email with one acceptance link. Accepting that token processes every valid pending row in the batch atomically.

Newly purchased sites are never automatically added to existing staff memberships.

## 11. Invitation and Acceptance Flow

1. Owner authenticates and opens staff management.
2. Server verifies `staff.manage` for every selected menu site.
3. Server trims and lowercases the invite email.
4. Server rejects owner self-invite, an existing active member, or duplicate pending invitation.
5. Server generates at least 256 bits of cryptographically random token material.
6. For a multi-site invite, Server writes one row per site with one batch ID and shared token hash.
7. Server stores only the cryptographic hash and seven-day expiry, then sends one branded email with one link.
8. Recipient opens the invitation route.
9. Existing users log in; new users sign up and confirm email.
10. Auth flow returns to the invitation route without losing invitation intent.
11. Acceptance server hashes the token, resolves one unambiguous batch, locks all rows, and verifies every pending row.
12. Authenticated user's normalized, verified email must match every row's `email_normalized`.
13. Server inserts or reactivates each membership with that row's current role.
14. Server marks all accepted invitations and appends audit rows in one transaction.
15. Every accepted assigned site appears in staff mypage.

Resend rotates the shared batch token hash and expiry, invalidating the previous link. Cancel sets selected rows to `revoked`; it does not delete evidence. Accepted, revoked, and expired tokens are never reusable. A partially invalid batch must not create a partially accepted membership set.

Invitation lookup must not permit anonymous search by email. The opaque token identifies a candidate invitation, and authenticated email matching completes authorization. Provider errors, hashes, and raw tokens must not appear in UI or logs.

## 12. Current Supabase Auth Compatibility

Current Auth behavior:

- Email signup uses Supabase `signUp` with `emailRedirectTo` pointing to `/auth/callback?next=...`.
- Login and OAuth preserve a validated same-origin `next` path.
- `getSafeAuthRedirectPath` rejects absolute and protocol-relative external redirects while preserving path/query/hash.
- The callback exchanges the code, rejects accounts marked deleted in `app_metadata`, and redirects to the safe path.
- Password reset uses `NEXT_PUBLIC_SITE_URL` when configured.

This can preserve an invitation acceptance path through login and signup, for example `/staff/invitations/accept?token=...`. Do not store authorization state in user-editable `user_metadata`, localStorage, or role claims supplied by the client.

Implementation requirements:

- Use a dedicated safe invitation return-path builder or extend the existing safe-path tests.
- Keep raw invitation tokens out of analytics, application logs, error reporting, and page metadata.
- Prefer an HttpOnly, short-lived invite-intent cookie during Auth redirects if URL propagation creates logging/referrer exposure.
- Set an appropriate referrer policy on invitation pages.
- Require verified Auth email match at acceptance.
- Existing membership remains tied to `user_id` if the user later changes email.
- Deleted/suspended accounts cannot accept or use memberships.
- Supabase Auth confirmation email and MenuLink staff invitation email remain distinct messages.

## 13. RLS and Privileged Helper Design

The migration should use private, fixed-search-path helper functions for repeated RLS predicates. Security-definer functions must not live in an exposed schema.

Candidate private predicates:

```text
private.is_menu_site_owner(menu_site_id)
private.has_active_menu_site_membership(menu_site_id, allowed_roles[])
private.can_read_menu_site(menu_site_id)
private.can_edit_menu_site(menu_site_id)
```

Requirements:

- Use `auth.uid()` inside the function; do not accept actor ID from the client.
- Use `security definer`, fixed `search_path`, revoke public execution, and grant only required roles.
- Avoid RLS recursion when membership policies call membership helpers.
- Owner and active membership are evaluated independently.
- Staff status must be active.
- Public published SELECT policies remain separate from authenticated staff policies.
- UPDATE requires a matching SELECT policy in Supabase/Postgres.
- Billing tables never call membership helpers.

Recommended membership RLS:

- Owner can SELECT memberships for owned sites.
- A staff user can SELECT only their own membership row.
- Invitation and membership mutations are server-only through service role or narrowly scoped private RPCs after owner permission checks.
- No anon grants.
- Authenticated direct INSERT/UPDATE/DELETE should be revoked unless a carefully audited RPC is used.

Recommended invitation RLS:

- Owner can SELECT invitations for owned sites.
- Recipient cannot enumerate invitations by email.
- Create/resend/cancel/accept are server operations.
- No anon grants or policies.

## 14. Storage Contract

Tracked `menu-images` policies currently use a private owner helper based on `menu_sites.user_id`. Staff image writes therefore require a role-aware private Storage predicate.

Final policy:

- Public read remains bucket-specific for assets intentionally used by published menus.
- Insert/update/delete is allowed only to Owner/Manager/Editor with active service and a path under `menu-sites/<menuSiteId>/...`.
- Order Staff and Viewer cannot mutate assets.
- Upload routes still validate MIME, bytes, size, template capability, entity ownership, and menu-site relationship.
- Storage upsert requires INSERT, SELECT, and UPDATE policies; replacement flows must be tested explicitly.
- Service-role video upload remains behind a server permission check and must never trust menu ID from form data alone.
- The tracked repository has no definitive bucket policy SQL for `menu-widget-images` or `menu-videos`; remote read-only verification is required before design.

## 15. AI Credit Contract

Owner, Manager, and Editor may run supported AI features when the menu site and plan allow them.

- The charged wallet is always the menu-site owner's account wallet.
- The actor is the authenticated user who clicked the action.
- Order Staff and Viewer cannot use AI.
- Staff cannot read wallet balances, purchase history, or AI credit transactions directly.
- Insufficient credit is returned as a generic menu operation error; owner billing details are not exposed.
- `menu_translation_jobs.requested_by` must record the actor, not be overloaded as wallet owner.
- Credit transaction metadata or an explicit future column records `actor_user_id`, role, and menu site.
- Recovery drafts remain menu-site scoped and available only to Owner/Manager/Editor.
- Provider raw responses and secrets are never persisted; only sanitized translated fields and safe status/error data are stored.

Current code sometimes writes the menu owner into `menu_translation_jobs.requested_by` and passes empty credit metadata. That is correct for today's owner-only flow but insufficient for staff attribution and must change before AI staff access is enabled.

## 16. Staff My Page

The menu-site list becomes the union of:

1. sites where `menu_sites.user_id = current user`; and
2. sites with an active `menu_site_members.user_id = current user` row.

Cards display `Owner`, `Manager`, `Editor`, `Order Staff`, or `Viewer`. The card exposes only permitted actions.

- Staff do not see additional-purchase CTA, billing tabs, refunds, restore, subscription management, staff management, archive, or deletion.
- Revoked memberships disappear immediately.
- Archived, pending-delete, and retention sites are hidden from staff and do not expose owner recovery controls.
- A query must not depend on public published SELECT to retrieve a staff draft site.
- Duplicate cards are prevented if malformed data attempts to create owner membership; owner relationship wins.

## 17. Lifecycle and Retention

Membership does not override service lifecycle.

| State | Owner | Staff |
| --- | --- | --- |
| Active service | Role permissions apply | Role permissions apply |
| Cancel scheduled before paid end | Normal until end date | Normal until end date |
| Payment issue/expired holding | Recovery/read-only owner experience per existing contract | Site hidden; no read/write/AI/Order/Call/billing access |
| Archived/pending delete | Owner-only recovery information when existing policy permits | Site hidden |
| Retention expired/deleted | Existing deletion contract | No access |
| Service restored | Existing owner access restored | Existing active memberships become usable again |
| Refund completed/service ended | Existing owner retention contract | Writes and operations stop immediately |

Owner account deletion currently archives owned sites and blocks entitlements. Because all authorization checks must include account and lifecycle state, staff writes must also stop. Active owned services should block final Auth-user deletion until the ownership/service cleanup contract completes.

Staff account deletion cascades or revokes memberships and cancels pending invitations for that user/email where safely identifiable. Existing audit log rows retain a nullable actor reference and immutable actor snapshot metadata.

## 18. Audit Log

`notification_events` is a delivery queue/history for customer notifications. It is not an immutable authorization audit log.

The Phase A database foundation includes a menu-site audit table before any staff runtime access launches. Recommended `menu_site_audit_logs` fields:

- `id`
- `menu_site_id`
- `actor_user_id` nullable, `on delete set null`
- `actor_role`
- `action`
- `entity_type`
- `entity_id` nullable
- sanitized `metadata` JSONB
- request correlation/idempotency key where applicable
- `created_at`

It is append-only, inserted by service role or a private RPC, and never updated/deleted by authenticated users. Owner can read it initially; Manager access may be added later for operational event subsets.

Minimum audited actions:

- invitation create/resend/cancel/accept;
- membership role change/revoke/reactivate;
- final save;
- publish/unpublish;
- AI execution and credit actor;
- future order cancellation;
- future manual payment completion/reversal;
- future call completion;
- archive and delete request.

Sensitive content, invitation tokens/hashes, provider payloads, billing keys, and secrets are excluded from metadata.

## 19. Edge Cases

- Owner self-invite: reject.
- Existing active member invitation: reject and direct owner to role change.
- Existing revoked member invitation: create a new pending invitation; acceptance reactivates the existing membership row.
- Duplicate pending invitation: reject or explicitly rotate via resend, never create a second pending row.
- Role changed before acceptance: update the pending invitation role with audit; acceptance uses the current stored role.
- Invitation accepted concurrently: transaction/locking and unique membership constraint make one winner; subsequent attempts return already accepted.
- Email mismatch: reject without revealing the expected email beyond a masked hint.
- Auth email changed after membership: membership remains valid by user ID; owner may revoke it.
- Owner removes last Manager: allowed because Owner always retains control.
- Owner account suspended/deleted: all staff writes stop; staff cannot recover or pay.
- Staff account suspended/deleted: membership is unusable and eventually revoked/cascaded.
- Legacy subscription with three menu sites: owner may bulk-select all three, but three independent memberships/invitations are created.
- New future purchase: existing staff are not automatically assigned.
- Archived or retained site: staff cannot edit/operate; restoration by owner re-enables unchanged active memberships.

## 20. Staff Seat Policy

The MVP has no staff seat limit. Do not encode a seat number in application constants, database CHECK constraints, or pricing copy.

Recommended MVP direction:

- Unlimited staff memberships at the product-contract level for the MVP.
- Enforce owner-only invitations, rate limits, duplicate prevention, email verification, and abuse monitoring.
- Record invitation volume by owner/menu site for operations review.
- Keep the server invitation service ready to consult a future entitlement/configured seat allowance.
- Add a product seat limit later through entitlement configuration, not a destructive schema rewrite.

This is safer than inventing a fixed limit now and less complex than tying seats to the unfinished Order/Call add-on.

## 21. MVP Exclusions

- Ownership transfer.
- Organization/brand/team hierarchy.
- Account-wide staff role.
- Automatic access to future purchases.
- Custom roles and per-field permission editor.
- Manager staff administration.
- Staff billing access.
- Viewer sales access.
- Separate staff AI wallet.
- Restaurant Order/Call implementation.
- Separate invitation batch table; batching uses `invite_batch_id` on invitation rows.

## 22. Implementation Sequence

### Step 1: Contract and audit

- Product decisions and permission matrix approved.
- Production `menu_sites` RLS and helper conventions verified read-only.

### Step 2: Migration and manual runbook

- Read-only remote RLS/grant/Storage audit first.
- Add members, invitations, private RLS helpers, indexes, checks, trigger conventions, and audit log.
- Do not broaden billing policies.
- Prepare SQL Editor apply and verification runbook.

### Step 3: Manual apply and types

- User applies SQL once in Supabase SQL Editor.
- Verify rows remain zero, owner data unchanged, policies/grants/functions correct.
- Run generated type update; never hand-edit types.

### Step 4: Server permission foundation

- Add pure role matrix and tests.
- Add access-context and require-permission helpers.
- Keep lifecycle helper separate and compose it after permission.

### Step 5: Existing menu routes

- Expand list, edit, preview, actions, publish, widget, promotion, and localization routes by exact permission.
- Preserve owner-only billing/dangerous routes.

### Step 6: Invitation and staff UI

- Owner staff management.
- Invite, resend, cancel, accept, role update, revoke, and reactivate.
- Staff mypage cards and action filtering.

### Step 7: Storage and AI

- Role-aware Storage policies and upload routes.
- Owner-wallet/actor separation for AI and recovery jobs.
- Audit attribution.

### Step 8: Order/Call

- Add menu-site-scoped tables and APIs from the separate Order/Call contract.
- Apply Manager/Order Staff/Viewer permissions and operational audit logs.

### Step 9: Email and production QA

- Brand invitation and Auth templates.
- Test existing/new user acceptance, expiry, revoke, concurrent acceptance, lifecycle, and all role boundaries.

## 23. Finalized Product Decisions

1. Viewer can read menu settings and preview only; Order, Call, sales, billing, staff, and audit access are denied.
2. Order Staff may cancel only unpaid, pre-served orders with a required reason. Paid cancellation/refund is Owner/Manager only.
3. Manager may edit slug only when `status = 'draft'` and `published_at is null`. After first publication, no normal role may change it.
4. Archived, pending-delete, and retention menu sites are hidden from staff. Owner alone receives recovery access.
5. The MVP has no staff seat limit; invitation rate limiting and logging are required.
6. Append-only audit logs are part of Phase A.
7. Multi-site invitation uses per-site rows with one batch ID, one shared token, one email, and one acceptance link.
8. Owner remains outside membership, ownership transfer is unsupported, and staff/billing/dangerous operations remain Owner-only.
