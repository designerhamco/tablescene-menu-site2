# Menu template spacing contract

## Shared preview shapes and chip colors — 2026-10-23

Catalog Design options expose one image-radius preset for advertisement, representative, widget and product images plus text chips. Catalog and editor use the same helper: square/soft/rounded/round maps images to 0/8/16/24 CSS px and chips to their existing square/soft/rounded/pill shapes. Logos are excluded from the control; Dining full-bleed covers remain square. Previously saved independent values, including logo values, stay intact until another shared preset is selected. Template default clears only the supported image/chip overrides. Existing JSON/form fields and album image ratios remain compatible. This supersedes the independent radius and chip-shape controls described below.

Representative alignment has its own Design section. Store identity follows the selected alignment, while featured-product names, descriptions and chips always align left on every device. Keep native representative geometry, price rails, typography and mobile reading tokens unchanged.

Every Basic catalog/default/album presentation offers independent ordinary-chip and time-sale-chip background and text colors. Temporary validated `designPreview.chipColors` values apply through the shared appearance scope; background-only edits choose readable foregrounds. Sold-out/state chips, discounted price colors and original customer content remain independent. Device navigation, detached views and reset retain the existing preview contract. Dining/Display do not gain controls for unsupported chip features. The default neutral LOGO asset centers its combined icon/text artwork without changing its frame ratio.

## Center-column background geometry — 2026-10-23

Basic center-column presentations use two geometry modes derived from the visible auxiliary surface. A center surface that differs from the page, including ROSY ORANGE's native gradient when no override replaces it, spans the complete page height. Its content keeps the common top/bottom reading inset and a compact responsive inline inset. The left and right menu gutters are measured from the colored panel's outer edges, while the panel padding remains internal to its fixed 24% occupied slot.

If the auxiliary surface is cleared or explicitly equals the page background, the presentation returns to the unpanelled center geometry: the representative rail uses the ordinary page top/bottom inset, releases the colored-panel inline padding, and the menu uses the standard center-slot spacing. This affects PC/tablet only; mobile retains its independent reading flow and spacing.

## Center-column language and service actions — 2026-10-23

ROSY ORANGE derives its PC/tablet center-rail geometry from the neutral center-column list design. The rail uses the same page inset, 24% content-width slot, 1.5rem internal block gap, and 44px language trigger with a 24px globe. The globe sits in normal flow at the rail's upper-left, so the following store identity starts after the same 24px gap rather than overlapping the control. The menu tracks reserve that same center slot and surrounding page gutters. Mobile keeps its independent Call bar, body rhythm and bottom dock. The trigger follows rendered brand ink and the language list follows category ink, through logo/cover and palette changes.

Every active center-column Basic presentation, including the neutral default, places enabled Call/Order actions side by side beneath the representative content. Equal button widths and a compact gap preserve the center rail; narrow rails may place each button's icon above its label without stacking the two buttons or reducing readable type. Call-only native circles retain their existing shape. Existing category-color action palettes, representative geometry, product type sizes and mobile action placement remain unchanged.

## Preview option overlay — 2026-10-21

At actual browser widths of 960px and above, catalog options start **open** as a light left-edge overlay, including links that select the Design tab. Opening or closing covers/reveals the menu without reserving a side column, shifting the centered preview, or changing its size or display scale. The dark top device/service toolbar stays centered in the full browser width; the open drawer sits below it so both controls remain usable. Drawer state must preserve the iframe document, source size and menu scroll position. Tablet/mobile use their registered dimensions/orientation; PC uses the actual outer browser viewport. Only an actual browser resize or selected device/orientation changes source geometry. This supersedes the earlier collapsed/reserved-column/scaled-preview behavior.

At narrower browser widths, options still start collapsed below the top toolbar with the approved two-column mobile controls. Explicit open/closed choices persist through tab/device navigation and browser resizing. Both layouts share temporary selections, keyboard tabs and the light color picker. The reset icon is beside each swatch; HEX remains inside the picker. Display and saved-menu preview surfaces retain their prior paths.

The option surface uses white at 94% opacity with a 16px backdrop blur, dark opaque text and solid white form controls. Unsupported backdrop filtering or reduced-transparency preferences use opaque white. Apply transparency to the surface background only, never the entire panel or its text. Keep the dark top toolbar and the established overlay geometry/defaults unchanged.

## Compact design controls — 2026-10-21

Catalog color controls keep the label and swatch adjacent. HEX editing lives inside the collision-aware picker; no separate default/HEX textbox appears in the main panel. Its spectrum supports pointer/touch and keyboard input. Mobile design controls use two columns for backgrounds, image shapes and related choices; the third typography group spans the row with Korean/English choices side by side. Option containers at least 640px wide retain three typography columns; narrow side drawers keep two. These controls do not change menu reading geometry.

Basic/Dining image radius selectors share template/square/soft/rounded/round choices (native, 0, 8, 16, 24 CSS px) in catalog and editor. Dining's full-bleed cover is excluded from these controls and remains square. The 2026-10-23 shared control covers advertisement/product/widget images and excludes logos. The existing bounded numeric JSON/form contract remains compatible; non-preset stored radii show “기존 설정 유지” and remain unchanged until the user chooses another option. Template restores the native radius. The 2026-10-23 revision links chip shapes to the shared preset. Category option labels follow the actual category heading ink, including Mocha panel contrast and Rosy Orange's native accent, as well as explicit saved/preview category colors.

## Catalog functional/design options — 2026-10-21

Catalog preview controls have separate Functional and Design tabs. Existing feature checkboxes and defaults remain unchanged. Design values are temporary, validated `designPreview` URL data; they never write to a customer menu. Device/orientation/layout/feature/detached navigation retains them, while changing tabs alone must not reload the menu iframe. Reset clears only the temporary design values. Display and saved-menu preview behavior stay separate.

Typography keeps three groups: brand, category and other text. Other text applies to item names, supporting text and prices; store introductions and notices use the selected Korean face for both scripts. Selecting another group's fonts must not change the other groups. Category option labels share the category color and Korean/English font variables, retaining their smaller size and existing price geometry. Native palettes remain the default; explicit brand/category choices take precedence over legacy skin colors, and Loop Bagel respects role-specific font choices.

Design backgrounds use the same saved `design.backgroundColor`, `auxiliaryBackgroundColor` and `sidebarBackgroundColor` fields read by the shared renderer; Dining cover color uses the existing separate cover setting. A distinct Basic auxiliary color adds internal panel padding inside the occupied representative slot, with the ordinary outer gutter measured from its colored edge. Neutral first/center panels release that padding when the auxiliary color is cleared or matches the page. Preserve existing native panel geometry, mobile reading gaps, image ratios and Dining page/sidebar navigation. Image/chip/album controls reuse `design.appearance` and its existing bounds/default behavior.

## Mobile option reading and shared preview parity — 2026-10-21

Latest user revision: Basic mobile lists retain the original name-side price rails and category option headings. Only a product with a visible image and exactly three visible category price options uses a full-row, three-cell price strip below photo/copy, with one add control at the right. Each cell shows its option label above its price; shared grid rows keep prices aligned even when a label wraps. This replaces the tall vertical option list without shrinking type. All other rows keep their previous mobile layout; no width-based or category-wide switch remains. Hide a category's mobile option heading only when every applicable row uses that explicit stacked exception. Fonts/internal-copy/item/section tokens and PC/tablet/Dining pricing stay unchanged. Basic albums still exclude category price columns.

Basic store introductions now use saved `--menu-font-ko` for both Korean and English, matching notices. Preserve all role sizes, colors, weights and spacing. The stored Basic image radius model retains optional advertisement/representative/product/widget/logo values, while the current shared control excludes logos and Dining covers (integer 0–32 CSS px); Dining’s full-bleed cover remains square. Absence keeps each native template's current radius. Chip shape is optional template/square/soft/rounded/pill and never changes state visibility/colors. Dining supports the remaining controls on native, neutral and album presentations. Its existing sold-out chip follows the selected chip shape. Save/reset uses the existing authorized Design action and `page_settings.design.appearance`; no schema change or customer migration. Product lightboxes retain the effective thumbnail radius. Album product ratios alone support 1:1 (default), 4:5 and 5:4 on every device; course image suppression, course single-track flow and representative ratios remain independent. The album ratio occupies its own Design section before image-radius controls. Basic album previews restore tablet rotation; ordinary Basic lists keep the hidden rotation control and Dining retains its existing controls.

Every circular cart count uses the actual rendered icon ink as its background and a contrasting number, including photo-cover state changes. Image lightboxes snapshot the clicked thumbnail frame/image corner radii rather than applying an independent larger radius. These shared rules cover native, neutral and album Basic/Dining presentations.

Mocha alone defaults its original image-only character widget ON (3:1, contain, bottom-right, bottom placement); explicit OFF wins. Other catalog/default designs keep widgets OFF. Enabling an existing widget preserves its type, content and all editor fitting/alignment settings; only a missing catalog example receives a full image/text fallback. Widget title/body follow saved other-text ink and otherwise the actual native panel supporting ink. Mocha PC/tablet representative images keep 4:5, align to the rail bottom without inner bottom padding, and shrink both dimensions together when necessary. Mobile retains its separate natural flow.

## Strict Basic supporting-size and category examples — 2026-10-21

Latest user clarification: both this size alignment and category-wide price examples apply to Basic only. Dining retains its existing type hierarchy, including the larger cover introduction.

Active Basic PC/tablet store description, product/featured description, category description, notices, widget body and language supporting copy share one reading-supporting token: reference × .94 × .72, with the existing .75rem floor and saved global/supporting scale. The token is resolved on the reading board/frame rather than recalculated from an individual product role. This removes the 6% store/notice-versus-product difference. Description-only products no longer receive the old 5% description emphasis, on desktop/tablet or mobile; secondary-only emphasis remains independent. Mobile descriptions remain 14px with existing line-height and gap tokens. Other product/name/price/category sizes are unchanged.

Every active Basic starter has a complete category-level price-option example (up to three columns) and a complete ordinary-price note category. All products in a category with price columns have explicit values for every declared column. Every product in a demonstrated price-note category has a meaningful note; notes may differ where the drinks have different serving modes. Catalog ON fills incomplete category examples, OFF hides them, and customer data is not modified. Basic albums still exclude category price-option rails; Dining and standalone items keep their prior data rules.

## Header copy and supporting ink — 2026-10-21

Active contained-reading top rows keep the existing independent 8–14% title-fit budget, but their grid row also has a measured copy-height minimum. This includes native language-row reservation and wrapped notices/description, for text brands and logos alike. A long store description grows the fixed header and reduces the scrolling body; it must never be clipped to the title ratio. Recompute the minimum on real copy, font, logo or viewport changes and release it when the text/logo presentation unmounts. The shared neutral top-row design follows the same policy; mobile natural flow and legacy canvas engines remain separate.

Notice 1/2/3 use the ordinary supporting-copy ink (including the native panel palette and saved supporting-color overrides), without independent dark defaults. Mocha Forest and Loop Bagel starters now use Carme and Mogra respectively, and their registered English item names are present by default, so catalog secondary-name checkboxes infer ON while explicit OFF remains available. Saved customer fonts/content are not overwritten.

## Current Basic contained reading — 2026-10-20

The user confirmed the neutral designs and approved rollout to the six existing designer skins. All seven active Basic single-page templates now use contained reading on PC/tablet. The legacy canvas-fit and no-scroll rules below apply only to excluded/legacy presentations. Mobile keeps its independent approved reading contract.

REAL MATCHA retains its approved `RealMatchaPaged` presentation. The other six use `one-page/NativeBasicScroll`: their original `CafeDesignA` identity, header, featured carousel, product/pricing, panels, fonts, colors, decorations and image lightbox remain the visual source. They are not routed through a recolored Matcha shell. Left rails and three-cell top headers stay fixed; the central color rail remains fixed between two synchronized reading tracks; ONUE's native photo is the first flow block with menu space beneath it. ONUE keeps its dark gutters and white reading panels. Mocha keeps its full-height brown rail. Top-row and central notice anchors remain native.

Grouped/fill use the same readable device size and gap mapper, actual name-width comparison, at most three automatic menu tracks, registered order, headings shown once, and scrollable overflow. Widgets and final notices use the native category boundary; fill adds a final page inset. Fixed service actions sit outside the scrolling menu (under the representative panel for the center layout). Call alone keeps a circle. Fade is present only while real content remains below. Display and multi-page engines remain separate; Dining preserves page navigation and adds a themed thin separator before standalone items only when categories precede them.

`qa-native-basic-scroll.mjs` measures actual viewports, order, width, names/prices, fixed rails/actions, final notices, fade, the existing mobile rhythm and preview advertisement/order/call interactions. Optional `NATIVE_QA_BASELINE` compares captured original role fonts, colors and weights (and mobile sizes).

The shared 2/3-track selector now also compares actual column-end imbalance after name readability. Only severe imbalance with material improvement and bounded extra scroll may choose two; see `basic-menu-scroll-policy.md`. Typography, registered order and mobile are unchanged.

## State, purchase alignment and repeated wrapping — 2026-10-20

Sold-out item name/price use neutral #797979, supporting copy #8b8b8b, with state priority over saved/native role colors. Chips retain their existing independent styling. Item-add controls belong to the price/purchase area on every device, including price-hidden products; this replaces the former native-mobile title-row branch. No mobile text, copy gaps, item/section rhythm or thumbnail policy changes.

The shared 2/3-track measurement includes category title text after price-header reservation. One isolated ordinary 2-line name is insufficient. Three or more repeated wrapped product names affecting at least 30% of items can select two only when the actual wider candidate removes at least three line breaks and improves at least 35% of wrapped items. Two improved wrapped category headings can also select two. Existing severe overflow/cramped-name and end-balance checks remain. Typography, registered order, center-layout fixed two tracks and mobile remain independent; there is no fourth automatic track.

Order background now retains the representative brand color, superseding the darkest-palette Order rule below. Foreground prefers the brightest menu color but falls back to readable dark/black ink for light brands (minimum 4.5 contrast). Call and solid Call-circle policies remain separate. Catalog widget options default OFF except Mocha as refined above; explicit ON retains original widget configuration without removing starter/customer widget content. Advertisement progression is five seconds with a compact active-dot ring, desktop arrows and common manual navigation; pause for hover, keyboard manipulation or background, and respect reduced motion.

## Final type and action-color unification — 2026-10-20

The active Basic contained-reading policy now applies the approved 94% product role to designer, default and album presentations equally. Product/featured copy and hidden measuring rows use the same reference token; categories/store descriptions/notices retain their reference size. Active supporting/secondary/option ratios no longer inherit Mocha/Loop skin corrections. Mobile reading sizes, gaps and brand fitting stay independent. Dining PC/tablet uses `1.06 × .94` for all skins/defaults/albums rather than a neutral-only correction. See `docs/template-typography-audit.md`.

The latest user decision supersedes the brand-color action policy above: **category-name color** fills Order and colors rectangular Call ink/border. Rectangular Call uses the brightest actual menu swatch as its surface. Dining's circular Call uses the category-name color as its fill. Order and circular Call text/icon prefer the brightest menu swatch and retain a readable fallback for a light category. Saved Design edits and catalog-preview overrides use the same shared interaction theme, so My Menu/public views and every Basic/Dining catalog template update together. Category ink remains stable through cover/logo/page changes. Loop Bagel checker bands alone follow the saved **brand-name color**; their geometry and white squares remain unchanged.

## Preview completeness and interaction palette — 2026-10-20

Explicit catalog options fill all missing eligible examples, while saved-menu/public customer data remains untouched. Category descriptions ON covers every category; ordinary images and supporting descriptions retain existing content and fill missing slots. Priced Dining courses still suppress item images and keep a single item track. Starter widgets are image+title+body except Mocha's approved default character image; explicitly enabling widgets retains the registered example and all its editor settings. Dining reuses the common widget component after page content, at category-level spacing.

Basic list tablet preview frames offer landscape without a rotation button; album previews and Dining retain rotation. This toolbar policy does not disable viewport-responsive portrait rendering. Top-row language controls occupy the description cell's top-left, with a reserved control row above supporting copy. Sunday no longer draws its between-category decorative rule; semantic category gaps remain.

Rectangular Call uses the brightest menu surface and readable representative ink/border. Order uses the representative brand fill and bright readable text, with a dark-ink contrast fallback for light brands, as refined above. Both choose a readable fallback if the palette cannot provide contrast; transparent/photo pixels and site chrome are not palette swatches. Existing solid Call circles retain their representative accent independently of Order. Item-add icons mix their inherited ink with 32% white (already-white text cannot become brighter). Basic price-note/price pairs reserve a shared 0.375rem horizontal gap, including native skins and neutral designs. The dark photo fade retains bright featured copy rather than page-ink colors.

## Initial release — REAL MATCHA contained reading (2026-10-19)

Latest approved refinement: the contained engine's category-heading bottom gap is the greater of the saved ratio and 1.25 times the item base gap, slightly above the ordinary maximum 1.20 item rhythm. Its delegated mobile wrapper alone changes heading-to-first-item 24px to 26px (1.625rem); item 20px, section 48px and internal copy tokens remain unchanged. In the shared CafeDesignA mobile price-column presentation, labels and prices reserve the same maximum intrinsic label/price widths with a 0.625rem gap and centered price alignment; this fixes overlapping long option labels without changing desktop rails. All other device/engine policies below remain independent.

The user approved promoting the tested contained-scroll presentation to formal `cafe_design_a` single-page menus. That route and the hidden compatibility test use `experimental/RealMatchaPaged.tsx`: fixed brand, shared responsive readable sizing, shared internal menu scroll, conditional background fade, and a dock outside the scroll. Saved grouped/fill preferences remain effective. Mobile still delegates unchanged to CafeDesignA. Multi-page REAL MATCHA and Display are excluded. This was the initial release boundary; the 2026-10-20 native-skin rollout above supersedes it. Other skins still do not use the Matcha shell.

For REAL MATCHA contained reading, keep the original adaptive board's PC/portrait-tablet outer inset formulas and use the same inset for visible column gutters. Category, widget and final notice boundaries share the REAL MATCHA category separation ratio (2.9) without fill-only gap expansion. Fill uses stable device-scale readable type, with menu overflow allowed, and reserves one page inset after the final content inside the scroll surface. Grouped shares the same device reading size and base gaps; category boundaries alone differ. Both modes allow menu overflow. Both layouts compare actual product-name width/wrapping at the same device type ceiling before choosing two or three menu columns; materially improved names can select two even when it scrolls. Automatic four-column rescue is removed for this contained engine. Sparse/physically narrow one-column fallback remains. The fixed action dock alone has a smaller bounded clearance. Its vertical text brand uses the existing `CanvasBrandTitle` 75% width target. See `docs/basic-menu-scroll-policy.md`.


KOHI was deleted on 2026-10-16. The current adaptive inventory has seven templates including ONUE TABLE. KOHI-only rules and assets are removed; historical QA records do not make it an active template.

## Scope

Every active menu template must declare one spacing contract on its root element.

- `data-spacing-contract="canvas-fit"`: excluded/legacy PC/tablet presentations and Display templates that fill one viewport. Active Basic contained reading declares `contained-reading`.
- `data-spacing-contract="mobile-reading"`: the seven active single-page templates on phones; stable rem-based reading typography and natural scrolling, no canvas fitting or copy-visibility multipliers.
- `data-spacing-contract="contained-reading"`: all seven active Basic single-page presentations and the REAL MATCHA hidden compatibility test on PC/tablet; fixed brand column and bottom actions, one internal menu scroll canvas. Fill keeps stable device-scale readable sizing and scrolls when needed; grouped shares the same stable reading size and permits overflow. See `docs/basic-menu-scroll-policy.md`. The six native skins use `NativeBasicScroll` with their own role profiles.
- `data-spacing-contract="editorial-scroll"`: multi-page templates that preserve reading rhythm and allow natural scrolling.

New templates must select the device-appropriate contract before template-specific spacing is added. Canvas-fit fixed lengths are allowed only for hard safety bounds, one-pixel rules, safe-area offsets, and minimum control or touch sizes. Mobile-reading uses stable rem bases by design, respecting browser text scaling and customer typography settings.

## Canvas-fit templates

The active Basic contained-reading overrides above take precedence. Excluded/legacy canvas-fit presentations retain the adaptive PC/tablet policy in `docs/one-page-adaptive-layout.md`. The three-field reference is the default; excessive actual whitespace with a safe size gain or real wrapped-copy overflow permits a stable switch to actual content. PC/tablet single-page fit never falls back to scrolling, including portrait tablets. Between-item spacing retains its template mapping and copy-aware 1/1.10/1.20 multipliers. Template category ratios, outer insets, colors, fonts and notice anchors are preserved. Display, multi-page, retired and coming-soon engines are excluded. The older no-enlargement/three-field-only policy below is superseded for these seven PC/tablet presentations.

Canvas-fit spacing must be derived from viewport or container units and bounded with `clamp()`. Single-page fit chooses a readable bounded candidate and then probes the actual rendered partition for safe enlargement. Typography and its existing gap mapping grow together; neither may break its reading floor or crop text. Display retains its separate row-budget policy.

The shared hierarchy is:

1. internal copy gap;
2. item-to-item gap (`1`);
3. category-title-to-first-item gap (`1`);
4. category-to-category gap without a divider (`2.6`);
5. category boundary with a divider (the existing balanced space on both sides of the rule).

For PC/tablet single-page item-to-item boundaries only, multiply the existing rhythm by `1.10` when just one of secondary name/description is visible, or `1.20` when neither is visible. Both visible fields, or additional promotion/origin/trait support, keep the normal rhythm. Use actual rendered/translated visibility, not the mere presence of starter fields. Do not apply this multiplier to mobile, the last item, category/heading/widget/footer boundaries, or to nested copy gaps. Declare its CSS base alias on the item stack, where the density token exists, never on a root that refers to a descendant-only variable.

### Earlier scoped PC/tablet update — 2026-10-13 (superseded)

The user subsequently requested conditional related-category regrouping, safe whitespace enlargement, linked featured names, a fixed relative header row and smaller mobile brand ceilings. The current policy is `docs/one-page-adaptive-layout.md`; this section records the earlier implementation for context.

Only three changes are approved: three-field product typography reference, the modest between-item adjustment above, and independent text-brand width fitting. Existing template-specific font/gap profiles, role ratios, outer insets, category spacing, column candidate rules, notice anchors and device detection remain unchanged. Display/multi-page and the completed mobile reading contract are excluded.

Product name + secondary-language name + description are three semantic fields, not a truncation limit for wrapped text. Primary candidate measurement uses one reference line for each supporting field even when the starter hides them. Reference paragraphs are hidden by default and enabled only synchronously during candidate calculation, then removed from flow before paint. Candidate measurement reserves the maximum 1.20 item boundary for image-led rows; actual visible boundaries use 1/1.10/1.20. Existing final DOM safety checks still take priority when real content is longer than the reference; they may back off to prevent clipping, never enlarge because supporting fields were hidden. No visible empty-copy spacer is added.

Text brands measure actual saved/starter script-aware fonts against their inner slot width, independently of menu density. The template-owned layout shell is passed into the fitter explicitly; DOM classes must never be used to guess the family. Horizontal topline headers target 65% of the actual central title cell's inner width. Every PC/tablet vertical brand column targets 75%; left-edge and center-column shells use the same selector. The longest planned line determines one shared font size for all lines. The former device-wide 40/80/60px and 44/88/64px limits are superseded: no fixed px title target/ceiling or template-name-specific title correction remains. The horizontal text-preserving safety floor is 8% of slot width with root text scaling; vertical brand columns retain 10%; height and coverage remain soft if that floor cannot mathematically fit. Logos bypass fitting. Mobile keeps its independent fitter and spacing values.

PC/tablet title selection compares one/two-line candidates under one shared policy, with no template-name branches or individual fixed sizes. Two lines may win even if one fits at the minimum, when they permit at least 15% larger text and their shorter/longer line-width ratio is at least 0.5. Otherwise prefer the single line; longer names use the fewest feasible balanced whole-word lines or safe natural wrapping without truncation. Adaptive horizontal headers start at 8% and grow to at most 14% of the available reading-frame height for the tallest measured title/supporting-copy block; vertical brand columns keep their shared slot-height calculation. Horizontal font size is bounded by 8%/22% of central slot width with root text scaling. Candidate heights use the rendered 1.08 line advance + 0.12em safe padding. Respecting the relative minimum and preserving the text take precedence when a customer name cannot mathematically fit that budget.

Horizontal topline layouts use three equal-width cells, independent of the featured/menu column calculations below. Description is left, the text title is centered in the middle cell, and notices are right. The middle cell and title lines must share the header/page center (allowing subpixel rounding). The 65% title target uses that middle cell's inner width, not the full row. The common fitter supersedes old skin-specific `ch` width caps; each planned line is explicitly nonwrapping so the browser cannot silently turn a one-line candidate into two. Line advance is measured in the selected fonts at 100px, with 1.08 as its lower bound: CJK fallback metrics can make actual line boxes taller than CSS leading. That measured advance plus 0.12em padding determines the height bound. This is shared layout geometry, not a per-template typography exception. Existing mobile width selection, body typography, item spacing, menu columns and footer anchors are unchanged.

Widgets are category-level content blocks. A category-to-widget or widget-to-widget boundary without a divider uses the same category-to-category ratio, and widget-to-category uses the same divider or no-divider rule as a category boundary. A `bottom` widget may add flexible space above its final-column stack, but widget-to-footer-notice spacing uses the same item-to-item rhythm token and must never be replaced by a separate fixed reserve.

Single-page skins inherit these values from the CafeA spacing tokens. A skin can adjust the bounded scale, but must not replace the semantic tokens with a fixed `px` margin, padding, or gap.

Rosy Orange uses a visual correction of `1.25` from category title to first item and `3.6` between divider-free categories because its large title and title-only rows need a clearer section boundary. Real Matcha uses `2.9` between divider-free categories so its title underline and compact rows remain visually distinct. Mocha Forest uses `3` between categories and `1.2` from heading to items on PC/tablet (`1` on mobile); it must not add per-item bottom padding on top of the shared item rhythm.

REAL MATCHA single-page desktop/landscape-tablet category-to-category transitions explicitly use the `2.9` separation token. Its category boundary rule is visually hidden, so the shared divider-before token (`1`) must not replace that separation or lose the hidden divider's trailing space. The override is scoped to actual same-column visual category transitions and the single-page policy; two-column fallback uses it too. That 2026-10-11 follow-up did not change mobile/portrait-scroll spacing, category-title-to-first-item spacing, widget/footer boundaries or legacy multi-page presentations. Mobile now follows the separate 2026-10-12 contract below. Candidate measurement and final rendering use the same CSS; column counts remain content-driven, not fixed.

Viewport and fit calculations may change the base item gap, but semantic ratios are constants applied exactly once after that base calculation. Do not multiply a semantic ratio by a fit, device, density, or viewport scale again.

Display templates use the calculated content row (`--display-row`) as the base unit. Category-title-to-first-item spacing must use the same row-budget scale as item-to-item spacing.

### PC/tablet fit gap policy

All seven one-page templates use the gap mapping belonging to the selected layout mode: ordered flow, ordered balanced flow, or balanced flow. A template may keep its visual shell boundaries and category ratios, but it must not replace the common item-gap calculation or the shared `0.74` item-rhythm coefficient with a template-key-specific mapper or coefficient. Candidate measurement, committed fit state, validation and overflow backoff use the same mapping. Product-internal title/chip/secondary/promotion/description gaps and image-to-information gaps also use the common fit-linked tokens; a skin may restyle those elements but must not replace their spacing. Mobile uses the independent reading contract below.

## Single-page mobile-reading contract — 2026-10-12

The initial 18px/mobile template-ratio correction is historical (`docs/one-page-mobile-rhythm-qa.md`). The approved unified contract below is the current mobile source of truth; PC/tablet calibration remains unchanged.

Applies only to REAL MATCHA, Mocha Forest, Sunday Roasters, Van Gogh, ROSY ORANGE, Loop Bagel and ONUE TABLE. Display, multi-page and inactive engines are unchanged. Explicit preview device hints win; public views infer the device with the existing viewport hook (<768px is mobile). Portrait tablet remains a PC/tablet policy and now uses the same single-viewport engine. The earlier portrait reading-scroll behavior is superseded.

- Mobile does not fit a viewport or compress body font/gap values when there is more content. Content scrolls naturally. Only the brand title follows the independent, bounded width policy below; it never changes body type or spacing.
- Mobile selected in an explicitly wide preview/new window still uses mobile reading typography. PC media-query category/secondary sizing is excluded with a zero-specificity `:where(:not([data-cafe-a-mobile-style="true"]))` gate, preserving PC/tablet selector priority.
- Item-to-item gap is `1.25rem` (20px at the default 16px root), independent of item count, supporting-copy visibility or phone width/height. No 1.15×/1.35× adjustment on mobile. Last items have zero trailing margin.
- Stable typography bases: item name/price `1rem`, supporting copy/notices/category descriptions `0.875rem`, secondary name `0.75rem`, category `1.625rem`. Store text brand alone is width-fitted with a 44px minimum. Fonts/colors remain template-owned; old title/category/notice numeric exceptions are removed. Current one-page typography normalization fixes global/role size settings; this rollout does not introduce a new customer size control.
- Section gap is the mobile-only `3rem` token. It governs **upper brand/logo + description + optional featured area/notices → first category**, category/widget boundaries, and the final mobile footer boundary. Do not add a last-item margin or independent outer row gap on top.
- Featured enabled: its section ends the upper area. Featured disabled: header/last upper notice/ROSY ORANGE's whole brand section ends it. This preserves ordering without moving notice anchors or changing desktop fixed shells.
- PC/tablet retain their distinct category-separation ratios (2.9/3.4/3/2.6/3.25/3.6). Mobile no longer aliases those ratios and uses 48px boundaries for all seven templates.

DOM regression helpers in `scripts/lib/one-page-mobile-rhythm.mjs` assert nonzero fixed item gaps, linked upper/category/footer gaps, no copy-aware fit leakage and stable typography across 320/390/430px widths. Unit tests alone are insufficient; inspect each template and settle the PC/tablet fit before accepting rendered geometry.

### Approved unified mobile values — 2026-10-12

Applies to the same seven active single-page templates, not Display or multi-page. This mobile rollout did not change PC/tablet formulas, candidates or notice anchors; its former PC/tablet 1/1.15/1.35 ratios were separately reduced to 1/1.10/1.20 on 2026-10-13. Mobile uses its own variables rather than PC/tablet category-separation/title-device aliases.

| Role / gap | Default at 16px root |
| --- | --- |
| Item name / price / featured item name / featured price | 16px |
| Description / store description / notices / widget body | 14px |
| Secondary name / ordinary chip / price-option label | 12px |
| Category title | 26px common base; registered font-metric correction may adjust the calculated size |
| Store title | Minimum 44px; bounded width fit described below |
| Item boundary | 20px (1.25rem), regardless of copy visibility/count |
| Heading group or underline end to first item | 24px (1.5rem) |
| Category/widget/footer boundary / upper area to first category | 48px (3rem) |
| Upper control row / control touch target | 48px / at least 44px |
| Control row to brand / brand to description | 12px, one shared token |
| Upper content blocks | 24px |
| Brand/logo to store description | 12px |
| Category title to category description (either order) | 8px |
| Item title/secondary/description internal boundary | 2px; no empty-copy spacer |
| Notice paragraphs | Zero extra gap; normal supporting-copy line-height (1.5), preserving internal line breaks |
| Upper colored box inner padding | 24px |
| Responsive featured frame | 4:5, no item-count/density-driven minimum height |

Every active one-page representative image uses the shared 4:5 frame with centered `object-fit: cover` on PC, tablet and mobile. The image fills the full frame and may crop equally from the overflowing axis; a template or individual asset must not replace this with `contain` or another fit mode. Transparent artwork may remove a fallback background or placeholder, but that visual exception cannot alter image fitting. Menu widgets remain a separate, user-positionable system with their own fit and position controls. The menu manager recommends at least 1200×1500px at 4:5 so the image fills the frame without ratio-driven cropping.

Common mobile sizes remain the baseline. Notices are 14px and categories use a 26px base in all seven templates; old template-key brand/category/notice size multipliers are removed. Darumadrop One alone has shared role-aware font-metric corrections (1.10 for brand, 1.18 for category) because its visible letter body is materially smaller at the same nominal size. The brand correction keeps the four-letter mobile result within the 72px visual ceiling. The correction follows the selected role font across every template and disappears when the customer selects another font; it is not a template-specific exception. All mobile supporting-copy line-height is 1.5, including Loop Bagel; its 1.38 PC/tablet correction is unchanged. Fonts, colors, starter data, featured product links, ordering and existing notice placement are preserved. Language controls use the saved/starter font variables with script-aware labels for all seven; Loop Bagel's starter remains Pretendard / Bagel Fat One, with no hardcoded UI font override.

Every one-page language trigger, including the Call-enabled mobile globe, uses the final rendered store-title color. The language popup uses the final rendered category-title color. These colors are resolved after template panels and customer typography settings, so template-specific trigger or popup color overrides are not allowed.

The boundary target is the first category block, not its first product row. A heading and its internal 24px gap come after that boundary. Colored upper-area padding belongs inside an actual wrapper; the following 48px belongs to the menu surface, not the upper color. Mocha Forest's new mobile-only upper wrapper contains its header and optional cover; the old brown-painted scroll padding must not swallow the external gap. ROSY ORANGE's existing wrapper uses 24px bottom padding and a 48px external boundary. Optional upper content must not leave empty spacer nodes.

Line rules: REAL MATCHA retains an 8px title-to-underline inset and 24px after the underline edge. Sunday Roasters is the only mobile template with a visible category-boundary rule: it splits the shared 48px category boundary evenly into 24px before and 24px after the stroke, so the rule sits between categories instead of attaching to the next heading. Its PC/tablet canvas follows the same principle by splitting that device's fluid category-boundary token evenly around the stroke. Empty description fields contribute no gap. Stroke thickness is not counted as whitespace.

Van Gogh's starter has no ordinary item chips; only active timed-sale chips render. Customer-added chips still use one black-background/white-text palette, an irregular sketch edge and no fixed border outside the editor's background/text color model.

### Current mobile brand-width policy

The earlier KOHI-only 80% pilot and the subsequent 65% / 48px policy are historical (`docs/mobile-brand-65-qa.md`). The bounded policy applies identically to all seven mobile text brands. `MobileBrandTitle` measures the selected script-aware fonts at 100px and computes against actual header inner width, not the width of the text itself. Minimum: `max(44px, 2.75rem)` for browser text scaling. Single-line visual ceiling: `max(minimum, innerWidth * 56 / 342)`; multiline ceiling: `max(minimum, innerWidth * 44 / 342)`. A one-line brand with 3–4 non-space graphemes may use `max(regular ceiling, innerWidth * 64 / 342)` only when its measured coverage at the regular ceiling is below 45%; one/two-character and five-or-more-character names keep the regular ceiling. These are bounded values at a 390px phone with the shared 24px left/right insets, not fixed target sizes for every title. No template-specific ceiling multiplier may override them; minimum size, whole-text preservation and wrapping remain shared.

Prefer one intact line if it fits at the minimum. Enlarge toward 100% but stop at the visual ceiling; 60–100% coverage is a preference, not an unconditional constraint for a very short customer name. When wrapping is necessary, choose the fewest balanced whole-word lines that fit at the minimum. All lines share one font size; the longest line targets 75% subject to the multiline ceiling. Minimum, ceiling and intact words take priority if 65%+ coverage is mathematically unavailable. If no whole-word partition fits, split safely at grapheme boundaries, never truncate. CJK uses grapheme-aware balancing. Exceptional very long names use natural balanced wrapping within the full inner width at the minimum without losing characters. Keep existing safe line-height and glyph padding; do not introduce ink-bound optical gap correction. Hidden measurement spans are zero-sized/overflow-clipped so a very long reference text cannot enlarge page scroll width.

Only container-width, title and typography/font-load changes recompute brand fitting. Do not observe sale timers/menu counts or feed brand results into the menu canvas fit loop. Logos use the existing logo branch. This mobile policy runs only when `onePageRhythmMode` is `mobile`; PC/tablet use the separately bounded brand fitter described above, while Display/multi-page remain excluded. Keep upper control-row/brand/copy/section gaps unchanged.

Typography profiles identify font characteristics without changing the shared semantic size limits. Every one-page profile uses the common 1.35rem PC and 1.30rem tablet linked item-name/price ceiling; mobile keeps its independent reading sizes. Loop Bagel still selects the reusable `heavy-display` profile for font behavior, but it no longer owns a template-only size cap. Its text brand uses the same 75% vertical-rail one/two-line comparison as every other PC/tablet vertical brand column, without a template or device multiplier.

## Editorial-scroll templates

Multi-page templates do not stretch or compress content to fill a viewport. They keep a stable editorial rhythm, a maximum readable width, and natural vertical scrolling.

Their page inset, column gap, section gap, item gap, and copy gap must still be fluid `clamp()` values. Content count must not drive a fit/fill loop, font reduction, or artificial vertical expansion.

## Verification

Mocha Forest's ordered menu surface owns its ivory-panel palette in React, independently of row packing and category fragmentation. Its existing panel CSS supplies wine primary/supporting ink; the brown brand rail keeps ivory ink. Do not depend on a post-layout category-rectangle scan to install the menu palette: ordered categories may have `display: contents` or span columns. Geometry checks must be accompanied by rendered menu/brand/call and language-palette checks when panel ownership changes.

REAL MATCHA boundary follow-up (2026-10-11): local in-app browser checks settled to `ready` without content clipping or horizontal overflow on tablet 1198×838 (Korean grouped/fill, Chinese/Japanese grouped) and PC 1440×900 (Korean grouped, English fill). Actual same-column category margins were exactly `2.9` times the base rhythm, including the English fill two-column fallback; the Korean grouped tablet margin was 32.23px. All 18 items remained visible. Portrait tablet 838×1198 and mobile 390×844 retained scrolling layouts with all 18 items and no horizontal clipping. KOHI tablet retained `3.4` category spacing and all 17 items; no browser error/warning logs were observed. The 537-test suite, TypeScript, targeted ESLint, production build and whitespace checks passed. These checks cover this scoped boundary change, not the remaining six templates' full proportion rollout.

Changes to an active template spacing engine require:

- the spacing contract source test;
- TypeScript and lint checks for touched files;
- PC, tablet landscape/portrait, and mobile DOM overflow checks;
- confirmation that the final settled layout has no clipped category, item, price, badge, or widget content.

### PC/tablet one-page chip placement — 2026-10-13

Measure the name's unwrapped width, chip group and row inner width in every fit candidate and final crop check. If the name alone fits but name + chips + gap does not, move the chips to the next line while preserving name/price first-row alignment. A naturally long name retains its inherent wrapping; chips move below if they add further name lines. Restore inline placement when width/font changes make the pair fit. Scope this to the seven adaptive one-page templates, excluding mobile, Display and multi-page.

### Shared top-row outer spacing — 2026-10-13

Sunday Roasters and Van Gogh share the same responsive outer padding and header-to-menu gap formula. Van Gogh's former PC-only smaller vertical padding and row gap are removed. Their three-cell header starts at 8% and grows only as needed for the measured title, store description or notices, capped at 14% of the available board height after the row gap. The central title targets 65% of its actual cell width with 8%/22% width-relative font limits. Preserve their individual typography/decorations and the independent mobile, multi-page and display policies.

PC-only top-row one-line refinement: a confirmed one-line text brand uses 75% of the shared base header-to-menu gap. Balanced two/multiple lines, uncertain natural wrapping, logos and tablet/mobile devices keep their normal gap. Line selection measures against the unscaled gap to avoid feedback; viewport/font/title changes and unmount restore/recompute the policy. Do not change outer padding or the fixed-row height bounds.

### Featured-role and leader corrections — 2026-10-14

Featured name/chip/price sizes equal their respective menu counterparts in all seven one-page templates on PC/tablet/mobile. This supersedes the earlier PC/tablet featured-name-to-supporting-copy link. Descriptions/notices retain the support atom. ROSY ORANGE adaptive leaders reserve at least 0.75 name-em, remain visible beside the first name line when chips move below, and span the remaining row without a PC auto-start margin or short cap. Chip decisions reserve the leader, use unwrapped intrinsic sizes, and also move chips below when they add extra wrapped-name lines. Central-brand fourth-menu-column rescue checks all five actual columns, excluding no fixed-brand width from the readability budget.

### Calculation ownership - 2026-10-14

Adaptive packing uses registered, conventional, related and bounded free packing tiers in that order, with the existing material-improvement and barrier checks. Stable content signatures include option prices, price-column values, traits, widgets and featured settings; elapsed countdown ticks are excluded. Mobile does not install canvas-fit observers. Reuse chip measurements for identical row inputs and skip unchanged geometry/duplicate viewport notifications. The final crop check remains authoritative; caching never bypasses real content/font/viewport changes. The three-field reference is the default typography safety basis, not a permanent empty-row reservation: one/two-field content with at least 12% verified longest-column headroom, or at least 8% headroom with broad low occupancy, may switch to actual-content packing only after a safe linked size gain of at least 8%, including when the item-name atom is already at its shared ceiling.

All one-page PC/tablet typography profiles share the same product-name ceiling: 1.35rem on PC and 1.30rem on tablet. This is a visual upper bound, not a forced size; measured fit may select a smaller value. Mobile keeps its independent fixed reading policy.

### Notice/language linkage and quieter brands - 2026-10-14

For all seven one-page presentations, notice 1/2/3 and language trigger/menu labels share the menu-description size. Notice Korean and English runs both use the saved Korean font. Language UI keeps the saved Korean/English font by script. Category descriptions and time-sale supporting text share the product-description size. PC text-brand ceilings are 87.5% of their prior geometry-derived ceiling, preserving minimums and header bounds. Tablet ceilings stay unchanged. Mobile single/multiline ceilings are 56/44px at 342px inner width, preserving the 44px minimum and text; the common 3–4-grapheme, under-45%-coverage branch may raise only the single-line ceiling to 64px.

Time-sale messages, deadline labels and countdown digits also use the saved Korean font for both Korean and English in every one-page PC/tablet/mobile presentation. Discount price fonts and language UI script fonts retain their existing roles; Display and multi-page are excluded.

All one-page menu/featured text chips, including sale/sold-out badges and trait chips, use the saved Korean font for Korean and the saved English font for English. Mixed-script labels use script-aware runs. This supersedes fixed legacy chip fonts, preserving chip size/color and device-specific placement; time-sale supporting messages/countdowns keep their separate Korean-font-only rule.

### Approved two-field exception - 2026-10-14

Only name+secondary or name+description items gently increase their remaining secondary/description field by 5%. A description-only item's discount explanation and matching featured description follow that size. Three-field and name-only items do not increase. Category/store descriptions, notices and language UI keep the linked base size. This is an explicit exception to uniform description sizes, not a canvas density multiplier. Mobile uses 12.6px secondary / 14.7px description at a 16px root, keeping existing item/section/internal gaps; PC/tablet measurements include the actual increase.

### Portrait tablet grid and decorative insets - 2026-10-14

Actual balanced columns must match the fitted partition. A menu region below the existing 640px two-column width threshold keeps two columns even for dense menus; item/category counts cannot force three narrow columns. Portrait adaptive inner wrappers use their root's content-box height, excluding outer decorative padding, so Loop Bagel's featured frame and its rounded lower corners stay above the checker band. Verify both tablet orientations, actual column geometry, inter-block overlap and complete featured-frame bounds in addition to viewport overflow.

### Optional one-page Call presentation - 2026-10-14

Only an enabled Call configuration with a valid table context shows Call controls. PC/tablet use a circular Bell + call-label button in the last/rightmost menu column's measured footer, after widgets and immediately before existing lower-right notices. Without lower-right notices it docks at the lower-right content edge. In top-row shells, the language UI occupies the furthest bottom-right position and the Call button stacks immediately above it; center-brand notice anchors retain their template placement. Button accents are selected from the rendered menu palette: prefer the brand color when it contrasts with the actual surrounding panel, otherwise use a readable category/menu accent (for example wine in Mocha Forest). The icon/text choose the higher-contrast dark/light foreground. This replaces the mandatory store-name-to-circle-color link; the mobile top bar still follows the rendered store-name color. Reserve the complete footer height during fitting and include Call mode/table context in content/cache signatures; never cover items, widgets or notices or enable canvas scrolling.

Mobile replaces the existing language-control row with a transparent three-slot bar: Bell left, table label centered, globe-only language trigger right. All three use the rendered store-name color. Bell and globe are both 24px (1.5rem); Table label uses the saved Korean font for every script and numeral, sharing the base product-description size token (the approved per-item 5% exception remains local to that item). The enabled Call bar is 56px high with 44px minimum controls and a 16px brand gap; OFF keeps the original 48px language row and 12px brand gap. A mobile-only fixed bottom staff-call button uses the selected readable menu accent and the same action, respects the safe-area inset, and reserves an additional 5rem plus the inset after the existing bottom padding so final content remains unobscured. The dock uses a 0.75rem (12px at default root) corner radius, above decorative checker strokes (dock z-index 80, checker 60); the dialog remains above both. Menu-reading fonts and 20/24/48 spacing remain independent. OFF restores the original controls without empty Call slots. Preview has a default-off checkbox immediately before the detached-view link, preserves its state through device/orientation/locale/new-window URLs, uses Table 1, and opens the existing simulated Call dialog without requests. Real reception/activation remains a separate backend rollout; Display and multi-page presentation are unchanged.

Loop Bagel starter and template fallback Korean font are Pretendard; saved customer typography remains authoritative. Legacy supporting-copy rules resolve the saved Korean font rather than a fixed Nanum Gothic face.

### Detached preview viewport

The new-window link preserves content, locale and Call preview flags, but omits device/orientation overrides. Actual preview routes without an explicit valid device pass no override to the renderer: the browser viewport selects PC/tablet/mobile naturally. Device iframe URLs retain their explicit device/orientation, so the framed selector still simulates its requested layout. This applies to both starter and saved-menu previews; Display and multi-page engines keep their existing responsive policies.

### Shared one-page canvas typography and available frame — 2026-10-14

All seven adaptive PC/tablet templates use category size = linked item-name size × 1.6 × saved category role scale as the common base. The registered Darumadrop One category correction follows that selected font on PC, tablet and mobile; no template-key size multiplier applies. Mobile still starts from the shared 26px category base before a registered font correction. Other legacy template/device category multipliers do not override the common base. The device type multiplier is exactly 1, so tablet 1.12 and template 1.04 multipliers cannot multiply chips/categories again after fitting. Saved fonts, weights and colors and each layout shell remain authoritative; actual pixel sizes vary with content/font/viewport fit.

Adaptive boards use the complete available root content box, without the legacy 1920px width / 1080px height ceiling. Decorative outer padding still reserves its space; the full-viewport change does not cover checker bands or change content insets. Fit caches/observers recompute against that actual frame, preserving readable rem floors, bounded font candidates, linked role sizes and final crop safety. Display, multi-page, inactive engines and all mobile 16/14/12/26px and 20/24/48px reading rules retain their independent policy.

### Visible column gutters and mobile Call top edge — 2026-10-14

All seven adaptive PC/tablet templates link ordinary visible column gutters to the page inline inset (`--board-padding`), without a second density/device multiplier. ROSY has no extra menu-column inline inset. Mocha's ordinary ivory menu columns each reserve half this gutter, while the first menu column beside the brown brand panel reserves a full gutter measured from that colored edge. The brown panel and outer edges retain one page inset. Portrait Mocha already has outer board padding, so the final panel must not reserve it again. These are measured content gaps, not just CSS grid gaps, and participate in the same fit measurement.

Enabled mobile Call bars use a 56px row with 24px bell/globe icons and start at the top page edge, allowing only the device safe-area inset. The Call row-to-brand gap is 16px; the Call-OFF language row remains 48px with its existing 12px brand gap. Transparent background, fonts and colors remain. Mocha's colored upper box loses only its top inset when Call is ON. Loop's upper checker band is the topmost decoration and reserves its own height before the 56px Call row. OFF preserves the original mobile header/decoration insets; PC/tablet, Display and multi-page Call placement is unchanged.

### Colored-panel edges — 2026-10-14

For adaptive PC/tablet layouts, a menu column immediately beside a visibly colored brand panel measures its gutter from the colored background edge to the neighboring column's first content edge. Mocha Forest therefore gives the first menu column one full page-inset clearance from the brown panel edge; ordinary ivory menu-to-menu boundaries still combine two half insets into one page inset. The brown panel keeps its own full internal page inset. ROSY ORANGE already satisfies the same contract through a page-inset grid gap on each side of its gradient center rail; keep menu-column inline padding at zero so the gap is not doubled.

### Mobile language popup ink — 2026-10-15

The language trigger and its white popup surface use separate color roles. A trigger may use a bright inverse color on a dark brand panel, but mobile popup items use `--cafe-a-language-menu-ink`, falling back to the saved category role color and then `#191c1b`. Mocha Forest sets this popup role to its brown representative color. This rule changes only popup legibility; trigger color, saved script-aware fonts and PC/tablet controls remain unchanged.

### Panel-flow shell — ONUE TABLE (2026-10-16)

`brand_panel_flow` is an independent fourth PC/tablet shell. Equal-width white panels use the shared content-driven column candidates; there is no extra brand-only column and no fixed three-panel count. Page background stays customer-editable. Outer insets and panel gutters share one small bounded token; menu panel insets are separate. A render-only first atomic order barrier measures the representative area in the common packer without creating a saved customer widget. The first panel's menus continue immediately beneath it. Panel padding and the enabled last-column Call footer participate in the same fit-height budget. Typography, item rhythm, cache invalidation and category order tiers use the shared engine.

The representative photograph has a fixed **4:3 on PC/tablet** and **1:1 on mobile**, both centered cover. The 2026-10-20 review retains the mobile square: at 320px, a 4:3 frame clips logo+description+featured content at approved reading sizes. Recommend a **1600×1600px** source so one uploaded image supports both crops; PC/tablet shows the centered 1600×1200-equivalent area. Ratios never change with text length or menu density. Language controls occupy the top-right row. Brand + store description are centered between that row and the bottom featured-product copy, with equal flexible gaps (at least 12px) on both sides. PC/tablet notices 1/2/3 occupy the rightmost panel bottom, below the optional Call button. The panel title uses the common brand-column fitter (75% slot-width target, shared one/two-line comparison and reading-frame height budget); only the measured controls, description and featured copy constrain its available safety height. There is no independent 22%-of-image title cap. Actual overlap invalidates crop safety. Text-brand and logo are mutually exclusive; logos remain contained and undistorted. Disabling/hiding the representative image removes the image and its aspect-ratio reservation, retaining natural-height identity text. On white, preserve saved brand ink if it meets 4.5:1 contrast; otherwise try saved category ink, then #33221E. Image mode retains saved brand ink over a dark scrim.

Mobile reuses independent 16/14/12/26px reading type and 20/24/48px rhythm. For this shell only, the mobile 56px Call bar is inside the representative image at its top edge; with Call OFF, the 48px language row aligns to the top right of the same area. Mobile notices 1/2/3 use the common right-aligned footer after the complete menu list, with the shared 48px section boundary; they never appear in the representative identity. Cover OFF keeps the controls in the natural-height plain intro. Display and multi-page engines are excluded.

### Panel-flow default and readable panel insets — 2026-10-16

PC/tablet representative frames mirror the language-control row's shared `3rem` minimum in their bottom grid row. Without featured-product copy, this balances the top/bottom occupied bands and centers the complete brand + description group in the photograph, rather than below the language row. Featured copy may use a taller bottom row; the title safety budget reserves the greater of that copy's actual height and the controls height. Mobile composition and natural-height cover-OFF content remain unchanged.

Panel-flow shells default to `orderedFit` (채움형 배치) in starter provisioning, public renderer, preview and menu editor. Registered order continues item by item across panels; categories can continue in the next panel while individual products remain intact. Explicit saved mode choices are respected. Other shells retain their grouped default. Menu panel content uses `clamp(2.25rem, 4vmin, 3.25rem)` on all four sides; image frames stay flush to the first panel's top and side edges. Ordinary outer gutters retain the existing small shared token. The ordered CSS-column canvas paints equal white panel backgrounds independently from text insets, measures the flush image and inset copy as one physical column, and reserves the lower-right Call footer. Mobile spacing is unchanged.

### Ordered rescue and actual copy — 2026-10-16

Before an adaptive ordered-flow reference fit commits a fourth rescue column, retry actual visible copy in the preferred one-to-three-column widths. Accept only a measured non-overflow candidate at the shared standard readable scale or above, with at least 8% wider columns; persist `actual` as the measurement basis. This avoids an unnecessary mostly empty rescue panel caused by reference-only support rows. If no safe readable candidate exists, retain reference fitting and the rescue. Content/font/viewport changes still reset the basis, and final DOM crop and footer no-go checks remain authoritative. This is shared ordered-flow safety policy, not an ONUE text-size multiplier.


### Ordered flow on wide, short canvases — 2026-10-16

The normal ordered-gap mapping is unchanged at fit font scales of 0.95 and above. Below that scale, its width-dependent floor can decrease continuously to 0.64, still bounded by the common 0.55rem CSS item-gap floor and the shared 0.74 rhythm coefficient. This lets safe preferred-width packing reduce inter-item/category spacing after text reaches its readable floor, instead of reserving a mostly empty fourth column for Call/notices. All templates using ordered PC/tablet flow share this mapping; mobile reading gaps and template panel insets are unchanged. A fourth column remains available when safe readable packing actually needs it.


### Fragment-aware ordered category boundaries — 2026-10-16

Ordered flow determines the next visual block from each category's physical `getClientRects()` fragments, not its union bounding box spanning several columns. Only the trailing fragment's following category/widget sets the block's boundary attribute. A category continued into a second column therefore retains the same common boundary token and zero last-item trailing margin as adjacent nonfragmented categories. Image-bearing categories have no separate boundary multiplier. Existing color-panel assignment and first-column divider suppression remain separate; mobile reading boundaries are unchanged.

### Ordered-flow audit follow-up — 2026-10-16

The registered next block owns ordered-flow **spacing**, even if that spacing pushes its follower into another column. Do not repeatedly remove/reapply the gap from post-layout geometry: that can alternate column breaks and miss boundaries. Physical fragments still own column decoration and supply boundaries without a registered follower. Refresh after final safety/copy/row-height changes. Adaptive 768–1023px tablets reuse the canvas boundary tokens, suppress the legacy sibling top margin and clear last-item margin once a category boundary owns it. Mobile retains its separate contract.

Header side-copy height includes its full scroll height when the current header already clips it, within the existing header ratio bounds. Central-brand grid widths must follow the candidate `--fit-columns` during measurement, including the extra brand column. A rejected actual partition cannot survive through settled-state retention. The initial audit and the subsequent ordered-row correction are recorded in `docs/one-page-ordered-layout-qa.md`. Passing the starter matrix does not guarantee every possible customer input.


### One shared ordered-row canvas — 2026-10-16

All eight adaptive PC/tablet shells use `ordered-canvas-layout.ts` and `ordered-flow-packing.ts` for ordered item flow. Keep React ownership and registered source order; measure and position existing rows at each candidate's real inner width. A heading and its first item form one atomic unit; remaining products may continue into the next column without splitting an item. The central-brand shell reserves its brand track but uses the same row packer instead of whole-category partitions. Full-bleed first-panel media retains its fixed aspect ratio and menu inset below it.

Read item gaps (including the 1/1.10/1.20 copy rhythm), heading gaps, category boundaries and separator clearances from existing computed common tokens. Do not introduce another spacing or typography scale. Suppress a category's leading separator clearance only at a column start. Keep each template's existing notice location: header/central-brand notices stay there; menu-footer notices and Call/language controls dock to the final menu column's bottom/right inset. Measure their actual height and reserve that height plus one common item gap in the last column before packing. Footer descendants cannot count as menu/footer collisions with themselves; actual menu leaves, images and widgets still undergo collision checks.

The semantic three-field reference remains the sizing constraint. Score fill using actual painted rows, so invisible reference rows cannot justify another sparse column. Reject an otherwise safe reference candidate if its actual wrapped copy clips. Keep at least one atomic content row in each selected track when enough rows exist, including the footer track. Restore actual positions after synchronous probes and clear owned positions when leaving ordered canvas mode. The side-media top-band shell may try 28%, then 24%, then 20% media width only when the previous width yields no safe ordered candidate; the chosen share belongs to fit state/cache identity. Readable text floors, all content, at most three preferred menu columns and the existing 12rem rescue-width rule remain mandatory. No canvas row packer, media-width rescue, footer reservation or fit probe may change mobile reading, Display or multi-page geometry.

## Mobile ordering controls follow-up — 2026-10-19

When Order is enabled, the mobile header shows cart only (Bell remains for Call-only). The shared bottom row shows Order, Call, or Order+Call according to independent feature flags, using the existing reserved bottom reading space. This approved control update changes no 20/24/48 body rhythm, name/price alignment, PC/tablet canvas-fit policy or Display engine. Cart UI is an explicit Pretendard 400–600 operational dialog, independent of template artwork typography.
