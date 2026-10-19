# Dining actions and default preview options — 2026-10-19

## Scope

- Dining PC/tablet keeps KR/chevron, staff call and order in the top toolbar. When Call is enabled, a fixed circular call button also appears at the lower right; both open the same dialog. Mobile keeps its existing top/bottom control layout. Item and course add actions sit next to the corresponding price. Dining order actions use a rounded menu outline without a folded corner and a dark plus badge; Basic keeps the cart glyph. Cart counts have equal width/height.
- Basic/Dining staff-call controls use the shared Lucide ConciergeBell SVG. Website notifications are unrelated and unchanged.
- Both neutral preview designs use Pretendard for Korean and English. Only the neutral Basic design removes category divider strokes. Existing designer typography, colors, spacing and reading engines remain unchanged.
- The second toolbar row provides Basic widget/representative-area/featured-product/item-image/secondary-name/description/category-price-option/price-note/time-sale/sold-out controls. Dining has cover/item-image/secondary-name/description/sold-out controls. They default on and travel with device, iframe and detached-window URLs. The frame clears the measured toolbar height as options wrap. These controls belong to the two neutral review designs.
- Neutral Basic prices stay to the right of names on all devices, with cart actions near prices. COFFEE has HOT/ICE and ADE has Small/Tall/Large; other categories keep a single price. Price notes such as ICE ONLY remain separately controllable. Grouped is the default layout. Brand/category typography uses bold Pretendard; supporting text remains regular.
- Neutral Dining includes one sold-out individual item, since availability matters for ordering. Period discounts are omitted from this first Dining design. Its large mobile cover and non-course page headings are reduced; the approved course-page typography remains unchanged. Secondary-name samples appear on individual dishes, and description/secondary toggles affect product copy rather than store/category descriptions.
- Shared Basic image lightboxes use a modest 12px radius; neutral default design lightboxes and their sample image are square. The placeholder asset's baked-in corner radius is also reduced.
- Final rule audit found the contained-scroll engine capped at three menu tracks. It now measures a fourth only when each inner track has at least 12rem after the brand/gutters; a preferred overflow must become a one-screen fit or reduce actual maximum content height by at least 15%, without excessive type loss. Existing safe 1–3-track choices remain preferred. Representative columns are counted separately.
- Basic representative area uses the editor's existing cover-image setting; store identity remains visible. Disabling this area disables its featured-product checkbox without discarding the selection. The default sample's first slide includes a product, so the featured control has an immediately visible example.
- Dining retains the existing course-image policy: course-priced menus order the whole course; the item-image switch controls supported individual-item images.
- The shared language popup corrects either anchor before paint to remain inside the actual viewport, including scaled previews. The same component serves public menu boards.

## Verification

### Preview grouping and title-only alignment follow-up

- The neutral Basic toolbar groups eleven controls under 영역·이미지 / 메뉴 정보 / 가격·판매 상태. Dining's five controls use the same grouped panel with 판매 상태. The panel can collapse independently of the device/action toolbar, preserving all selections and the current iframe.
- Basic's new 텍스트칩 switch controls ordinary product/featured badges only. Period promotions and sold-out status retain their independent switches. The selection survives device and detached-window URLs.
- Neutral Basic image rows with no secondary name, description or other supporting content center the name block and price on the thumbnail. The add action keeps its own measured space below the price; no absolute overlay or mobile reading-token change is introduced. Shared Basic sold-out badges have no outline.
- Column selection is **unchanged in this follow-up**. The user's proposed remaining-copy-width/wrapping criterion and an automatic three-column ceiling are pending discussion. Do not interpret this UI release as approval to change the current 1–3 plus guarded fourth-column policy.
- `qa-default-title-only.mjs` passed twenty PC/tablet/phone, order on/off and price-option on/off cases. The existing option suite passed twenty scenario groups including group structure, collapse persistence and independent badge/sale/stock visibility; fifteen design/cart regression cases and 662 unit tests also passed.

- `qa-dining-menu-actions.mjs`: 57 actual viewport/state cases across original Dining A/B, the neutral Dining preview and seven Basic templates. Checks top-toolbar order, mobile layout, price adjacency across pages, fixed controls during scrolling, SVG variants and viewport overflow.
- `qa-default-designs.mjs`: 15 device/layout/design cases; default grouped and fill placement, actual name/price geometry including 320px phones and three-option rails, square lightbox, circular count badge, empty-cart popup, populated full-screen cart and table context.
- `qa-menu-interaction-theme.mjs`: 12 cases; template colors, button type, modal/call/cart flow, Pretendard, borders and shared CTA weight. Desktop Dining toolbar expectations follow its transparent icon treatment.
- `qa-default-design-options.mjs`: 20 scenario groups across all display toggles, typography, default category strokes, selection persistence, wrapped-toolbar clearance and nine templates' mobile language popups at an actual 320×844 viewport, with Call on/off. All popups stay inside the viewport with at least 8px side clearance.
- `qa-default-design-navigation.mjs`: 6 checks for device/detached navigation, Dining item images and price options, the original empty-cart popup and invalid design routes.
- `qa-real-matcha-fill.mjs`: 32 actual viewport/content/layout cases include measured 1/2/3/4 menu tracks, four-track readable widths, category/widget/notice spacing, source order, fixed brand/actions and scroll/fade behavior.
- TypeScript, changed-file ESLint, 662 unit tests and optimized build pass. Browser checks block API writes and assert no page errors. No customer orders, payments, subscriptions or database records are changed.

## Remaining rollout

The first two neutral designs remain the visual review boundary. The other four designs, structure-specific Basic scroll rollout, design-switch entitlements, editor/operations integration and purchase flow follow `docs/default-design-rollout.md`.
