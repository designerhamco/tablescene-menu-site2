# Menu template responsibilities

This refactor moves existing declarations without changing formulas, tokens, content order, presentation routing or CSS. The file split preserved rendering. The user subsequently approved the top-row spacing correction described below.

## Presentation boundaries

- `MenuTemplateRenderer.tsx` chooses the supported template and presentation.
- The seven one-page starters share `CafeDesignA.tsx` as the renderer and state coordinator. Its PC/tablet fitting is enabled by the one-page fit policy; mobile uses the separate reading policy.
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

## One-page PC/tablet structures

`lib/one-page-layout-shells.ts` owns the fixed template-to-structure mapping. Common font links, readable floors, order/packing rules and fit safety apply across structures, while their fixed content placement differs.

| Structure | Templates | Fixed content |
| --- | --- | --- |
| First column | REAL MATCHA, Mocha Forest, Loop Bagel | First brand/featured column |
| Central column | ROSY ORANGE | Total 3/4/5 columns place the brand in column 2/2/3 |
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
