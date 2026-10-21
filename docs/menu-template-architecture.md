# Menu template responsibilities

Catalog preview controls are composed by `MenuPreviewDeviceFrame` and `MenuPreviewOptionsPanel`. The frame owns temporary selection/navigation; the panel owns the responsive light overlay and functional/design tabs. At outer browser widths of 960px and above, the left panel starts open and overlays the menu. It never reserves layout space or changes the preview's position, size, scale or iframe viewport. Narrow top options start closed. A hydration-safe media subscription supplies the responsive default until an explicit user toggle; explicit choices survive resizing/navigation. Closing unmounts the design controls/picker but preserves their values in the frame. Customer renderers and menu reading geometry are independent of drawer state.

This refactor moves existing declarations without changing formulas, tokens, content order, presentation routing or CSS. The file split preserved rendering. The user subsequently approved the top-row spacing correction described below.

## Presentation boundaries

- `MenuTemplateRenderer.tsx` chooses the supported template and presentation.
- Formal REAL MATCHA (`cafe_design_a`, single presentation) and its hidden compatibility test use `experimental/RealMatchaPaged.tsx` for PC/tablet contained reading. That component delegates mobile unchanged to `CafeDesignA.tsx`.
- The other six Basic single-page templates use `one-page/NativeBasicScroll.tsx` for PC/tablet contained geometry. It reuses their native CafeDesignA visual primitives and the approved `lib/basic-menu-scroll.ts` measured ordered packer. Original mobile rendering stays in CafeDesignAClassic; multi-page and inactive branches retain their prior policies.
- `one-page/pc-tablet/cafe-fit-engine.ts` owns fit candidates, geometry, content estimates, column packing, crop measurement and state comparisons. It exports existing functions for the coordinator; it does not set mobile reading typography.
- `lib/mobile-brand-title-fit.ts`, `shared/MobileBrandTitle.tsx` and `one-page/mobile/MobileNoticeList.tsx` handle independent mobile title fitting and notice rendering. Mobile 20/24/48px body rhythm and 12px language/brand/description gap remain scoped in CSS.
- `multi-page/MultiPageMenuEngine.tsx` and its Desktop/Stack presentations retain their existing page-based policy and device breakpoint. They do not inherit one-page fit rules.
- `DisplayMenuA.tsx` retains its separate display engine and row budget.

## Shared parts

- `shared/cafe-template-types.ts`: existing data, content-block and measurement contracts.
- `shared/cafe-menu-pricing.ts`: existing price-option/price-column formatting and selection, shared by rows and layout estimates.
- `shared/cafe-template-content.ts`: existing brand/logo/image visibility and supporting-copy class selection.
- `CafeDesignA.tsx`: composing rows, featured content, headers, template skins, state/effect coordination and routing of the existing inactive Noir skin. It still contains these responsibilities; this is not a full rewrite of the renderer.

Shared components may render the same price or name, but presentation policies retain separate scopes. Existing functions and constants were moved verbatim. Source-contract tests read the renderer plus the extracted modules instead of assuming every declaration lives in one file.

`MenuAppearanceScope` applies optional Basic/Dining radius and chip overrides without changing native defaults. Basic store introductions and Dining cover descriptions receive the saved Korean face for both scripts; Dining retains its larger cover-description size. The same raw `page_settings.design.appearance` configuration is read by the Design editor, public renderer and catalog previews. Advertisement radius crosses the dialog portal explicitly for both Basic and Dining. Dining cover image/overlay frames clip together, and its product frames/images, logo, widgets and existing sold-out chips share the corresponding saved controls. Imageless cover pages, course image suppression and page/sidebar navigation retain their existing rules. Album ratios share this scope for Basic and Dining; list/course/cover rules remain independent. The mobile price exception is a deterministic image-plus-three-options row class in CafeDesignA, without the removed category-width measurement hook. `MenuCartCountBadge` shares rendered-icon ink/contrast across service entry points; `shared/menu-image-radius.ts` carries thumbnail geometry into the common lightbox. Neutral designs reuse these paths.

## Catalog feature examples

`lib/menu-preview-design.ts` validates and applies catalog-only temporary design overrides to the same Design JSON consumed by real menus. It exposes three font groups, bounded appearance values and separate background roles; it cannot override customer content or storage URLs. `PreviewDesignOptions` supplies value controls in the device frame's Design tab. `designPreview` survives preview URL navigation, while the UI-only `previewOptions` tab parameter is excluded from actual iframe URLs. `MenuAppearanceScope` reads optional saved background fields, and scoped representative geometry keeps internal panel padding separate from outside gutters. No save action or customer write is invoked by preview controls.

`lib/template-preview-data.ts` adapts explicit catalog option overrides only. It preserves source data, fills every missing eligible field, supplies a cover/featured example for empty starters and preserves explicit widget previews, synthesizing a full image+title+body example only when none exists. Saved-menu/public routes never import this adapter. Starter records supply default examples only when creating/resetting menus; they do not update existing customers.

Widget rendering follows `getTemplateCapabilities(...).menuWidgets.enabled`, not a parallel template-key allowlist. `CafeAWidgetBlock` and its `toCafeAWidgetPreview` adapter are reused by Dining A/B after the current page's category/standalone content; sorting, visibility, image fitting and the existing generic editor/save path remain shared. Priced-course imagery/one-column exceptions are independent.

## One-page PC/tablet structures

`lib/one-page-layout-shells.ts` owns the fixed template-to-structure mapping. Common font links, readable floors, order/packing rules and fit safety apply across structures, while their fixed content placement differs.

| Structure | Templates | Fixed content |
| --- | --- | --- |
| First column | REAL MATCHA, Mocha Forest, Loop Bagel | First brand/featured column |
| Central column | ROSY ORANGE | Fixed native rail between two synchronized menu tracks |
| Top row | Sunday Roasters, Van Gogh | Three equal header cells; content-driven 8–14% row; central brand width target 65% |

Template-owned fonts, role ratios, decorative rules, category boundaries and featured-area differences remain intact.

## Shared top-row spacing — approved 2026-10-13

Sunday Roasters and Van Gogh now inherit the same outer padding and header-to-menu row-gap formula. Removed Van Gogh's PC-only `padding-block` and `--sunday-line-row-gap` overrides; preserved its typography and decorative rules.

At PC 1516×844, both use approximately 38.2838px padding on all four sides and a 42.9258px base header-to-menu gap. PC text brands confirmed to occupy one line use 75% of this gap (32.19435px at this viewport); two/multiple lines and tablet devices keep the full base gap. Previously Van Gogh used 14.348px top/bottom padding and a 9.284px gap. These numbers are measured examples; the shared CSS derives values from viewport units and root-relative clamps, not fixed targets.

Landscape/portrait tablets use the same measured 8–14% header height and 65% central title-width target. Mobile, multi-page and display policies are independent.

## Refactor verification

339 existing named declarations retained their exact bodies/initializers. Unit tests: 590 passed. TypeScript, changed-file ESLint and production build passed. Browser QA covered 32 one-page viewport/device conditions plus three excluded engines; no failures or page errors occurred. Compared the 32 one-page results to pre-refactor records: item counts, column/category arrangement, brand text and measured font sizes matched. No CSS or spacing values changed.

Top-row spacing correction verification: 590 tests and production build passed. Both templates passed 20 browser conditions covering PC 1516×844 / 1920×1080, landscape/portrait tablets, ordered flow, KO/EN/ZH/JA and narrow/wide mobile. Computed padding and row gaps matched across templates in every paired PC/tablet case; no crop, price-alignment failure or page error occurred.

PC-only one-line top-row rule: determine the line count from the actual saved-font brand fit, not the template name. Unknown natural wrapping and logos retain the normal gap. Title candidate selection uses the unscaled base gap to avoid a one/two-line switching loop. Recompute on name, font, device and viewport changes; restore the normal gap on unmount/presentation change. Outer padding remains independent; the row itself uses the shared content-driven 8–14% range.

PC one-line gap verification: 591 tests, changed-file ESLint and production build passed. 24 header viewport/device/language conditions passed, including wide tablet hints. Two same-mounted-preview resizes restored/reapplied the gap. First-column and central-column PC checks plus three excluded engines passed. At PC 1516×844 the confirmed one-line Van Gogh gap is 32.1944px; two-line Sunday Roasters remains 42.9258px. Outer padding remains 38.2838px on all sides.

## Hidden paginated REAL MATCHA experiment

`experimental/RealMatchaPaged.tsx` owns only PC/tablet measured pagination and the fixed brand/menu/footer geometry. It reuses named CafeDesignA visual primitives (identity, category, item, hero, language, sale clock, image lightbox); `PagedMenuItem` is an adapter rather than a second visual implementation. Its original-skin DOM key remains `cafe_design_a`, while `data-paged-template-key` identifies the experiment. The independent menu div region prevents legacy one-page tablet section rules from leaking into this shell. Mobile still delegates to the original CafeDesignA renderer. See `docs/real-matcha-paged-design-qa.md`.

## Hidden REAL MATCHA scroll experiment — 2026-10-19

Formal REAL MATCHA single-page, its neutral Basic default and `cafe_real_matcha_paged_test` use contained scrolling on PC/tablet through `RealMatchaPaged.tsx`. The original visual primitives and mobile CafeDesignA remain shared. `lib/basic-menu-scroll.ts` partitions measured ordered units and selects readable column counts. `experimental/scroll-name-readability.ts` measures actual product-name text ranges after thumbnail/price/chip layout at a shared device type ceiling. This width/wrapping comparison takes priority over one-screen fit when choosing two versus three columns; there is no automatic fourth column. Sparse/narrow one-column fallback remains. Both modes use the same device type ceiling and base rhythm, with overflow allowed. Grouping changes category partition boundaries, never font size. Grouped categories remain intact; flow continues products without repeating headings. Notices consume only the last column, following trailing widgets. The fixed representative rail and bottom call/order dock remain outside the shared scroll viewport. A conditional, pointer-transparent background fade reflects real remaining content. `docs/basic-menu-scroll-policy.md` defines the authoritative scoped rules. Other six canvas-fit starters, multi-page and Display remain independent.

## Default design completion — 2026-10-20

All six neutral reviews are registered: four Basic structures and Dining paged/sidebar. Sidebar reuses Dining B’s layout with the same neutral sample content as paged Dining, without altering the original B preset. `default-design-localization.ts` maps translated source content by stable IDs after neutral sample creation. Operational strings are explicit `useMenuText` calls from `MenuLocaleScope`; portals retain that context. No DOM text rewriting or saved-customer-content translation is used. The upper-left review alone has a 4:3 representative image on every device; the remaining mobile reading rules are independent.

## Album reviews and advertisement popup — 2026-10-20

Four album reviews extend the six default list designs through an explicit `itemLayout` in `menu-design-policy.ts` and `DefaultDesignScope`. They reuse existing Basic first-column/top-row and Dining paged/sidebar structures and item/order primitives. Basic album categories use a responsive card grid inside the existing contained viewport; list packing stays untouched, and fixed-identity overflow is still checked. Dining album cards keep course-level order units and stacked item price options, each with its own dotted leader and right-aligned price/add control. Ordinary mobile album cards, including uncategorized/standalone pairings, use the same 1–2 column grid and gutter regardless of price options. Basic album purchase rails fill the actual card width without the list renderer’s 13rem price cap. Configured-price courses always suppress item images and use one vertical item column. The top-row Basic album defaults its representative area OFF. The original six list designs and customer renderer keys are unchanged.

`MenuPageRenderer` composes the optional advertisement dialog outside the ordering shell so it works independently of Call/Order. `lib/menu-popup.ts` reads the existing JSON settings and owns max-three images and Storage path/URL validation. The editor's separate Advertising tab saves through the existing menu-edit authorization gate and draft upload API. No schema or Storage-policy change is required. Display and absent/OFF configurations do not mount the popup. Preview opt-in is labeled Advertising and uses neutral image placeholders with slightly different backgrounds. The image fills the dialog width; compact dots sit inside its lower edge and the only close control is a white, shadowed X. No footer, daily suppression or localStorage dismissal remains. Closing allows the advertisement to appear on the next entry.

## 2026-10-21 저장 배경·대표영역 설정

`menu-design-surfaces.ts`가 메뉴관리 배경/정렬의 검증·기본값·비파괴 JSON 적용을 맡는다. `MenuSurfaceSettingsForm`은 기존 컬러피커를 쓰고, 권한 확인된 디자인 서버 액션이 저장한다. `MenuAppearanceScope`는 저장 배경·대표영역 정렬·다이닝 커버 소개색과 모바일 내비게이션 대비를 렌더러에 연결한다. 베이직 패널 geometry는 기존 contained 구조를 재사용하며 메뉴 가격·안내 앵커·독립 모바일 읽기 규칙은 바꾸지 않는다. 다이닝 커버 배경은 기존 최상위 키 하나를 재사용하고 디자인 스냅샷에서 복원한다. 검수는 `docs/menu-editor-color-plan.md`를 따른다.
