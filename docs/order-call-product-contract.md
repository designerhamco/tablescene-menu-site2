# MenuLink Order·Call Product Contract

Last updated: 2026-08-06

## 1. Purpose

This document defines the product contract for future MenuLink Order and Call features before implementation.

The goal is to keep Order and Call independent from individual menu templates while making their relationship to Basic, Multi-page, table QR, checkout, store operations, and permissions explicit.

Status labels:

- 확정: Product contract for the next implementation steps.
- 권장: Preferred direction, but details may be refined during implementation.
- 미결정: Must not be invented in code without a product decision.
- 비범위: Explicitly outside this contract.

## 2. Product Definitions

### MenuLink Basic / Multi-page

- 확정: Basic and Multi-page are the public digital menu products.
- 확정: They provide menu names, prices, descriptions, images, multilingual content, sold-out state, time sales, widgets, and public menu rendering.
- 확정: They must work without Order or Call.
- 확정: Multi-page uses a dedicated menu presentation engine, but Order and Call must integrate through the same common layer used by Basic One-page.

### MenuLink Order

- 확정: Order is an add-on layer attached to a public menu.
- 확정: Order is not a separate template.
- 확정: All supported templates must use the same common Order Layer.
- 확정: Cart and order submission must not be implemented separately inside each template renderer.

### MenuLink Call

- 확정: Call lets a seated table request staff assistance.
- 확정: Call can be enabled independently of Order.
- 확정: Call-only usage is allowed.
- 확정: All supported templates must use the same common Call Layer.

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

Order and Call are separate capability/entitlement concepts, not template features.

Conceptual capabilities:

- 확정: `orderPostpay`
- 확정: `orderPrepay`
- 확정: `call`
- 확정: `tableSessions`
- 확정: `orderDashboard`

Policies:

- 확정: Postpay Order and Prepay Order can be enabled separately.
- 확정: Call can be enabled independently from Order.
- 확정: Capabilities attach to a `menu_site`.
- 확정: Capabilities remain when the template changes.
- 확정: If a service type does not support Order/Call, UI must remain hidden even if a capability exists.
- 확정: Personal trial does not include Order or Call.
- 확정: Order and Call are business-oriented features.
- 미결정: Actual `product_key` values.
- 미결정: Pricing.
- 미결정: Whether Order and Call are sold individually, bundled, or plan-gated.

Support matrix:

| Service | Order | Call |
| --- | --- | --- |
| Basic One-page | 지원 예정 | 지원 예정 |
| Basic Multi-page | 지원 예정 | 지원 예정 |
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
- The runtime currently fails closed outside active Business Basic sites using a Basic template. Product-key mapping, bundling, and Production gate activation remain unresolved product decisions.
- Public `/table/[token]` entry is separated from the read-only menu slug route and verifies the active table hash, public menu lifecycle, Business Basic plan, and Basic template on the server.
- A visit-session raw token is delivered only as a Secure, HttpOnly, SameSite=Lax cookie with a database-enforced maximum lifetime of 12 hours.
- Session reuse validates menu-site identity, active table state, expiry, revocation, and the hashed User-Agent context; last-seen writes are throttled.
- A valid existing session can provide table context to the common mobile header, while Order and Call remain disabled until their entitlements and store-operation contracts are implemented.
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
→ staff marks manual payment complete in MenuLink
```

Policies:

- 확정: Customer submits order without PG payment.
- 확정: New postpay order starts with `payment_status=unpaid`.
- 확정: Real payment happens through store POS, card terminal, or cash.
- 확정: Staff can mark `manual_paid`.
- 확정: MenuLink is not the card authorization party for postpay.
- 확정: Store payment record and MenuLink order state are separate.
- 권장: Manual payment completion should be auditable.

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
- 확정: MenuLink provides technical payment integration.
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
- 미결정: Final order option schema.

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

- 확정: `unpaid` - no MenuLink-confirmed payment.
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
- 권장: Water request.
- 권장: Extra plate request.
- 권장: Order question.
- 권장: Other request.

MVP policy:

- 권장: Start with a small preset list instead of many call types.
- 권장: Store can enable/disable preset call types.

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
- 권장: If there is an unresolved call from the same table, duplicate call creation may be blocked.
- 확정: Only store staff/owner can mark calls complete.
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
- 권장: Table-level call history.

### Settings

- 확정: Order ON/OFF.
- 확정: Postpay ON/OFF.
- 확정: Prepay ON/OFF.
- 확정: Call ON/OFF.
- 권장: Order acceptance hours.
- 권장: Call types.
- 권장: Table management.
- 권장: QR issuing.

### Subscription And Billing

- 확정: Order/Call add-on purchase, cancellation, and restore belong in subscription/billing surfaces.
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

### MenuLink Admin

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
- 미결정: Whether Order/Call has a free trial.
- 미결정: Final PG provider.
- 미결정: PG fee policy.
- 미결정: Settlement cycle.
- 미결정: Maximum staff count.
- 미결정: Maximum items per order.
- 미결정: Exact call rate limit.
- 미결정: Refund and partial refund details.
- 미결정: KakaoTalk notification pricing.
- 미결정: POS integration vendors.
- 미결정: Whether multiple phones connected to the same table share one cart or keep device-specific carts.
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
