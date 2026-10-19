# Menu order controls and cart UI — 2026-10-19

## Approved behavior

- REAL MATCHA scroll-test PC/tablet representative controls show language only; the table label remains in the call dialog and is now also passed into the common cart header. The actual server-side table/order context is unchanged.
- One-page mobile Call only: globe / table / bell, one bottom Call button. Order only: globe / table / cart, one bottom Order button. Both: globe / table / cart, bottom Order then Call side by side. The existing 56px row, 24px icons, menu fonts, 20/24/48 reading rhythm and bottom content reservation remain.
- Dining A/B use the same mobile feature combinations. Its own content engine and desktop controls remain; reserve one action row and keep page navigation above it.
- Entry copy is 주문하기; the review screen is 장바구니. Entry opens the existing cart and never submits an order directly.
- Empty PC/tablet cart is a centered, bounded 400px popup with a dim backdrop. Filled carts remain bounded scrollable dialogs. Explicit mobile presentation (including 820px QR/foldable widths) keeps its full-height cart.
- Cart/options use Pretendard explicitly, body weight 400, supporting controls 500 and headings/prices up to 600. The previous font-black (900) and excessive bold classes were removed. The cart header has a simple back arrow with no circular fill/shadow; the empty-state cart icon has no decorative circle.
- Table label is displayed in empty and filled cart headers; quantity/options, storage, merchant opt-ins, backend payload/authorization, idempotency and disabled prepay behavior remain unchanged. No Production data/SQL/payment changes.

## Validation

- 643 unit/contract tests; independent TypeScript, changed-file ESLint, Production build and whitespace checks passed.
- `qa-menu-cart-ui.mjs`: 33 conditions across PC, both tablet orientations, 320/390/430px phones and forced mobile at 820px; three feature combinations, dialog table labels, popup dimensions, back arrow, actual computed Pretendard/weight <=600, empty and filled carts, quantity/add, visible bottom notices, Dining A/B header/dock/navigation separation. Zero runtime errors and actual API writes.
- Existing order/layout matrix: 52 passed, including option editing, quantity, cart persistence/clear, simulated postpay/status progression, disabled prepay and Dining A/B. Updated script uses the back action and mobile cart-only header when both features are on.
- Existing scroll-control matrix: 27 passed; fixed PC/tablet actions and mobile original-vs-copy style parity remain. Desktop test now requires no table label in the representative controls.
- Original seven-template regression: 112 passed across devices/features/locales, no failures/runtime errors. Display smoke: three devices retained their separate fitting engine and had no cart/dock UI.

Evidence: `/private/tmp/menu-cart-ui/report.json`, `/private/tmp/cart-ui-review/`, `/private/tmp/cart-ui-order/`, `/private/tmp/cart-ui-controls/`, `/private/tmp/cart-ui-regressions.log`, `/private/tmp/cart-ui-build.log`. Browser tests block public-menu writes and use preview demos only.
