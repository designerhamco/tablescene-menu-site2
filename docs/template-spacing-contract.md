# Menu template spacing contract

## Scope

Every active menu template must declare one spacing contract on its root element.

- `data-spacing-contract="canvas-fit"`: single-page and Display templates that fill one viewport.
- `data-spacing-contract="editorial-scroll"`: multi-page templates that preserve reading rhythm and allow natural scrolling.

New templates must select one contract before template-specific spacing is added. Fixed lengths are allowed only for hard safety bounds, one-pixel rules, safe-area offsets, and minimum control or touch sizes.

## Canvas-fit templates

Canvas-fit spacing must be derived from viewport or container units and bounded with `clamp()`. The fitting engine may scale the shared rhythm down to prevent cropping or up to improve fill, but must not expose intermediate layouts.

The shared hierarchy is:

1. internal copy gap;
2. item-to-item gap (`1`);
3. category-title-to-first-item gap (`1`);
4. category-to-category gap without a divider (`2.2`);
5. category boundary with a divider (the existing balanced space on both sides of the rule).

Widgets are category-level content blocks. A category-to-widget or widget-to-widget boundary without a divider uses the same category-to-category ratio, and widget-to-category uses the same divider or no-divider rule as a category boundary. A `bottom` widget may add flexible space above its final-column stack, but widget-to-footer-notice spacing uses the same category-to-category token and must never be replaced by a separate fixed reserve.

Single-page skins inherit these values from the CafeA spacing tokens. A skin can adjust the bounded scale, but must not replace the semantic tokens with a fixed `px` margin, padding, or gap.

Round Focus uses a visual correction of `1.15` from category title to first item and `2.8` between divider-free categories because its large title and title-only rows otherwise compress the perceived boundary. Mocha Forest keeps the shared `1` and `2.2` ratios and must not add per-item bottom padding on top of the shared item rhythm.

Viewport and fit calculations may change the base item gap, but semantic ratios are constants applied exactly once after that base calculation. Do not multiply a semantic ratio by a fit, device, density, or viewport scale again.

Display templates use the calculated content row (`--display-row`) as the base unit. Category-title-to-first-item spacing must use the same row-budget scale as item-to-item spacing.

## Editorial-scroll templates

Multi-page templates do not stretch or compress content to fill a viewport. They keep a stable editorial rhythm, a maximum readable width, and natural vertical scrolling.

Their page inset, column gap, section gap, item gap, and copy gap must still be fluid `clamp()` values. Content count must not drive a fit/fill loop, font reduction, or artificial vertical expansion.

## Verification

Changes to an active template spacing engine require:

- the spacing contract source test;
- TypeScript and lint checks for touched files;
- PC, tablet landscape/portrait, and mobile DOM overflow checks;
- confirmation that the final settled layout has no clipped category, item, price, badge, or widget content.
