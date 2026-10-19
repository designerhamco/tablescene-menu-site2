# Dining actions and default preview options — 2026-10-19

## Scope

- Dining PC/tablet uses one top toolbar for language, staff call and order. Mobile keeps its existing top/bottom control layout. Item and course add actions sit next to the corresponding price. Dining order actions use an outlined document with a dark plus badge; Basic keeps the cart glyph.
- Basic/Dining staff-call controls use the shared Lucide ConciergeBell SVG. Website notifications are unrelated and unchanged.
- Both neutral preview designs use Pretendard for Korean and English. Only the neutral Basic design removes category divider strokes. Existing designer typography, colors, spacing and reading engines remain unchanged.
- A second preview-toolbar row provides Basic widget/representative-area/featured-product/item-image controls, and Dining cover/item-image controls. They default on and travel with device, iframe and detached-window URLs. These controls currently belong to the two neutral review designs.
- Basic representative area uses the editor's existing cover-image setting; store identity remains visible. Disabling this area disables its featured-product checkbox without discarding the selection. The default sample's first slide includes a product, so the featured control has an immediately visible example.
- Dining retains the existing course-image policy: course-priced menus order the whole course; the item-image switch controls supported individual-item images.
- The shared language popup corrects either anchor before paint to remain inside the actual viewport, including scaled previews. The same component serves public menu boards.

## Verification

- `qa-dining-menu-actions.mjs`: 57 actual viewport/state cases across original Dining A/B, the neutral Dining preview and seven Basic templates. Checks top-toolbar order, mobile layout, price adjacency across pages, fixed controls during scrolling, SVG variants and viewport overflow.
- `qa-default-designs.mjs`: 12 device/design cases; neutral appearance, empty-cart popup, populated full-screen cart and table context.
- `qa-menu-interaction-theme.mjs`: 12 cases; template colors, button type, modal/call/cart flow, Pretendard, borders and shared CTA weight. Desktop Dining toolbar expectations follow its transparent icon treatment.
- `qa-default-design-options.mjs`: 20 checks across display toggles, typography, default category strokes, selection persistence and nine templates' mobile language popups at an actual 320×844 viewport, with Call on/off. All popups stay inside the viewport with at least 8px side clearance.
- `qa-default-design-navigation.mjs`: 6 checks for device/detached navigation, Dining item images and price options, the original empty-cart popup and invalid design routes.
- TypeScript, changed-file ESLint, 661 unit tests and optimized build pass. Browser checks block API writes and assert no page errors. No customer orders, payments, subscriptions or database records are changed.

## Remaining rollout

The first two neutral designs remain the visual review boundary. The other four designs, structure-specific Basic scroll rollout, design-switch entitlements, editor/operations integration and purchase flow follow `docs/default-design-rollout.md`.
