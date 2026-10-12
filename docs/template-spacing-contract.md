# Menu template spacing contract

## Scope

Every active menu template must declare one spacing contract on its root element.

- `data-spacing-contract="canvas-fit"`: PC/tablet single-page and Display templates that fill one viewport.
- `data-spacing-contract="mobile-reading"`: the seven active single-page templates on phones; stable rem-based reading typography and natural scrolling, no canvas fitting or copy-visibility multipliers.
- `data-spacing-contract="editorial-scroll"`: multi-page templates that preserve reading rhythm and allow natural scrolling.

New templates must select the device-appropriate contract before template-specific spacing is added. Canvas-fit fixed lengths are allowed only for hard safety bounds, one-pixel rules, safe-area offsets, and minimum control or touch sizes. Mobile-reading uses stable rem bases by design, respecting browser text scaling and customer typography settings.

## Canvas-fit templates

The seven active dining single-page templates share the proportion-first behavior in `lib/one-page-proportion-policy.ts`: no secondary whitespace-fill enlargement, and copy-visibility-aware item boundaries. Numeric font/gap ceilings, role proportions and screen corrections remain template-owned. KOHI retains its approved `lib/kohi-fit-policy.ts` calibration; its `1.20`/`1.24` ceilings are NOT copied to other templates. Display, multi-page, retired and coming-soon engines are excluded. See `docs/one-page-proportion-rollout.md` for scope and verification limits.

Canvas-fit spacing must be derived from viewport or container units and bounded with `clamp()`. Single-page fit chooses a readable bounded primary candidate and may scale down to prevent cropping; it must not enlarge again merely to erase residual whitespace or expose intermediate layouts. Display retains its separate row-budget policy.

The shared hierarchy is:

1. internal copy gap;
2. item-to-item gap (`1`);
3. category-title-to-first-item gap (`1`);
4. category-to-category gap without a divider (`2.6`);
5. category boundary with a divider (the existing balanced space on both sides of the rule).

For PC/tablet single-page item-to-item boundaries only, multiply the existing rhythm by `1.15` when just one of secondary name/description is visible, or `1.35` when neither is visible. Both visible fields, or additional promotion/origin/trait support, keep the normal rhythm. Use actual rendered/translated visibility, not the mere presence of starter fields. Do not apply this multiplier to mobile, the last item, category/heading/widget/footer boundaries, or to nested copy gaps. Candidate measurement and final rendering must use identical CSS. Declare its CSS base alias on the item stack, where the density token exists, never on a root that refers to a descendant-only variable.

Widgets are category-level content blocks. A category-to-widget or widget-to-widget boundary without a divider uses the same category-to-category ratio, and widget-to-category uses the same divider or no-divider rule as a category boundary. A `bottom` widget may add flexible space above its final-column stack, but widget-to-footer-notice spacing uses the same item-to-item rhythm token and must never be replaced by a separate fixed reserve.

Single-page skins inherit these values from the CafeA spacing tokens. A skin can adjust the bounded scale, but must not replace the semantic tokens with a fixed `px` margin, padding, or gap.

Rosy Orange uses a visual correction of `1.25` from category title to first item and `3.6` between divider-free categories because its large title and title-only rows need a clearer section boundary. Real Matcha uses `2.9` between divider-free categories so its title underline and compact rows remain visually distinct. Mocha Forest uses `3` between categories and `1.2` from heading to items on PC/tablet (`1` on mobile); it must not add per-item bottom padding on top of the shared item rhythm.

REAL MATCHA single-page desktop/landscape-tablet category-to-category transitions explicitly use the `2.9` separation token. Its category boundary rule is visually hidden, so the shared divider-before token (`1`) must not replace that separation or lose the hidden divider's trailing space. The override is scoped to actual same-column visual category transitions and the single-page policy; two-column fallback uses it too. That 2026-10-11 follow-up did not change mobile/portrait-scroll spacing, category-title-to-first-item spacing, widget/footer boundaries or legacy multi-page presentations. Mobile now follows the separate 2026-10-12 contract below. Candidate measurement and final rendering use the same CSS; column counts remain content-driven, not fixed.

Viewport and fit calculations may change the base item gap, but semantic ratios are constants applied exactly once after that base calculation. Do not multiply a semantic ratio by a fit, device, density, or viewport scale again.

Display templates use the calculated content row (`--display-row`) as the base unit. Category-title-to-first-item spacing must use the same row-budget scale as item-to-item spacing.

### Loop Bagel PC/tablet pilot

Loop Bagel alone uses `getLoopBagelFitGapScale()` for its numeric CafeA fit calibration. Other PC/tablet templates retain their own numeric base gap values and the common copy adjustment. Mobile uses the independent reading contract below. The gap scale is derived from the selected font scale plus a continuous, bounded correction for menu-container width and viewport height, not the residual empty space after content layout:

- width progress: `clamp((menuWidth - 640) / 800, 0, 1)`;
- height progress: `clamp((viewportHeight - 640) / 440, 0, 1)`;
- correction: `0.94 + 0.10 * widthProgress + 0.06 * heightProgress`;
- upper limit: `0.78 + 0.22 * widthProgress + 0.10 * heightProgress`;
- gap scale: `clamp((fontScale + 0.02) * correction, 0.44, upperLimit)`.

The CSS pixel clamps and semantic ratios are unchanged. Candidate measurement, committed fit state, validation, and overflow backoff use the same mapping. Loop Bagel skips the secondary whitespace-driven enlargement/final-fill boosts; the primary fit selection and DOM-crop safety checks remain active. This pilot does not prescribe the same numeric calibration for another template.

## Single-page mobile-reading contract — 2026-10-12

The initial 18px/mobile template-ratio correction is historical (`docs/one-page-mobile-rhythm-qa.md`). The approved unified contract below is the current mobile source of truth; PC/tablet calibration remains unchanged.

Applies only to REAL MATCHA, KOHI, Mocha Forest, Sunday Roasters, Van Gogh, ROSY ORANGE and Loop Bagel. Display, multi-page and inactive engines are unchanged. Explicit preview device hints win; public views infer the device with the existing viewport hook (<768px is mobile). Portrait tablet remains a PC/tablet policy, even while it scrolls.

- Mobile does not fit a viewport or compress body font/gap values when there is more content. Content scrolls naturally. Only the brand title follows the independent, approved 65%-inner-width policy below; it never changes body type or spacing.
- Mobile selected in an explicitly wide preview/new window still uses mobile reading typography. PC media-query category/secondary sizing is excluded with a zero-specificity `:where(:not([data-cafe-a-mobile-style="true"]))` gate, preserving PC/tablet selector priority.
- Item-to-item gap is `1.25rem` (20px at the default 16px root), independent of item count, supporting-copy visibility or phone width/height. No 1.15×/1.35× adjustment on mobile. Last items have zero trailing margin.
- Stable typography bases: item name/price `1rem`, supporting copy/notices/category descriptions `0.875rem`, secondary name `0.75rem`, category `1.625rem`. Store text brand alone is width-fitted with a 48px minimum. Fonts/colors remain template-owned; old title/category/notice numeric exceptions are removed. Current one-page typography normalization fixes global/role size settings; this rollout does not introduce a new customer size control.
- Section gap is the mobile-only `3rem` token. It governs **upper brand/logo + description + optional featured area/notices → first category**, category/widget boundaries, and the final mobile footer boundary. Do not add a last-item margin or independent outer row gap on top.
- Featured enabled: its section ends the upper area. Featured disabled: header/last upper notice/ROSY ORANGE's whole brand section ends it. This preserves ordering without moving notice anchors or changing desktop fixed shells.
- PC/tablet retain their distinct category-separation ratios (2.9/3.4/3/2.6/3.25/3.6). Mobile no longer aliases those ratios and uses 48px boundaries for all seven templates.

DOM regression helpers in `scripts/lib/one-page-mobile-rhythm.mjs` assert nonzero fixed item gaps, linked upper/category/footer gaps, no copy-aware fit leakage and stable typography across 320/390/430px widths. Unit tests alone are insufficient; inspect each template and settle the PC/tablet fit before accepting rendered geometry.

### Approved unified mobile values — 2026-10-12

Applies to the same seven active single-page templates, not Display or multi-page. PC/tablet fit formulas, candidate limits, copy-aware 1/1.15/1.35 ratios, columns and fixed-shell notice anchors are not changed. Mobile uses its own variables rather than PC/tablet category-separation/title-device aliases.

| Role / gap | Default at 16px root |
| --- | --- |
| Item name / price / featured item name / featured price | 16px |
| Description / store description / notices / widget body | 14px |
| Secondary name / ordinary chip / price-option label | 12px |
| Category title | 26px, identical across all seven |
| Store title | Actual text width targets 65% of inner width, minimum 48px |
| Item boundary | 20px (1.25rem), regardless of copy visibility/count |
| Heading group or underline end to first item | 24px (1.5rem) |
| Category/widget/footer boundary / upper area to first category | 48px (3rem) |
| Upper control row / control touch target | 48px / at least 44px |
| Control row to brand / upper content blocks | 24px |
| Brand/logo to store description | 12px |
| Notice paragraphs | Zero extra gap; normal supporting-copy line-height (1.5), preserving internal line breaks |
| Upper colored box inner padding | 24px |
| Responsive featured frame | 4:5, no item-count/density-driven minimum height |

No template-specific mobile brand/category/notice size exception remains. Van Gogh notices are now 14px, Loop Bagel categories are 26px and REAL MATCHA/ROSY ORANGE/Loop Bagel brand multipliers are removed. Loop Bagel's existing item-description line-height 1.38 remains; other supporting-copy line-height is 1.5. KOHI's category description is 14px on mobile with its existing 800 weight, rather than an extra size multiplier. Fonts, colors, starter data, featured product links, ordering and existing notice placement are preserved.

The boundary target is the first category block, not its first product row. A heading and its internal 24px gap come after that boundary. Colored upper-area padding belongs inside an actual wrapper; the following 48px belongs to the menu surface, not the upper color. Mocha Forest's new mobile-only upper wrapper contains its header and optional cover; the old brown-painted scroll padding must not swallow the external gap. ROSY ORANGE's existing wrapper uses 24px bottom padding and a 48px external boundary. Optional upper content must not leave empty spacer nodes.

Line rules: REAL MATCHA retains an 8px title-to-underline inset and 24px after the underline edge. Sunday top rules retain 12px from line end to title. KOHI mobile changes its decorative geometry only: heading end → 8px → 1px stroke → 24px → first item; category boundary → 1px stroke → 12px → heading. The next category block's external margin remains 48px. Desktop/portrait-tablet midpoint geometry is unchanged. Stroke thickness is not counted as whitespace.

### Current mobile brand-width policy

The earlier KOHI-only 80% pilot and subsequent 44px fallback are historical. The user now explicitly approved a common 65% policy for all seven mobile text brands. `MobileBrandTitle` measures the selected script-aware fonts at 100px and computes against the actual header content width (page width minus its existing left/right padding), not a width derived from the text itself. The minimum is `max(48px, 3rem)` for browser text scaling; there is no template-specific multiplier or undisclosed maximum-font cap.

Choose the fewest balanced lines capable of reaching 65% at or above the minimum. Prefer whole-word boundaries. All lines share one font size; the longest line targets 65%, and other lines are balanced by measured width as closely as the words permit. If a whole word needs more than 65% at 48px but fits the full inner width, preserve the word and minimum, choosing the most balanced partition rather than the first one that merely fits the page; 65% is then a soft target, not a reason to shrink below 48px or distort text. If no whole-word partition fits the page at the minimum, split safely at grapheme boundaries, never truncate. CJK uses grapheme-aware balancing. Exceptional very long names use natural balanced wrapping in a 65%-width area at the minimum without losing characters. Keep safe line-height and glyph padding to avoid clipping. Hidden measurement spans are zero-sized/overflow-clipped so a very long reference text cannot enlarge page scroll width.

Only container-width, title and typography/font-load changes recompute brand fitting. Do not observe sale timers/menu counts or feed brand results into the menu canvas fit loop. Logos use the existing logo branch. This policy runs only when `onePageRhythmMode` is `mobile`; PC/tablet (including portrait), Display and multi-page are excluded until the user's separate PC/tablet specification. Keep upper control-row/brand/copy/section gaps unchanged.

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
