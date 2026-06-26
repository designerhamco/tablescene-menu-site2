# MenuLink Basic Template Engine Rules

## 1. Purpose

This document records the current CafeA behavior and uses it as the baseline for future MenuLink Basic templates.

The goal is to make future Basic templates, such as CafeB or CafeC, reuse the verified Basic layout engine rules and change only the visual skin tokens and sample data when the structure is compatible.

This is a documentation baseline, not a refactor. Current CafeA code still mixes engine logic and skin styling across `components/menu-templates/CafeDesignA.tsx` and `app/globals.css`.

## 2. Current baseline: CafeA

CafeA is the current stable Basic template baseline.

Current baseline files:

- Renderer and fit/fill logic: `components/menu-templates/CafeDesignA.tsx`
- Desktop/mobile visual tokens: `app/globals.css`
- Basic layout mode order and default: `lib/menu-layout-modes.ts`
- Template capabilities: `lib/template-capabilities.ts`
- Starter/reset data flow: `lib/menu-starter-presets.ts`
- Demo data: `lib/template-demo-data/cafe-design-a.ts`
- Badge visuals: `lib/template-badge-styles.ts`
- Typography preset connection: `lib/template-typography-presets.ts`
- Preview layout query handling: `app/templates/[templateKey]/preview/page.tsx`
- Editor layout mode UI: `components/mypage/menu-editor/MenuManagementSection.tsx`

CafeA desktop/tablet uses a fixed-height board at `lg` and above. Mobile uses a separate `lg:hidden` vertical-scroll layout. Desktop fit/fill is not applied strongly to mobile.

## 3. Layout modes

Basic templates expose two customer-facing layout modes:

- `orderedBalancedFit`: 묶음형 자동 배치
- `orderedFit`: 채움형 배치

`orderedBalancedFit` is the Basic default. `orderedFit` is the secondary option. This order is defined by `BASIC_LAYOUT_MODE_ORDER` in `lib/menu-layout-modes.ts`, and the default is `BASIC_DEFAULT_LAYOUT_MODE = "orderedBalancedFit"`.

Existing saved values must be respected. Missing, invalid, or legacy layout values should fall back to `orderedBalancedFit` through `BASIC_LAYOUT_MODE_ALIASES` and `normalizePcTabletLayoutMode` instead of forcing a data rewrite.

### orderedBalancedFit / 묶음형 자동 배치

Engine rules:

- Preserve category registration order.
- Preserve item order inside each category.
- Keep category blocks intact.
- Do not split a category block across columns.
- Use contiguous category partitions.
- Every column must start with a category block, not an orphan menu item.
- All columns share the same `fontScale` and `gapScale`.
- The selected column count is an output of the scoring process, not the goal.

### orderedFit / 채움형 배치

Engine rules:

- Preserve registration order.
- Use CSS multi-column flow.
- Menu/category flow may continue into the next column.
- Use `column-fill: auto` and `break-inside` behavior.
- Treat the first column as the primary visual fill column.
- All columns share the same `fontScale` and `gapScale`.

Internal legacy values such as `balanced` or `balancedExperimental` may still exist for fallback/preview compatibility, but they are not the current customer-facing Basic standard.

## 4. Shared visual shell rules

Within the same template, layout modes may use different algorithms, but they must share the same visual shell.

Shared shell rules:

- Same outer wrapper structure.
- Same desktop board/container structure.
- Same mobile scroll policy.
- Same page padding rhythm unless a documented mode-specific correction exists.
- Same menu area width policy.
- Same column gap rhythm.
- Same category gap rhythm.
- Same category title to first item gap rhythm.
- Same menu row rhythm.
- Same menu name, secondary name, description, price, and chip hierarchy.
- Same text-to-divider rhythm.
- Same chip-to-price rhythm.
- Same divider line style.
- Same badge/chip visual language.

The layout mode can change how content is distributed. It must not make the template look like a different design.

Current CafeA note: `orderedFit` has a slightly wider board padding correction in CSS. This is stable today, but it should be documented as a CafeA-specific correction, not silently copied as a Basic-wide default.

## 5. CafeA current tokens and behavior

CafeA desktop tokens currently live mostly in `app/globals.css`.

Important CSS variables and behaviors:

- Desktop board padding baseline: `--board-padding: clamp(30px, 4vmin, 64px)`
- Desktop fixed rail width: `--fixed-column-width: clamp(280px, 26vw, 420px)`
- Desktop menu column gap: `--menu-board-column-gap: clamp(36px, 3.3vw, 60px)`
- Desktop board uses left fixed rail plus right menu area.
- Column gap uses `calc(var(--menu-board-column-gap) * var(--fit-menu-gap-scale))`.
- `orderedFit` applies a slightly larger board padding correction.
- `orderedBalancedFit` applies its own menu typography/visual scale correction.

CafeA base typography hierarchy:

- Category title: `--cafe-a-category-title-size`
- Menu title: `--cafe-a-menu-title-size`
- Meta/secondary name: `--cafe-a-menu-meta-size`
- Description: `--cafe-a-menu-description-size`
- Price: `--cafe-a-price-size`

Current base values are approximately:

- Category title: `1.1875rem`
- Menu title: `1rem`
- Meta/secondary: `0.75rem`
- Description: `0.8125rem`
- Price: `1.0625rem`

Desktop mode-specific multipliers are applied in CSS, so the hierarchy is stable but not yet fully expressed as a clean engine-level token contract.

CafeA badge/chip behavior:

- Badge visuals use the CafeA preset in `lib/template-badge-styles.ts`.
- Price option chips are rendered by the CafeA renderer.
- Public price options are capped by `maxPriceOptionsPerItem`.
- CafeA currently uses `maxPriceOptionsPerItem: 3`.

CafeA capability state:

Enabled:

- `priceOptions`
- `itemBadges`
- `categoryDescription`
- `itemDescription`
- `featuredItemHero`

Disabled:

- `menuItemImages`
- `logoImage`
- `originInfo`
- `itemTraits`

CafeA starter/sample data is skin data, not engine logic.

## 6. Fit/fill and density rules

Basic fit/fill principles:

- Desktop/tablet should avoid crop.
- Desktop/tablet should avoid page scroll.
- Horizontal overflow is not allowed.
- Bottom fill is optimized after safety.
- Mobile keeps vertical scroll.
- All columns in a layout share the same `fontScale` and `gapScale`.
- Do not use per-column scale.
- Do not hide crop with `overflow-hidden` and treat it as success.

CafeA current behavior:

- Density is based on visible content volume, including item count.
- `fontScale` controls typography scale.
- `gapScale` controls gap rhythm.
- `orderedBalancedFit` measures visible item/text/price/content bottom gaps in more detail.
- `orderedFit` focuses primarily on the primary column bottom gap.
- Both modes use actual DOM measurement and fallback safety checks.

Safe fit/fill principle:

Fit/fill should be handled inside typography, row rhythm, and gap density. It should not repeatedly change page padding, visual shell ratio, or core column ratio just to chase a target column count.

Current and future engine reinforcement:

- CafeA now measures explicit right-edge per-element safety for menu names, secondary names, prices, price tokens, badges/chips, and category titles.
- The shared right-edge safety threshold is `BASIC_RIGHT_EDGE_SAFETY_GAP_PX = 8` in `lib/basic-template-constants.ts`.
- Future Basic templates should reuse the same right-edge safety check instead of relying only on scroll width.
- Do not rely only on `documentScrollWidth === clientWidth`.
- Do not rely only on `pageScroll === false`.
- Confirm the last visible item, price, and category block are inside the board.

Policy constants centralized in this stage:

- `BASIC_DEFAULT_LAYOUT_MODE` and `BASIC_LAYOUT_MODE_ORDER` stay in `lib/menu-layout-modes.ts`.
- `BASIC_LAYOUT_MODE_ALIASES` stays in `lib/menu-layout-modes.ts`.
- `BASIC_RIGHT_EDGE_SAFETY_GAP_PX` lives in `lib/basic-template-constants.ts`.
- QA viewport lists live in `lib/basic-template-constants.ts`.

Values intentionally not centralized yet:

- CafeA page padding, column gap, category gap, row gap, and CSS layout variables.
- CafeA font scale, gap scale, candidate scale, fit/fill scoring, and density threshold values.
- CafeA visual skin tokens such as cover rail, divider, badge/chip, and typography multipliers.

## 7. Crop/overflow/ellipsis safety rules

Success requires visible content to be inside the board, not merely hidden.

Required safety checks for Basic templates:

- No vertical crop.
- No horizontal overflow.
- No desktop page scroll.
- No clipped final menu item.
- No clipped price token.
- No clipped category heading.
- No orphan category title without visible items in `orderedBalancedFit`.
- No ellipsis as a normal layout solution.

CafeA already has strong bottom crop and clipping checks through actual DOM measurement in `CafeDesignA.tsx`. It also checks scroll dimensions, rendered rectangles, and explicit right-edge safety metrics. Future templates should preserve this check before treating a candidate as safe.

## 8. Capability rules

Basic engine code should read template capability rules instead of assuming all features exist.

Reusable capability-driven behavior:

- Price option rendering must respect `maxPriceOptionsPerItem`.
- Badges must render only when `itemBadges` is enabled.
- Category descriptions must render only when `categoryDescription` is enabled.
- Item descriptions must render only when `itemDescription` is enabled.
- Featured hero behavior must render only when `featuredItemHero` is enabled.
- Unsupported image/logo/origin/trait features must not leak into the template.

Current CafeA capability rules are defined in `lib/template-capabilities.ts`.

## 9. Engine vs skin separation

### Basic common engine

These should be reusable across compatible Basic templates:

- Layout mode handling.
- `orderedBalancedFit` category block partition.
- `orderedFit` multi-column flow.
- Crop/overflow/page-scroll defense.
- Mobile scroll policy.
- Visible/sort-order filtering.
- Price rendering priority.
- Price option max policy.
- Badge helper connection.
- Typography helper connection.
- Starter/preview layout-mode connection.
- Actual DOM measurement and visual QA policy.

### CafeA skin

These should remain CafeA-specific or become skin tokens:

- Cover rail design.
- Board background and color rhythm.
- CafeA typography multipliers.
- Category rule style.
- Price chip style.
- Badge/chip visual style.
- Fixed image/hero ratio.
- Store title and store description visual rhythm.
- CafeA starter sample data.

Future CafeB/CafeC templates should not recreate the Basic engine when their structure is compatible. They should reuse the engine and replace skin tokens plus sample data.

## 10. Risks and ambiguous areas

Current risks:

- Many magic numbers exist in candidate scales, safety gaps, fill penalties, and density thresholds.
  - Status: 향후 리팩토링 TODO.
- Engine and skin are mixed across `CafeDesignA.tsx` and `app/globals.css`.
  - Status: 향후 리팩토링 TODO.
- `orderedFit` and `orderedBalancedFit` do not use perfectly identical padding corrections.
  - Status: 문서로만 주의. Decide later whether this is a CafeA skin correction or a Basic-wide rule.
- Right-edge per-element safety is now explicit in CafeA, but the constants and helper still live inside `CafeDesignA.tsx`.
  - Status: 향후 리팩토링 TODO.
- Legacy `balanced` / `balancedExperimental` paths remain internally.
  - Status: 문서로만 주의. New templates should not add new customer-facing legacy modes.
- Typography hierarchy is stable but spread across CSS variables and mode-specific multipliers.
  - Status: 향후 리팩토링 TODO.
- `orderedFit` bottom-gap metrics are less semantically separated than `orderedBalancedFit`.
  - Status: 당장 유지, but document before reuse.

New template prohibition:

- Do not paste raw Stitch HTML/CSS as a renderer.
- Do not add a new controller just to preserve a target column count.
- Do not use fixed pixel layouts that break responsive behavior.
- Do not hide crop with `overflow-hidden`.
- Do not make `orderedFit` and `orderedBalancedFit` look like two different templates.

## 11. Rules for future Basic templates

For structurally similar templates:

- Reuse the Basic engine.
- Do not create a separate layout engine.
- Do not create a new controller unless the data contract truly changes.
- Preserve page padding, column gap, and row rhythm policy.
- Replace only skin tokens.
- Provide template-specific starter/demo data.
- Keep both Basic layout modes on the same visual shell.

For structurally different templates:

- A new visual shell is allowed.
- The Basic data contract should still be preserved.
- Fit/fill/crop safety rules still apply.
- `orderedFit` and `orderedBalancedFit` must share the template's visual shell.
- Mobile vertical scroll policy must remain.

Hard rule:

The column count is a result. Design ratio and safety margin come first.

## 12. QA policy

Use representative QA for normal changes and wider DOM sweeps only for layout engine risk. The viewport lists are also recorded as constants in `lib/basic-template-constants.ts`.

Lightweight QA viewports:

- `1440`
- `1280`
- `1024`
- `768`
- `390`

Additional problem viewports:

- `1366`
- `1240`
- `900`

Final DOM sweep viewports for layout engine, fit/fill, or crop-risk changes:

- `1440`
- `1366`
- `1320`
- `1280`
- `1240`
- `1200`
- `1180`
- `1140`
- `1100`
- `1060`
- `1024`
- `1000`
- `960`
- `900`
- `834`
- `768`
- `390`

Do not run the full screenshot or DOM sweep for every small change. Text labels, starter data, and copy-only changes usually need lightweight QA. Layout engine, fit/fill scoring, column partition, padding, crop, overflow, or responsive shell changes need final DOM sweep.

## 13. Refactor TODO

Before rebuilding CafeB from CafeA, consider these refactor steps:

- Extract Basic engine constants from CafeA-specific renderer code.
- Separate visual skin tokens from layout scoring.
- Document and centralize candidate scales.
- Document and centralize safety gaps.
- Document and centralize fill penalty thresholds.
- Decide whether `orderedFit` padding correction is CafeA-only or Basic-wide.
- Extract explicit right-edge per-element safety checks into the future Basic engine layer.
- Add explicit ellipsis detection or at least text clipping detection where practical.
- Reduce legacy mode confusion around `balanced` / `balancedExperimental`.
- Define a skin token interface for cover rail, board color, typography multipliers, rules, price chips, and badge styles.
- Keep starter/demo data separate from engine behavior.

No CafeB renderer should be recreated until this separation direction is agreed.
