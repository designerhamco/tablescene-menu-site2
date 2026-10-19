# Dining actions and default preview options — 2026-10-19

## Latest refinement: mobile Dining option prices and text-only Basic samples

- Existing Dining A/B and the neutral Dining review put real option prices on a separate row below the item name at the existing mobile container boundary. Label/price pairs wrap together and the add action remains next to the prices. PC/tablet and ordinary single-price rows retain their layout. Standalone Wine pairing / Non-alcohol pairing sections and prices are explicitly preserved.
- The neutral Dining toolbar now has seven controls, including independent 가격 옵션 under 가격·판매 상태. OFF displays the item's base price; ON restores its actual option selections. Device and detached URLs preserve the state.
- Neutral Basic's 초콜릿 휘낭시에, 버터 크루아상 and 맛차 테린 always have no image, even after toggling 상품 이미지 off and on. Other samples still follow the switch. Designer presets and customer content are untouched.
- `qa-dining-price-options.mjs` captures 21 old-build screens and compares the changed build: existing A/B and neutral Dining at 1440×900 PC, 1180×820 and 820×1180 tablet, and 320/390/430/820×932 forced mobile. It checks whole-name space, option row position, button adjacency, viewport boundaries, unchanged standalone prices and course-gap token. Desktop/tablet bounds permit only 0.1px inline glyph-rounding variation; text and fonts compare exactly. Evidence: `/private/tmp/dining-price-before/report.json`, `/private/tmp/dining-price-after/report.json`.
- TypeScript, ESLint, 665 unit tests and optimized build pass. An existing CSS-source assertion was updated to the already approved shared price-label/sizer selector; no production Basic spacing CSS changed in this follow-up.
- All 78 browser conditions pass: price layout 21, preview toggles/device persistence/language 20, default design/cart 15, heading/price spacing 12, readable columns 10. The option suite checks both image-less examples after re-enabling images and actual Glass/Bottle selections in the item dialog. No page errors or API writes. Reports: `/private/tmp/dining-price-{after,options-ui,designs,spacing,columns}/report.json`.

## Previous refinement: heading, price columns and category descriptions

- Both neutral designs add an independent category-description checkbox (Basic 12 controls, Dining 6). Basic has examples on SIGNATURE and BAKERY only. Product descriptions remain independent; URL/device/detached transitions preserve the option.
- Contained Basic heading gap is max(saved ratio, 1.25) times item rhythm, just above the existing ordinary 1.20 maximum. Its mobile wrapper changes heading 24→26px; item 20px and section 48px remain. Mobile CafeDesignA option headers and prices reserve the same intrinsic label/price widths, keep 10px between columns and center prices under labels. PC/tablet price geometry is unchanged.
- The neutral Basic cover placeholder is medium gray (#898e90) so white slide dots are distinguishable. Its lower black fade, customer images and neutral Dining cover remain unchanged.
- Dining PC/tablet top toolbar now has language and order only; the lower-right circular Call remains. Global cart/open actions use the menu outline without a plus, while item/course add actions retain the plus. Mobile control positions remain.
- Pricing audit: both Dining capabilities allow 3 actual price options; Glass/Bottle use those options. The current individual-item renderer joins label+price inline and does not draw category-level price headers. Mobile option-price reflow and its preview toggle await the user's response to the requested explanation.
- Verification on optimized local build: 665 unit tests, TypeScript, changed-file ESLint, build; heading/price spacing 12, preview options 20, action combinations 57, readable-column transitions 10, contained-scroll geometry 32 = 131 browser conditions, no page errors or API writes. Reports: `/private/tmp/menu-controls-prod-{spacing,options,actions,columns,fill}/report.json`. The spacing suite checks actual 320/390/430/820 mobile viewports, 1180×820 tablet and 1920×1080 PC, including designer and neutral Basic. Existing mobile/other-template action and language regressions also pass.

The following records describe earlier checkpoints; the latest refinement above supersedes their duplicate top Call and option counts.

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
- Column selection was unchanged in the UI follow-up. The subsequently approved name-width/wrapping policy now selects two or three columns and removes automatic fourth-column rescue in the contained Basic engine. See `docs/basic-menu-scroll-policy.md` and the latest `docs/real-matcha-scroll-qa.md` entry; mobile remains independent.
- `qa-default-title-only.mjs` passed twenty PC/tablet/phone, order on/off and price-option on/off cases. The existing option suite passed twenty scenario groups including group structure, collapse persistence and independent badge/sale/stock visibility; fifteen design/cart regression cases and 662 unit tests also passed.

- `qa-dining-menu-actions.mjs`: 57 actual viewport/state cases across original Dining A/B, the neutral Dining preview and seven Basic templates. Checks top-toolbar order, mobile layout, price adjacency across pages, fixed controls during scrolling, SVG variants and viewport overflow.
- `qa-default-designs.mjs`: 15 device/layout/design cases; default grouped and fill placement, actual name/price geometry including 320px phones and three-option rails, square lightbox, circular count badge, empty-cart popup, populated full-screen cart and table context.
- `qa-menu-interaction-theme.mjs`: 12 cases; template colors, button type, modal/call/cart flow, Pretendard, borders and shared CTA weight. Desktop Dining toolbar expectations follow its transparent icon treatment.
- `qa-default-design-options.mjs`: 20 scenario groups across all display toggles, typography, default category strokes, selection persistence, wrapped-toolbar clearance and nine templates' mobile language popups at an actual 320×844 viewport, with Call on/off. All popups stay inside the viewport with at least 8px side clearance.
- `qa-default-design-navigation.mjs`: 6 checks for device/detached navigation, Dining item images and price options, the original empty-cart popup and invalid design routes.
- `qa-real-matcha-fill.mjs`: 32 actual viewport/content/layout cases include measured 1/2/3 menu tracks, no automatic fourth track, category/widget/notice spacing, source order, fixed brand/actions and scroll/fade behavior.
- TypeScript, changed-file ESLint, 662 unit tests and optimized build pass. Browser checks block API writes and assert no page errors. No customer orders, payments, subscriptions or database records are changed.

## Remaining rollout

The first two neutral designs remain the visual review boundary. The other four designs, structure-specific Basic scroll rollout, design-switch entitlements, editor/operations integration and purchase flow follow `docs/default-design-rollout.md`.
