# Menu details and customer-order preview QA — 2026-10-20

Baseline: Production `b7852d6c88ad280dc34a7749269dbbed1489727f` (PR #260).

## Changes and boundaries

- Dining mobile price-option products show Korean name, English secondary name, then option-price rows. The right-aligned price block, dotted leader and adjacent add button remain. Original Dining A/B and the neutral full-page preview share this correction; PC/tablet geometry is unchanged.
- Neutral Basic upper-left representative content is part of the first scroll track instead of an absolute overlay. Its measured height plus shared gap is counted once. Its height remains based on board inner height, independent of content scroll height. Footer actions stay fixed. The label is 좌상단 배치형. Other neutral structures and all Basic mobile product layouts are preserved.
- Preview carts expose Cart / Order history tabs on the full-screen surface. A fresh empty cart retains the compact header-free popup with a separate history entry. Preview submission moves to history, resets list scroll, and retains per-menu/per-scope order snapshots in session storage. Examples are explicitly labelled and only loaded on request. Orders show time (Korea), table, names/options, quantities, prices, payment and five progress stages.
- Customer self-cancellation simulation requires received + unpaid, and confirmation. Accepted/cooking/ready/served/paid examples cannot be cancelled. Staff permissions are unchanged. No public history/cancel API, database schema, payment/refund, real-order runtime or customer data changes are included.

## Color audit

`TypographySettingsForm.tsx` currently exposes color only for brand/category; `otherText.allowColor` is false and other hidden role-color fields are submitted empty. Thus “other font color already editable” is not the current implementation.

`DiningAubeTableA.tsx` binds cover title to `--menu-role-brand-color`; page title plus ordinary/course category title to `--menu-role-category-color`. Cover background color and opacity are already editable in the menu editor cover section and saved through `multi_page_cover_background_color` / `_opacity`. Cover supporting copy still inherits the template-specific cover foreground.

Follow-up in the editor/operations stage: other-text color for both services, a separate optional cover-description color with template-preserving fallback, visit-scoped customer history and atomic customer cancellation checks. Details in `docs/default-design-rollout.md` and `docs/task-queue.md`.

## Verification

- 669 unit tests, TypeScript, changed-file ESLint, whitespace diff checks and optimized Next.js build pass. New policy tests cover every order phase/payment combination and malformed/stale preview history.
- `qa-basic-default-layouts.mjs`: 44 conditions. All four Basic structures; actual PC1440×900/1920×1080, tablet1180×820/820×1180, grouped/fill, mobile320/390/430×932. Upper-left panel moves exactly with scroll while actions stay fixed. Other fixed representatives stay fixed, all 18 products and unique headings remain, final notices are reachable, mobile rectangles/content match across layouts. `/private/tmp/history-layout-local/report.json`.
- `qa-dining-price-options.mjs`: 21 conditions. Original A/B and neutral Dining; PC1440, tablet1180/820, mobile320/390/430/820. Validates secondary-name-before-options, right price/add boundaries, option rows and independent pairings. Compared PC/tablet coordinates, text and typography against `/private/tmp/new-dining-prices/report.json`; unchanged. `/private/tmp/history-dining-local/report.json`.
- `qa-customer-order-history.mjs`: 8 conditions on the final build. Basic/Dining × PC1440×900, tablet1180×820, mobile390×844/320×740. Tests empty popup, full-screen tabs, explicit example loading, status/payment/time, cancellation confirmation/back/commit, no cancellation after prep/payment, keyboard tab switching, actual preview order addition, scroll reset and reload persistence. `/private/tmp/history-ui-final/report.json`.
- `qa-default-designs.mjs`: 15 existing display/cart conditions on the final build. Empty header-free popup, full-screen populated cart/table/back, order quantity badge, image enlargement and data presence. `/private/tmp/history-cart-regression/report.json`.
- Browser scripts wait for fonts/layout and record actual dimensions; they block API writes. No browser errors or API writes. Visually inspected Dining mobile option rows, PC/mobile history and landscape/portrait upper-left screenshots.

## Production verification

Release checks and live smoke results are recorded in the PR and final task report. The history simulator is intentionally preview-only; passing it does not certify real customer cancellation or live status updates.
