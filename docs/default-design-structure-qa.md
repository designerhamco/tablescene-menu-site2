# Default structure and Dining refinements QA — 2026-10-20

## Scope

Production baseline: `86716266fe6ddea7a6db02fc5e1b9a2b5ecd3f7d` (PR #259). The approved first-column Basic and full-page Dining reviews are extended with three isolated neutral Basic structures. Customer saved records, subscriptions, payments, editor access and the six other designer Basic renderers are not migrated.

Dining now stacks each option/price pair on its own right-aligned line on all devices. Mobile retains a separate price row below the name with a dotted leader; PC/tablet retain the name/leader/price relationship. Thumbnails open a lightbox without a magnifier overlay. The Dining lightbox appears above its fixed language/action bars and returns focus to the originating image after close. Neutral product names are Korean with English secondary names; all Basic bakery examples remain image-free.

## Local verification

- TypeScript, changed-file ESLint, diff checks, 666 unit tests and optimized Next.js build pass. The new pure packing test includes the upper-left reserved height, preserved order and reachable final notices.
- `scripts/qa-basic-default-layouts.mjs`: 44 conditions, four Basic structures at actual 1440×900 and 1920×1080 PC; 1180×820 and 820×1180 tablet; grouped/fill modes; and mobile 320/390/430×932. Measures fixed representative areas and action docks before/after scrolling, actual track geometry, no duplicate category headings, every product once and reachable notices. All four structures have identical mobile product rectangles/content. Report: `/private/tmp/basic-default-layouts/report.json`.
- After explicitly connecting the common top-header title policy, all 11 top-row conditions pass again. Header height stays within the shared 8–14% range, with the existing PC single-line gap rule. Report: `/private/tmp/basic-top-final/report.json`.
- `scripts/qa-dining-price-options.mjs`: 21 conditions across original Dining A/B and neutral Dining, actual PC1440, tablet1180/820 and mobile320/390/430/820. Every option pair owns a row, prices/add controls remain in bounds, mobile names retain their full row and standalone pairings retain independent prices/section separation. Report: `/private/tmp/new-dining-prices/report.json`.
- `scripts/qa-default-detail-refinements.mjs`: 13 conditions. Checks all 20 neutral Dining product names/secondary names across every menu page, five actual viewports, right-aligned prices/dotted leaders and one-line short names; click enlargement without thumbnail SVG, full viewport overlay, unobstructed close, Escape and focus restoration. Checks all 18 neutral Basic products and five image-free bakery products across the four layouts with features/images on and off. Final report: `/private/tmp/default-detail-final/report.json`.
- `scripts/qa-default-design-options.mjs`: 20 existing option/device/language scenarios pass, including all bakery exclusions, price options on/off and Glass/Bottle selection. Report: `/private/tmp/basic-new-options/report.json`.
- `scripts/qa-default-designs.mjs`: 15 existing display/order scenarios pass, including compact header-free empty carts and full viewport populated carts with table/back navigation. Report: `/private/tmp/basic-layout-carts/report.json`.
- All scripts block API mutations, record real DOM viewport dimensions and wait for loaded fonts/layouts. No page errors or API writes were recorded. Representative screenshots were visually inspected, including portrait top/center rails, upper-left panel, mobile prices and the lightbox close control.

## Remaining boundary

The neutral Dining sidebar remains the next structure. Existing designer skins need their own structure-preserving scroll rollout; adding these neutral previews is not that rollout. The access/pricebook foundation is still not connected to paid design switching. The editor and ordinary-menu order/call/QR operational release remain separate tasks.
