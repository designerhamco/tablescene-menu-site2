# Menu template spacing contract

## Scope

Every active menu template must declare one spacing contract on its root element.

- `data-spacing-contract="canvas-fit"`: single-page and Display templates that fill one viewport.
- `data-spacing-contract="editorial-scroll"`: multi-page templates that preserve reading rhythm and allow natural scrolling.

New templates must select one contract before template-specific spacing is added. Fixed lengths are allowed only for hard safety bounds, one-pixel rules, safe-area offsets, and minimum control or touch sizes.

## Canvas-fit templates

The seven active dining single-page templates share the proportion-first behavior in `lib/one-page-proportion-policy.ts`: no secondary whitespace-fill enlargement, and copy-visibility-aware item boundaries. Numeric font/gap ceilings, role proportions and screen corrections remain template-owned. KOHI retains its approved `lib/kohi-fit-policy.ts` calibration; its `1.20`/`1.24` ceilings are NOT copied to other templates. Display, multi-page, retired and coming-soon engines are excluded. See `docs/one-page-proportion-rollout.md` for scope and verification limits.

Canvas-fit spacing must be derived from viewport or container units and bounded with `clamp()`. Single-page fit chooses a readable bounded primary candidate and may scale down to prevent cropping; it must not enlarge again merely to erase residual whitespace or expose intermediate layouts. Display retains its separate row-budget policy.

The shared hierarchy is:

1. internal copy gap;
2. item-to-item gap (`1`);
3. category-title-to-first-item gap (`1`);
4. category-to-category gap without a divider (`2.6`);
5. category boundary with a divider (the existing balanced space on both sides of the rule).

For single-page item-to-item boundaries only, multiply the existing rhythm by `1.15` when just one of secondary name/description is visible, or `1.35` when neither is visible. Both visible fields, or additional promotion/origin/trait support, keep the normal rhythm. Use actual rendered/translated visibility, not the mere presence of starter fields. Do not apply this multiplier to the last item, category/heading/widget/footer boundaries, or to nested copy gaps. Candidate measurement and final rendering must use identical CSS.

Widgets are category-level content blocks. A category-to-widget or widget-to-widget boundary without a divider uses the same category-to-category ratio, and widget-to-category uses the same divider or no-divider rule as a category boundary. A `bottom` widget may add flexible space above its final-column stack, but widget-to-footer-notice spacing uses the same item-to-item rhythm token and must never be replaced by a separate fixed reserve.

Single-page skins inherit these values from the CafeA spacing tokens. A skin can adjust the bounded scale, but must not replace the semantic tokens with a fixed `px` margin, padding, or gap.

Rosy Orange uses a visual correction of `1.25` from category title to first item and `3.6` between divider-free categories because its large title and title-only rows need a clearer section boundary. Real Matcha uses `2.9` between divider-free categories so its title underline and compact rows remain visually distinct. Mocha Forest keeps the shared `1` and `2.6` ratios and must not add per-item bottom padding on top of the shared item rhythm.

REAL MATCHA single-page desktop/landscape-tablet category-to-category transitions explicitly use the `2.9` separation token. Its category boundary rule is visually hidden, so the shared divider-before token (`1`) must not replace that separation or lose the hidden divider's trailing space. The override is scoped to actual same-column visual category transitions and the single-page policy; two-column fallback uses it too. Mobile/portrait-scroll spacing, category-title-to-first-item spacing, widget/footer boundaries and legacy multi-page presentations are unchanged. Candidate measurement and final rendering use the same CSS; column counts remain content-driven, not fixed.

Viewport and fit calculations may change the base item gap, but semantic ratios are constants applied exactly once after that base calculation. Do not multiply a semantic ratio by a fit, device, density, or viewport scale again.

Display templates use the calculated content row (`--display-row`) as the base unit. Category-title-to-first-item spacing must use the same row-budget scale as item-to-item spacing.

### Loop Bagel PC/tablet pilot

Loop Bagel alone uses `getLoopBagelFitGapScale()` for its numeric CafeA fit calibration. Mobile and other templates retain their own base gap values, with the common between-item copy adjustment above. The gap scale is derived from the selected font scale plus a continuous, bounded correction for menu-container width and viewport height, not the residual empty space after content layout:

- width progress: `clamp((menuWidth - 640) / 800, 0, 1)`;
- height progress: `clamp((viewportHeight - 640) / 440, 0, 1)`;
- correction: `0.94 + 0.10 * widthProgress + 0.06 * heightProgress`;
- upper limit: `0.78 + 0.22 * widthProgress + 0.10 * heightProgress`;
- gap scale: `clamp((fontScale + 0.02) * correction, 0.44, upperLimit)`.

The CSS pixel clamps and semantic ratios are unchanged. Candidate measurement, committed fit state, validation, and overflow backoff use the same mapping. Loop Bagel skips the secondary whitespace-driven enlargement/final-fill boosts; the primary fit selection and DOM-crop safety checks remain active. This pilot does not prescribe the same numeric calibration for another template.

## Editorial-scroll templates

Multi-page templates do not stretch or compress content to fill a viewport. They keep a stable editorial rhythm, a maximum readable width, and natural vertical scrolling.

Their page inset, column gap, section gap, item gap, and copy gap must still be fluid `clamp()` values. Content count must not drive a fit/fill loop, font reduction, or artificial vertical expansion.

### KOHI full-bleed separators

`cafe_kohi_a` keeps the REAL MATCHA content insets and `canvas-fit` rhythm. Only its decorative SVG rules use page coordinates: vertical column rules extend from page top to bottom, and horizontal rules extend to the adjacent column rules or outer page edge. The overlay is absolutely positioned, non-interactive and outside the measured menu board; it must not add border height, change fit candidates, or affect content gaps.

Category descriptions render before their category name only in KOHI. Every starter category has a concise visible description in all four locales. In `orderedFit`, heading/item fragments are measured separately so a category continuing into the next column does not create a false heading or cross-column horizontal rule. Rules remain hidden while the desktop fit safety cover is active and refresh on layout, viewport, font and image changes. Scrolling/mobile layouts use a single menu column with page-wide horizontal rules and no vertical split through the brand area.

KOHI's category-title-to-first-item ratio is `2` and its category separation ratio is `3.4`, each applied once to the existing item rhythm. Desktop visual category transitions use the separation token instead of the smaller shared divider-before token. Scrolling layouts remove the last item's margin before applying category separation. Its approved proportion-first numeric calibration and common copy-aware item rhythm are independent of these category ratios.

## Verification

REAL MATCHA boundary follow-up (2026-10-11): local in-app browser checks settled to `ready` without content clipping or horizontal overflow on tablet 1198×838 (Korean grouped/fill, Chinese/Japanese grouped) and PC 1440×900 (Korean grouped, English fill). Actual same-column category margins were exactly `2.9` times the base rhythm, including the English fill two-column fallback; the Korean grouped tablet margin was 32.23px. All 18 items remained visible. Portrait tablet 838×1198 and mobile 390×844 retained scrolling layouts with all 18 items and no horizontal clipping. KOHI tablet retained `3.4` category spacing and all 17 items; no browser error/warning logs were observed. The 537-test suite, TypeScript, targeted ESLint, production build and whitespace checks passed. These checks cover this scoped boundary change, not the remaining six templates' full proportion rollout.

Changes to an active template spacing engine require:

- the spacing contract source test;
- TypeScript and lint checks for touched files;
- PC, tablet landscape/portrait, and mobile DOM overflow checks;
- confirmation that the final settled layout has no clipped category, item, price, badge, or widget content.
