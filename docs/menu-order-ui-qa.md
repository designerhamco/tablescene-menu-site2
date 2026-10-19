# Menu order controls and cart UI — 2026-10-19

## Approved behavior

- REAL MATCHA scroll-test PC/tablet representative controls show language only; the table label remains in the call dialog and is now also passed into the common cart header. The actual server-side table/order context is unchanged.
- One-page mobile Call only: globe / table / bell, one bottom Call button. Order only: globe / table / cart, one bottom Order button. Both: globe / table / cart, bottom Order then Call side by side. The existing 56px row, 24px icons, menu fonts, 20/24/48 reading rhythm and bottom content reservation remain.
- Dining A/B use the same mobile feature combinations. Its own content engine and desktop controls remain; reserve one action row and keep page navigation above it.
- Entry copy is 주문하기; the review screen is 장바구니. Entry opens the existing cart and never submits an order directly.
- Empty PC/tablet cart is a centered, bounded 400px popup with a dim backdrop. Populated carts subsequently changed to full-viewport pages on every device; only the empty PC/tablet cart keeps the popup. The white full-page shell has no rounded outer frame or dim backdrop; its reading content stays centered and scrollable. This supersedes the initial filled-dialog behavior. Explicit mobile presentation (including 820px QR/foldable widths) keeps its full-height cart.
- Cart/options use Pretendard explicitly, body weight 400, supporting controls 500 and headings/prices up to 600. The previous font-black (900) and excessive bold classes were removed. The cart header has a simple back arrow with no circular fill/shadow; the empty-state cart icon has no decorative circle.
- Table label is displayed in empty and filled cart headers; quantity/options, storage, merchant opt-ins, backend payload/authorization, idempotency and disabled prepay behavior remain unchanged. No Production data/SQL/payment changes.

## Validation

- 643 unit/contract tests; independent TypeScript, changed-file ESLint, Production build and whitespace checks passed.
- `qa-menu-cart-ui.mjs`: 33 conditions across PC, both tablet orientations, 320/390/430px phones and forced mobile at 820px; three feature combinations, dialog table labels, popup dimensions, back arrow, actual computed Pretendard/weight <=600, empty and filled carts, quantity/add, visible bottom notices, Dining A/B header/dock/navigation separation. Zero runtime errors and actual API writes.
- Existing order/layout matrix: 52 passed, including option editing, quantity, cart persistence/clear, simulated postpay/status progression, disabled prepay and Dining A/B. Updated script uses the back action and mobile cart-only header when both features are on.
- Existing scroll-control matrix: 27 passed; fixed PC/tablet actions and mobile original-vs-copy style parity remain. Desktop test now requires no table label in the representative controls.
- Original seven-template regression: 112 passed across devices/features/locales, no failures/runtime errors. Display smoke: three devices retained their separate fitting engine and had no cart/dock UI.

Evidence: `/private/tmp/menu-cart-ui/report.json`, `/private/tmp/cart-ui-review/`, `/private/tmp/cart-ui-order/`, `/private/tmp/cart-ui-controls/`, `/private/tmp/cart-ui-regressions.log`, `/private/tmp/cart-ui-build.log`. Browser tests block public-menu writes and use preview demos only.

## Filled-cart full-page correction — 2026-10-19

User clarified that PC/tablet should show a full page after products are added. Only the empty state remains the small popup. The existing cart state, table label, Pretendard, back action, options, quantities and checkout contract remain. Browser QA now asserts filled cart x/y = 0, dimensions = actual viewport, white backdrop and zero outer radius; back/reopen preserves items and deleting the last product restores the empty popup.

Correction verification: 643 unit/contract tests, independent TypeScript, changed QA script ESLint, whitespace check and Production build passed. Updated UI matrix 33/33, existing order interaction matrix 8/8, Dining A/B populated-cart checks 2/2 passed. Filled dialogs matched actual 1440×900, 1180×820 and 820×1180 viewports with no dim menu border; forced mobile 820px retained its full view. Evidence: `/private/tmp/full-cart-ui/`, `/private/tmp/full-cart-order/`, `/private/tmp/full-cart-dining.json`, `/private/tmp/full-cart-build.log`. No real API writes.

## Menu palette and operational UI — 2026-10-19

- Menu operational UI has its own scoped CSS module, independent of site pills and saved menu-content fonts. Call/options/cart use Pretendard 400–600, action corners 8px and sheet corners 16px. Call title is 22px/600, status copy 16px/500. Menu content type roles, spacing, layout, gallery and Hero remain unchanged.
- Order fill follows the rendered store-title color (saved brand role for logos; Dining retains its cover brand when changing pages). Text prefers the lightest actual menu paper surface. Call uses that surface with matching brand text/outline. If those foregrounds are unreadable, choose another menu ink or black/white; keep the Order fill. A low-contrast Order boundary receives the readable foreground outline. Never sample photos or official site colors. The palette observer updates mounted controls and copies current colors into portalled cart/options.
- Common dialog handles are 64×2px; close controls have a plain dark X and transparent 44px target. Call completion retains a pale gray surface with 12px corners and no outline; cancel is white with a dark visible outline and 8px corners. Call selection rows are separated by rules instead of outlined rounded cards. Options groups and the postpay summary also use dividers. Existing Call request/cancel state, body locking, Aube motion/drag, table context and checkout contracts are retained.
- Empty desktop/tablet cart stays a 400px popup; a populated cart still fills the actual viewport. Mobile feature ordering and disabled prepay remain unchanged. No schema, merchant data, real call/order or payment writes are part of this change.

Verification: 648 unit/contract tests, independent TypeScript, changed-file ESLint, Production build and whitespace checks. Existing 33 cart/UI, 27 placement/parity, 8 mocked order interactions and 112 seven-template device/locale regression cases pass. `qa-menu-interaction-theme.mjs` checks 12 template/device combinations: computed palette colors, live brand edits, Pretendard/weight/size, 8px action corners, 64×2px handles, unfilled X, borderless completion panel, dark cancel outline, option selection and full-page cart. Public-menu API writes are blocked in browser tests.

Evidence: `/private/tmp/menu-interaction-theme/report.json`, `/private/tmp/menu-theme-browser.log`, `/private/tmp/menu-theme-cart.log`, `/private/tmp/menu-theme-placement.log`, `/private/tmp/menu-theme-order.log`, `/private/tmp/menu-theme-regression.log`, `/private/tmp/menu-theme-build.log`.
