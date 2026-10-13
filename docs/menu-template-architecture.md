# Menu template responsibilities

This refactor moves existing declarations without changing formulas, tokens, content order, presentation routing or CSS. The user's spacing comparison remains pending; no inset or row-gap changes are included.

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
| First column | REAL MATCHA, KOHI, Mocha Forest, Loop Bagel | First brand/featured column |
| Central column | ROSY ORANGE | Total 3/4/5 columns place the brand in column 2/2/3 |
| Top row | Sunday Roasters, Van Gogh | Three equal header cells; 8–14% row; central brand width target 65% |

Template-owned fonts, role ratios, decorative rules, category boundaries and featured-area differences remain intact.

## Pending top-row spacing review

Measured in settled actual DOM at PC 1516×844:

| Template | Top/bottom padding | Left/right padding | Header-to-menu gap |
| --- | --- | --- | --- |
| Sunday Roasters | 38.2838px | 38.2838px | 42.9258px |
| Van Gogh | 14.348px | 38.2838px | 9.284px |

Van Gogh's PC-specific `padding-block` and `--sunday-line-row-gap` overrides in `app/globals.css` cause the difference. Padding exists on all four sides. At tablet 1198×838 both use 28.492px padding and 33.101px row gap; at portrait tablet 838×1198 both use 25.14px padding and 40px row gap.

Recommendation awaiting the user's design decision: share the outer inset token and header-to-menu gap formula across the two top-row templates. Keep row height responsive to one/two-line brands and preserve their individual font/decorative styles. This refactor does not apply that recommendation.

## Refactor verification

339 existing named declarations retained their exact bodies/initializers. Unit tests: 590 passed. TypeScript, changed-file ESLint and production build passed. Browser QA covered 32 one-page viewport/device conditions plus three excluded engines; no failures or page errors occurred. Compared the 32 one-page results to pre-refactor records: item counts, column/category arrangement, brand text and measured font sizes matched. No CSS or spacing values changed.
