# Default design and switch rollout — 2026-10-19

## Approved baseline and first review boundary

Start from Production merge `a6d174c` (PR #252), including spacing restoration #251 and stable fill reading #252. `docs/basic-menu-scroll-policy.md` is authoritative for REAL MATCHA. Do not restore the earlier gap enlargement, vertical centering or pagination. Mobile remains the independent 20/24/48 reading contract.

The user approved the overall sequence but explicitly wants **one Basic and one Dining neutral design reviewed before extending the remaining four**. First review: first-column Basic and full-page Dining. `/design-review` links to isolated, noindex, simulated previews using the existing renderers and neutral sample data. These are not purchasable presets and do not change saved customer menus. Other six existing Basic skins remain on their original renderers until structure-specific rollout and regression evidence exists.

## Approved product policy

- One menu board per subscription. Basic and Dining remain separate services.
- Standard access allows the service's neutral designs across all its layouts; design access adds every designer preset in that service. It does not unlock operational features or unlimited menu boards.
- Basic has four layouts; Dining has two. `lib/menu-design-policy.ts` separates service, layout, appearance and access. Its pure access predicate is not yet an ownership/payment/publication gate.
- `lib/menu-plan-pricing.ts` separates editable amounts from the policy: Basic regular/early-bird 5900/4900 KRW; Dining 8900/6900; designer add-on 1900 monthly, VAT inclusive. New offers can change pricebook versions; historical receipts and accepted subscription amounts are not recalculated from current prices.
- The current billing and template-switch restrictions remain unchanged during visual review. Upgrade/downgrade timing, proration, cancellation, existing-subscriber migration and entitlement validation must be implemented and verified before enabling paid design switching.

## Work queue

1. Baseline and isolated policy/pricebook foundation; empty-cart popup without the cart header.
2. Review neutral Basic first-column and Dining full-page, including images, options, cover, call/cart simulation and all device modes.
3. Apply approved neutral appearance to the other four structures. Roll existing Basic skins out structure-by-structure: first column, top row, center column, upper-left panel. Reuse their fonts, colors, decorations, image slots and mobile behavior, not a repainted Matcha rail. Center and upper-left scroll regions require dedicated geometry checks. Dining retains multi-page navigation; Display is deferred.
4. Design switching: preview, server-side service/access/ownership validation, atomic saved selection, retained unsupported data and reversible design snapshots. Preserve content, QR/slug, table and order IDs; never copy starter items over customer data.
5. Editor integration and existing operations pages: layout/visibility/widgets/notices, orders/calls/tables/QR. Preserve QA-only postpay runtime until separately verified for ordinary menus; prepay remains disabled preparation UI on mobile only.
6. Create/gallery/detail/preview/checkout/FAQ alignment; subscription transition implementation and migration plan.
7. Actual viewport/orientation/locale, dense/sparse/long copy/custom fonts/widgets/notices and switch round-trip tests; QA-only postpay acceptance/processing. Staged release with original-skin snapshots, rollback boundary and live preview verification.

## First-review implementation

Neutral appearance is preview-only and driven by standard typography settings. Basic reuses the exact approved contained-scroll renderer; Dining reuses the full-page engine and its supported course/individual-item modes. Sample images explicitly show replaceable image areas. Empty carts omit the entire header (back arrow, title, table and item count); populated carts retain the full-page header, table label and back action.

The new Basic appearance enables every item image. Its PC/tablet price/options row sits below the copy so thumbnails and multiple prices cannot squeeze the text into a few characters. The same scoped CSS participates in hidden measurement and visible rows. Existing designer templates and all mobile layout rules are unchanged.

## Verification

- 661 unit tests; TypeScript without incremental writes; changed-file ESLint and diff checks; optimized Production build. The new 12-device/state and 6-navigation checks also pass against the optimized server.
- `qa-default-designs.mjs`: both designs at actual 1440×900, 1180×820, 820×1180, 320×800, 390×844 and 430×932. Empty cart has no header; desktop/tablet empty state stays compact, populated cart covers the viewport and retains Table 1/back navigation. No horizontal viewport overflow, page errors or API writes.
- `qa-default-design-navigation.mjs`: 6 checks covering device/iframe/detached-link identity retention, Dining individual images and Glass/Bottle prices, original Matcha's empty popup and mismatched design 404.
- Existing `qa-real-matcha-fill.mjs`: 28 conditions preserve approved geometry, stable fill sizes, grouped mode, widgets/notices, fade and safety padding. Existing `qa-menu-interaction-theme.mjs`: 12 conditions across Matcha/Mocha/both Dining templates preserve CTA/modal typography, borders, theme and cart flow. Its navigation now waits for idle network before reading the asynchronously measured palette.
- Preview evidence is stored under `/private/tmp/default-design-review`, `/private/tmp/default-design-navigation`, `/private/tmp/real-matcha-fill` and `/private/tmp/menu-interaction-theme`. No customer orders, payments, database records or subscriptions are changed by these checks.
