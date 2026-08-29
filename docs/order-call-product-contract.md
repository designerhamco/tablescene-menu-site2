# ArtiMenu Order·Call Product Contract

Last updated: 2026-08-29

## 1. Purpose

This document records the current ArtiMenu Dining feature boundary and preserves the dormant Order implementation contract for a possible distant relaunch.

Current launch policy takes precedence over historical Order sections below:

- Single-page Dining: KRW 5,900/month, discount and widgets included, multi-page/Smart Call/Order excluded.
- Multi-page Dining: KRW 9,900/month, discount and Smart Call included, widgets/Order excluded.
- QR Order and restaurant PG are dormant for the foreseeable future. Existing code and schema remain for compatibility, but public UI and writes stay fail-closed.
- Multi-page design templates are not commercially available until a real production-ready design is added. The existing Brew Chapter template is an internal hidden implementation fixture.

Status labels:

- 확정: Product contract for the next implementation steps.
- 권장: Preferred direction, but details may be refined during implementation.
- 미결정: Must not be invented in code without a product decision.
- 비범위: Explicitly outside this contract.

## 2. Product Definitions

### ArtiMenu Basic / Multi-page

- 확정: Single-page and Multi-page are distinct Dining price tiers and templates can switch only within the purchased tier.
- 확정: Both tiers provide menu names, prices, descriptions, images, multilingual content, sold-out state, time sales, and public menu rendering.
- 확정: Single-page includes widgets and excludes Smart Call.
- 확정: Multi-page excludes widgets and includes Smart Call through the common public Call Layer.
- 확정: Both tiers exclude Order.

### ArtiMenu Order

- 확정: Order is dormant and is not sold, advertised as available, or activated by an environment variable.
- 확정: Existing cart, postpay, dashboard, and PG-related code remains compatibility-only for a possible future product review.
- 확정: A future relaunch requires a new explicit product decision and must keep Order outside individual template renderers.

### ArtiMenu Call

- 확정: Call lets a seated table request staff assistance.
- 확정: Smart Call is bundled only with the Multi-page Dining tier.
- 확정: Single-page, Display, and dormant Order surfaces do not expose Smart Call.
- 확정: All Multi-page templates use the same common Call Layer, table QR/session boundary, and store Call dashboard.

### Display

- 확정: Display is excluded from Order.
- 확정: Display is excluded from Call by default.
- 확정: TV/monitor Display routes must not show cart, table order, or staff call UI unless a separate future product contract changes this.

### Custom

- 확정: Custom is outside the standard Order/Call product contract.
- 권장: Custom Order/Call integration may be sold through separate consultation later.
- 미결정: Custom pricing, scope, and implementation boundaries.

## 3. Terms

| Term | Contract |
| --- | --- |
| menu_site | The menu board instance that can receive Order/Call capabilities. |
| capability | Feature permission attached to a menu_site or entitlement. |
| entitlement | Commercial access record proving that a capability is available. |
| table QR | QR tied to a physical table and allowed to create a visit session. |
| public menu QR | QR for read-only menu browsing. It does not grant order or call permission. |
| table session | Server-issued visit session created from a valid table QR. |
| orderPostpay | Capability for unpaid order submission and later in-store payment. |
| orderPrepay | Capability for PG-paid order submission. |
| call | Capability for staff call requests. |
| orderDashboard | Store-side order management surface. |
| tableSessions | Capability and infrastructure for table-based sessions. |

## 4. Service And Entitlement Relationship

Order remains a dormant capability. Smart Call is a Multi-page Dining tier capability and is still enforced independently at the server boundary.

Conceptual capabilities:

- 확정: `orderPostpay`
- 확정: `orderPrepay`
- 확정: `call`
- 확정: `tableSessions`
- 확정: `orderDashboard`

Policies:

- 확정: Postpay and Prepay Order are both product-policy disabled.
- 확정: Smart Call is enabled only by a Multi-page Dining entitlement plus the explicit site runtime allowlist.
- 확정: Capabilities attach to a `menu_site`.
- 확정: Smart Call remains available when switching between Multi-page templates and is removed when the commercial tier changes.
- 확정: If a service type does not support Order/Call, UI must remain hidden even if a capability exists.
- 확정: Personal trial and Single-page Dining do not include Order or Smart Call.
- 확정: Multi-page Dining uses the existing multi product keys and KRW 9,900 monthly price.
- 확정: Smart Call is bundled, not sold as a separate add-on.

Support matrix:

| Service | Order | Call |
| --- | --- | --- |
| Dining Single-page | 미지원 | 미지원 |
| Dining Multi-page | 미지원 | 지원 |
| Display | 미지원 | 기본 미지원 |
| Custom | 별도 계약 | 별도 계약 |

## 5. Order·Call Activation And Service Lifecycle

### Activation Priority

Order or Call visibility and execution must be evaluated in this order:

1. 확정: The `menu_site` service type supports the feature.
2. 확정: The base menu service entitlement is active.
3. 확정: The Order or Call entitlement is active.
4. 확정: The menu board is published and available for use.
5. 확정: Store operation settings are ON.
6. 확정: Current time satisfies order acceptance or call operation conditions.
7. 확정: A valid table session exists.
8. 확정: Current device context satisfies the feature policy.

If an upper condition fails, lower conditions must not expose or execute the feature.

### Base Menu Service End

- 확정: A new table session can be issued only while the base menu service is active.
- 확정: During cancel-at-period-end state, Order and Call can continue until the already paid service period ends.
- 확정: When the actual service period ends, new table sessions, new orders, and new calls are blocked.
- 확정: During retention, `pending_delete`, or `deleted` states, new Order and Call execution is not allowed.
- 확정: Existing order, payment, and call history is governed separately from menu content deletion by operations, settlement, and dispute policies.

### Order·Call Add-On End

- 확정: If the base menu service remains active but Order entitlement ends, menu browsing remains available while cart and new order creation are blocked.
- 확정: If Call entitlement ends, the Call button and new call creation are blocked.
- 확정: Order and Call are evaluated independently.
- 확정: Ending one feature does not automatically end the other.
- 확정: Existing order or call history is not immediately deleted only because the add-on ended.

### In-Progress State

- 확정: After entitlement or store operation setting turns OFF, the system does not accept new orders or calls.
- 확정: Orders and calls already received must remain visible in store management surfaces for review and completion.
- 확정: If state changes while a customer is paying or submitting an order, the server makes the final decision and clearly returns whether the order was accepted.

### Server Authority

- 확정: The server does not trust client-provided entitlement, table id, price, or orderability.
- 확정: The server revalidates `menu_site`, entitlement, table session, menu state, and prices.
- 확정: Order totals are recalculated on the server from menu and option prices.

## 6. Supported Service And Device Matrix

### Mobile

- 확정: Mobile is the primary device for real customer ordering.
- 확정: Cart can be shown only when a valid table session exists and Order is available.
- 확정: Postpay and Prepay can be submitted from mobile when enabled.
- 확정: Mobile uses a common sticky header for language, table context, Call, and cart.

### Tablet

- 확정: Tablet can browse the public menu.
- 확정: Direct order/payment is not provided by default.
- 확정: Call can be shown on tablet when a valid table session exists.
- 권장: If Order is enabled, tablet may show a "order on mobile" QR guide.

### PC

- 확정: PC can browse the public menu.
- 확정: Direct order/payment is not provided by default.
- 확정: Call can be shown on PC when a valid table session exists.
- 권장: If Order is enabled, PC may show a mobile order URL QR modal.

Device policy:

- 확정: Screen width alone must not grant mobile order permission.
- 확정: A valid table session is required for Order/Call action.
- 확정: Narrowing a desktop browser window must not unlock customer order UI.
- 권장: Device policy should consider viewport, input environment, and server-validated session state rather than user agent alone.

## 7. Common Order/Call UI

Mobile public menu header:

```text
┌──────────────────────────────────┐
│ [Language]   Store · Table 3   [Call] [Cart 2] │
└──────────────────────────────────┘
```

Layout:

- 확정: Left side is language switcher.
- 확정: Center is store name or table number.
- 확정: Right side contains Call and cart actions.
- 확정: Cart displays quantity badge.
- 확정: Header is sticky on mobile.
- 확정: Header accounts for iPhone safe area.
- 확정: Menu content must be offset so the header does not cover content.

Visibility:

- 확정: Language is shown only when two or more locales are enabled.
- 확정: Call is shown only when all are true:
  - Call entitlement active.
  - Valid table session exists.
  - Store Call setting is ON.
  - Current service and template support Call.
- 확정: Cart is shown only when all are true:
  - Order entitlement active.
  - Device is allowed for mobile ordering.
  - Valid table session exists.
  - Store order acceptance is ON.
  - Current time is orderable.
  - Current service supports Order.

Template integration:

- 확정: CafeA, Mocha Forest, future top-brand, future center-brand, and Multi-page must use the same common header.
- 확정: Template components must not implement their own Call or cart logic.
- 확정: Template renderers only render public menu content below the common layer.

Implementation status (2026-08-06):

- The shared mobile header shell is implemented in `PublicMenuExperienceShell` outside template renderers.
- The shell remains `locked` by default, so current public routes do not expose Order or Call before server-validated entitlements and table sessions exist.
- A development-only `orderCallQa` fixture verifies active, Call-only, Order-only, and no-session visibility without DB writes.
- Call and cart controls are intentionally disabled presentation shells until table session and action APIs are implemented.
- Display bypasses the shared shell and remains excluded.

## 8. Public Menu QR And Table QR

### Public Menu QR

- 확정: Public menu QR is read-only.
- 확정: It opens the public menu route.
- 확정: It does not grant Order or Call permission.
- 확정: General slug URL access must not create a table session automatically.

### Table Order QR

- 확정: Table QR identifies a physical table.
- 확정: Table QR can create a visit session.
- 확정: Table QR can enable Order and/or Call if entitlements and store settings allow it.
- 확정: Table QR must not be confused with public menu QR.

Fixed printed QR:

- 확정: QR contains a public table token.
- 확정: The printed QR does not need to be regenerated for each visit.
- 확정: Each table has a unique token.
- 확정: Token identifies a table without exposing raw internal IDs.
- 확정: Only a SHA-256 token hash is stored in the database.
- 확정: The raw token is delivered only when a table is created or its token is rotated.
- 확정: If the original QR file is lost, rotating the token creates a new downloadable QR and invalidates the old printed QR.
- 확정: A menu site can have at most 100 non-archived physical tables.

## 9. Visit Session Contract

- 확정: A visit session is issued by the server after a valid table QR is opened.
- 확정: A visit session expires after at most 12 hours.
- 확정: The raw visit-session token is stored in an HttpOnly, Secure, SameSite=Lax browser cookie.
- 확정: Only the SHA-256 visit-session token hash is stored in the database.
- 확정: Order and Call actions require a valid session.
- 확정: If the session expires, the customer must re-authenticate by rescanning QR or refreshing through a valid session flow.

Security:

- 확정: Raw `menu_site_id` plus table number is insufficient for permission.
- 확정: Guessable sequential numbers must not grant order permission.
- 확정: Public table token must be sufficiently random.
- 확정: Raw table and visit-session tokens are never stored in DB; SHA-256 hashes are stored instead.
- 확정: Session validation happens on the server.
- 확정: URL query manipulation must not switch a customer to another table.
- 확정: Session must match table and menu_site.
- 확정: Disabled or deleted tables must not create new sessions.
- 확정: Disabling, archiving, or rotating a table token revokes its active visit sessions.
- 확정: A visit session is bound to a hashed browser user-agent context as an additional theft-reduction signal.
- 확정: During order submission, the server determines table identity. Client-provided table identity is not trusted.

Implementation status (2026-08-06):

- The schema foundation defines `menu_tables` and `table_visit_sessions` as server-only, RLS-enabled tables.
- The migration enforces the 100-table limit and 12-hour maximum session lifetime at the database boundary.
- The Production migration and generated type refresh are complete and must not be reapplied.
- Owner/Manager table create, update, disable, token rotation, and archive are implemented behind the default-off `TABLE_MANAGEMENT_ENABLED` runtime gate.
- Only the token hash is persisted; the raw token and table QR path are returned once after create or rotation and are excluded from table list DTOs.
- The runtime fails closed outside active Business Basic sites using a Multi-page Dining template. The Multi-page bundle decision is complete; Production site activation remains a separate environment operation.
- Public `/table/[token]` entry is separated from the read-only menu slug route and verifies the active table hash, public menu lifecycle, Business Basic plan, and Multi-page Dining capability on the server.
- A visit-session raw token is delivered only as a Secure, HttpOnly, SameSite=Lax cookie with a database-enforced maximum lifetime of 12 hours.
- Session reuse validates menu-site identity, active table state, expiry, revocation, and the hashed User-Agent context; last-seen writes are throttled.
- A valid existing session can provide table context to the common mobile header. Smart Call additionally requires the Multi-page tier and explicit runtime allowlist; Order remains product-policy disabled.
- The table-management one-time delivery panel renders the table URL into a PNG entirely in the browser; it does not send the raw table token to a separate QR API.
- The full runtime remains behind the default-off `TABLE_MANAGEMENT_ENABLED` gate, so no Production session issuance is activated by this code change.

## 10. Postpay Order

Flow:

```text
QR scan
→ menu browse
→ add items to cart
→ submit order
→ order appears in store dashboard
→ staff takes payment through existing POS/card terminal/cash
→ staff marks manual payment complete in ArtiMenu
```

Policies:

- 확정: V1 launches Postpay before Prepay and does not initiate PG payment.
- 현재 보류: Postpay Order is not sold or activated. `tableSessions` belongs to the Multi-page Smart Call bundle.
- 확정: V1 carts are device-specific within a validated table visit session and are not shared automatically between phones.
- 확정: V1 allows at most 20 cart lines, 50 total units, 20 units per line, and 300 characters of order requests.
- 확정: Customer submits order without PG payment.
- 확정: New postpay order starts with `payment_status=unpaid`.
- 확정: Real payment happens through store POS, card terminal, or cash.
- 확정: Staff can mark `manual_paid`.
- 확정: ArtiMenu is not the card authorization party for postpay.
- 확정: Store payment record and ArtiMenu order state are separate.
- 권장: Manual payment completion should be auditable.

Implementation status (2026-08-06):

- The shared mobile shell owns a device-local cart scoped to a hashed table-visit session identifier; template renderers do not implement cart logic.
- The cart supports order-only option groups, quantity, 20-line/50-unit/20-per-line limits, and a 300-character request.
- The POST route revalidates same-origin, payload limits, HttpOnly table session, public lifecycle, Business Basic access, and explicit site allowlisting.
- The proposed `submit_postpay_order` RPC revalidates session, table, menu orderability, sold-out state, option rules, and current prices inside one short transaction before creating immutable snapshots.
- A client request UUID is reused for retries so the database returns the existing order instead of creating a duplicate.
- Production remains fail-closed unless both `POSTPAY_ORDER_ENABLED=true` and an explicit `POSTPAY_ORDER_ALLOWED_SITE_IDS` match are present. These are temporary activation safeguards, not a replacement for the final product entitlement mapping.
- The RPC migration was applied once to Production and generated types were refreshed on 2026-08-06. Do not reapply it.

## 11. Prepay Order

Flow:

```text
QR scan
→ menu browse
→ add items to cart
→ PG payment
→ server payment verification
→ confirmed order creation
→ order appears in store dashboard
```

Policies:

- 확정: Store business is the merchant of record for PG contract.
- 확정: ArtiMenu provides technical payment integration.
- 확정: Merchant/channel configuration is required per store.
- 확정: Payment secrets are server-only.
- 확정: Success screen alone is insufficient; server lookup and/or webhook verification is required.
- 확정: Idempotency is mandatory.
- 미결정: PG provider.
- 미결정: PG fees.
- 미결정: Refund, partial cancel, and settlement details.

Store settings:

- 확정: Postpay ON/OFF.
- 확정: Prepay ON/OFF.
- 확정: Both can be ON.
- 확정: If both are OFF, Order is inactive.
- 확정: Call has a separate ON/OFF setting.

## 12. Menu And Option Orderability Contract

Public visibility and orderability are separate.

Examples:

| State | Public menu | Cart |
| --- | --- | --- |
| `visible=true`, `orderable=false` | Visible | Cannot add |
| `is_sold_out=true` | Visible with sold-out state | Cannot add |
| `visible=false` | Hidden | Cannot add |

Future Order concepts:

- 확정: `orderable`
- 확정: sold-out blocks ordering.
- 권장: option groups.
- 권장: option values.
- 권장: quantity limits.
- 권장: tax information.
- 권장: order availability schedule.

Important boundary:

- 확정: Existing Basic display price options are not automatically the same as order option groups.
- 확정: HOT/ICE price columns may be display-only structure.
- 확정: Real order options need required selection, additional price, min/max selection, inventory, and POS mapping.
- 확정: V1 uses separate order option groups and values with required/min/max selection and non-negative KRW price deltas.
- 비범위: V1 inventory and POS mapping remain disabled until separate contracts exist.

## 13. Order Status

Order status examples:

- 확정: `received` - order received.
- 확정: `accepted` - store confirmed before cooking.
- 확정: `cooking` - preparing.
- 확정: `ready` - ready for pickup/serving.
- 확정: `served` - served/completed.
- 확정: `cancelled` - order cancelled.

Policies:

- 확정: Order status and payment status are separate.
- 확정: Cooking can be complete while payment is still unpaid.
- 확정: Payment can be complete while cooking has not started.
- 확정: Order cancellation and payment cancellation are separate.
- 확정: Historical orders must preserve item name, price, and option snapshot.

## 14. Payment Status

Payment status examples:

- 확정: `unpaid` - no ArtiMenu-confirmed payment.
- 확정: `manual_paid` - staff marked external POS/card/cash payment as complete.
- 확정: `paid` - PG or otherwise verified automated payment.
- 확정: `cancelled` - payment cancelled.
- 확정: `refunded` - full refund complete.
- 미결정: `partially_refunded` details.

Policies:

- 확정: Payment state must not be collapsed into order state.
- 확정: Prepay payment completion must be idempotent.
- 확정: If payment succeeds but order creation fails, a recovery contract is required.

## 15. Call Contract

Initial call types:

- 확정: Staff call.
- 비범위(MVP): Water request.
- 비범위(MVP): Extra plate request.
- 비범위(MVP): Order question.
- 비범위(MVP): Other request.

MVP policy:

- 확정: MVP exposes only the Staff call preset.
- 비범위(MVP): Per-store preset enable/disable settings.

Flow:

```text
valid table session
→ Call button
→ select call type
→ create call
→ store call dashboard
→ staff acknowledge
→ staff complete
```

Call status:

- 확정: `pending`
- 확정: `acknowledged`
- 확정: `completed`
- 확정: `cancelled`

Policies:

- 확정: Rate limit repeated calls from the same table.
- 확정: An unresolved `pending` or `acknowledged` staff call is returned instead of creating a duplicate.
- 확정: After a call is completed or cancelled, the same visit session has a two-minute cooldown.
- 확정: A table visit session can create at most ten calls per rolling hour.
- 확정: Only store staff/owner can mark calls complete.
- 확정: Owner, Manager, and Order staff with `call.manage` may acknowledge and complete calls.
- 확정: Staff state transitions are only `pending → acknowledged → completed`.
- 확정: A customer may cancel only their own session's `pending` call. An acknowledged call cannot be customer-cancelled.
- 확정: A customer cannot view another table's calls.
- 확정: Call-only configuration is allowed.
- 미결정: Notification talk, push, and sound behavior.

## 16. Admin Surface Boundaries

### Menu Editor

- 확정: Menu data.
- 확정: Sold-out.
- 확정: Orderable summary or simple item orderability controls.
- 확정: Order/Call activation summary.
- 확정: Detailed order management is not inside the menu editor.

### Order Dashboard

- 확정: Realtime or near-realtime order list.
- 확정: Order detail.
- 확정: Order status changes.
- 확정: Manual payment completion.
- 확정: Cancellation.
- 권장: Browser receipt.
- 권장: Filters and daily summary.

### Call Dashboard

- 확정: Pending calls.
- 확정: Acknowledge.
- 확정: Complete.
- 확정(MVP): Recent table-level call history, limited to the latest 100 calls.
- 확정(MVP): Near-realtime polling every 15 seconds; database Realtime publication is not required.

### Settings

- 확정: Order ON/OFF.
- 확정: Postpay ON/OFF.
- 확정: Prepay ON/OFF.
- 확정: Call ON/OFF.
- 권장: Order acceptance hours.
- 권장: Call types.
- 권장: Table management.
- 권장: QR issuing.

Implementation status (2026-08-06):

- The store dashboard is implemented as a separate `/mypage/menus/[menuId]/orders` surface and never inside a menu renderer or editor.
- Reads and mutations reauthenticate and reauthorize `order.read`, `order.manage`, `order.cancel_unpaid`, and `payment.manual` at the server boundary.
- Call MVP uses the same template-independent public entry layer and a separate `/mypage/menus/[menuId]/calls` dashboard.
- The database contract is server-only with forced RLS, service-role-only grants, unresolved dedupe, a two-minute cooldown, and ten calls per session per hour.
- Customer create/cancel routes revalidate the HttpOnly table session and public Business Basic lifecycle. Staff mutations reauthenticate `call.manage` and record the acting user.
- `CALL_ENABLED` plus an explicit `CALL_ALLOWED_SITE_IDS` allowlist fail closed by default. The migration and Production activation remain separate human-approved operations.
- Status changes are forward-only conditional updates: `received` → `accepted` → `cooking` → `ready` → `served`.
- Cancellation is limited to unpaid, unserved orders with a required 1–500 character reason.
- Manual card-terminal and cash completion record `manual_paid`, the external method, timestamp, and authenticated actor; ArtiMenu does not perform card authorization.
- The dashboard refreshes every 15 seconds and prints snapshot-based browser receipts.
- The dashboard treats the first loaded ID set as a quiet baseline, then surfaces newly arrived orders or pending calls through an in-app banner and document-title count during the same browser session.
- Arrival alerts do not request browser notification permission, play sound, persist on the server, or imply an external messaging channel.
- Production remains fail-closed unless `ORDER_DASHBOARD_ENABLED=true` and the menu site is explicitly included in `ORDER_DASHBOARD_ALLOWED_SITE_IDS`.

### Subscription And Billing

- 확정: Smart Call follows the Multi-page Dining subscription lifecycle and is not purchased as a separate add-on. Dormant Order has no purchase, cancellation, or restore surface.
- 확정: Subscription management buttons must not be mixed into live order operations.

## 17. Roles And Permissions

### Customer

- 확정: View public menu.
- 확정: Order only with a valid table session and active Order capability.
- 확정: Call only with a valid table session and active Call capability.
- 확정: View own current cart/order result.

### Menu Site Owner

- 확정: Manage menu and table settings.
- 확정: Manage orders and calls.
- 확정: Mark manual payment complete.
- 확정: Change store Order/Call settings.

### Staff

- 권장: Future staff role.
- 권장: Can view orders/calls and change operational statuses.
- 미결정: Exact settings/payment permissions.

### ArtiMenu Admin

- 확정: Support-oriented read access.
- 권장: Forced cancellation or data changes require audit logs.
- 미결정: Detailed admin intervention workflow.

## 18. Template Integration Contract

Supported templates use the same interface.

Templates may know:

- 확정: Content offset needed for common mobile header.
- 확정: Whether mobile Order header is active.
- 권장: Anchor for PC/tablet mobile-order QR guide overlay.
- 확정: Menu item orderable/sold-out display state.

Templates must not know:

- 확정: Cart state management.
- 확정: Table session verification.
- 확정: Payment logic.
- 확정: Call creation API.
- 확정: Order submission API.
- 확정: PG merchant secret.
- 확정: Entitlement decision.

Policies:

- 확정: Order/Call render outside template renderer, in a common public menu shell.
- 확정: Display renderer does not receive the Order/Call shell.
- 확정: Multi-page reuses the same public Order/Call shell.
- 확정: Adding a new template must not require reimplementing cart or Call UI.

## 19. Security And Consistency Requirements

- 확정: Duplicate order submission prevention.
- 확정: Payment idempotency.
- 확정: Table session validation.
- 확정: Rate limiting.
- 권장: Audit logs for operational status and manual payment changes.
- 확정: Order item snapshot.
- 확정: Server time is authoritative.
- 권장: Store timezone is considered for order availability.
- 권장: Network retry strategy.
- 권장: Polling fallback if realtime updates fail.
- 확정: Customer-facing UI must clearly show whether an order was submitted.
- 확정: The UI must not show success for an order that was not accepted by the server.
- 확정: A recovery contract is needed when payment succeeds but order creation fails.
- 확정: Personal information and payment secrets must not be exposed to clients.

## 20. Non-Scope

- 비범위: Delivery order.
- 비범위: Pickup order MVP.
- 비범위: POS integration.
- 비범위: KakaoTalk/push/sound notification pricing.
- 비범위: PG provider selection.
- 비범위: Refund and partial refund implementation.
- 비범위: Custom product standardization.
- 비범위: Display order/call UI.

## 21. Open Decisions

Do not infer these in implementation:

- 미결정: Order/Call pricing.
- 미결정: `product_key`.
- 확정: Smart Call has no separate trial; it follows the Multi-page Dining subscription. Dormant Order has no trial.
- 미결정: Final PG provider.
- 미결정: PG fee policy.
- 미결정: Settlement cycle.
- 미결정: Maximum staff count.
- 미결정: Refund and partial refund details.
- 미결정: KakaoTalk notification pricing.
- 미결정: POS integration vendors.
- 미결정: How customers can view existing order status after a table session expires.
- 미결정: Table move, merge, and split policy when an order is already in progress.

## 22. Implementation Sequence

1. 확정: Product contract document.
2. 확정: Common Order/Call entry slots in locked state.
3. 확정: Top-brand template.
4. 확정: Center-brand template.
5. 확정: Real Multi-page template.
6. 확정: Table/QR/session DB design.
7. 확정: Table QR and visit session.
8. 확정: Mobile cart.
9. 확정: Postpay order submission.
10. 확정: Order management dashboard.
11. 확정: Manual payment completion.
12. 확정: Browser receipt.
13. 확정: Call MVP.
14. 확정: Prepay PG onboarding.
15. 확정: Prepay payment, webhook, cancel.
16. 확정: Sales management and notifications.
17. 확정: Cross-template integration QA.

## 23. Product QA Completion Criteria

### Order

- 확정: Order possible only from valid table QR/session.
- 확정: Public menu QR cannot order.
- 확정: Real cart/order available only on mobile policy-approved contexts.
- 확정: PC/tablet show mobile order QR guide instead of direct order.
- 확정: Sold-out and non-orderable items are blocked.
- 확정: Order snapshot is stored.
- 확정: Duplicate submission is blocked.
- 확정: Postpay order state and manual payment state are separate.
- 확정: Prepay payment success and order creation are consistent.
- 확정: Owner order dashboard works.
- 확정: Order entitlement remains after template change.
- 확정: CafeA, Mocha Forest, top-brand, center-brand, and Multi-page work through the same layer.
- 확정: Display has no Order UI.

### Call

- 확정: Call possible only from valid table session.
- 확정: Call-only configuration works without Order.
- 확정: Duplicate call is prevented or rate-limited.
- 확정: Staff/owner can acknowledge and complete calls.
- 확정: A customer cannot see another table's calls.
- 확정: All supported templates use the same Call layer.
- 확정: Display has no Call UI.

## 24. Sales Summary Boundary

- 확정: The first sales dashboard is an operational summary, not a PG settlement or tax report.
- 확정: Order count is grouped by order creation time in `Asia/Seoul`.
- 확정: Collected amount is grouped by payment completion time in `Asia/Seoul` and includes only the current `manual_paid` or `paid` state.
- 확정: Cancelled and refunded payment states are excluded from collected amount.
- 확정: Menu ranking uses immutable order item names and quantities from currently completed-payment orders.
- 확정: Payment-method totals separate manual card, manual cash, and PG completion records.
- 확정: Cancelled and currently unpaid order counts use orders created in the selected Korean calendar month and are not treated as collected sales.
- 확정: Owner and Manager may access aggregate sales through `sales.read`; Order Staff and Viewer may not.
- 확정: The server reauthorizes `sales.read` before using the server-only database client and returns only aggregate DTOs.
- 확정: The sales entry stays behind the existing default-off Order Dashboard runtime and explicit site allowlist until the product entitlement is finalized.
- 확정: No schema, RLS, Production environment, settlement, or customer-data mutation is part of this milestone.
