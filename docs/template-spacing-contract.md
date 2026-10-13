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

For PC/tablet single-page item-to-item boundaries only, multiply the existing rhythm by `1.10` when just one of secondary name/description is visible, or `1.20` when neither is visible. Both visible fields, or additional promotion/origin/trait support, keep the normal rhythm. Use actual rendered/translated visibility, not the mere presence of starter fields. Do not apply this multiplier to mobile, the last item, category/heading/widget/footer boundaries, or to nested copy gaps. Declare its CSS base alias on the item stack, where the density token exists, never on a root that refers to a descendant-only variable.

### Scoped PC/tablet update — 2026-10-13

Only three changes are approved: three-field product typography reference, the modest between-item adjustment above, and independent text-brand width fitting. Existing template-specific font/gap profiles, role ratios, outer insets, category spacing, column candidate rules, notice anchors and device detection remain unchanged. Display/multi-page and the completed mobile reading contract are excluded.

Product name + secondary-language name + description are three semantic fields, not a truncation limit for wrapped text. Primary candidate measurement uses one reference line for each supporting field even when the starter hides them. Reference paragraphs are hidden by default and enabled only synchronously during candidate calculation, then removed from flow before paint. Candidate measurement reserves the maximum 1.20 item boundary for image-led rows; actual visible boundaries use 1/1.10/1.20. Existing final DOM safety checks still take priority when real content is longer than the reference; they may back off to prevent clipping, never enlarge because supporting fields were hidden. No visible empty-copy spacer is added.

Text brands measure actual saved/starter script-aware fonts against their inner slot width, independently of menu density. PC and tablet share geometry-based targets: horizontal topline headers target 60% of the actual central title cell's inner width; vertical brand columns target 75% of their inner width. The longest planned line determines one shared font size for all lines. The former device-wide 40/80/60px and 44/88/64px limits are superseded: no fixed px title target/ceiling or template-name-specific title correction remains. A text-preserving safety floor is 10% of slot width, respecting root text enlargement; height and coverage remain soft if that floor cannot mathematically fit. Logos bypass fitting. Mobile keeps its previous independent fitter and all its existing spacing values.

PC/tablet title selection compares one/two-line candidates under one shared policy, with no template-name branches or individual fixed sizes. Two lines may win even if one fits at the minimum, when they permit at least 15% larger text and their shorter/longer line-width ratio is at least 0.5. Otherwise prefer the single line; longer names use the fewest feasible balanced whole-word lines or safe natural wrapping without truncation. The common height budget is 18% of the reading frame's inner height (viewport height in a scrolling presentation), independent of current title/menu content height. Horizontal headers additionally cap that budget at 28% of the central title cell width, so a short two-word name does not expand into a tall brand-rail-sized block merely to gain a larger font. Candidate heights use the rendered 1.08 line advance + 0.12em safe padding. Respecting the relative minimum and preserving the text take precedence when a customer name cannot mathematically fit that budget.

Horizontal topline layouts use three equal-width cells, independent of the featured/menu column calculations below. Description is left, the text title is centered in the middle cell, and notices are right. The middle cell and title lines must share the header/page center (allowing subpixel rounding). The 60% title target uses that middle cell's inner width, not the full row. The common fitter supersedes old skin-specific `ch` width caps; each planned line is explicitly nonwrapping so the browser cannot silently turn a one-line candidate into two. Line advance is measured in the selected fonts at 100px, with 1.08 as its lower bound: CJK fallback metrics can make actual line boxes taller than CSS leading. That measured advance plus 0.12em padding determines the height bound. This is shared layout geometry, not a per-template typography exception. Existing mobile width selection, body typography, item spacing, menu columns and footer anchors are unchanged.

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
| Category title | 26px, identical across all seven |
| Store title | Minimum 44px; bounded width fit described below |
| Item boundary | 20px (1.25rem), regardless of copy visibility/count |
| Heading group or underline end to first item | 24px (1.5rem) |
| Category/widget/footer boundary / upper area to first category | 48px (3rem) |
| Upper control row / control touch target | 48px / at least 44px |
| Control row to brand / upper content blocks | 24px |
| Brand/logo to store description | 12px |
| Category title to category description (either order) | 8px |
| Item title/secondary/description internal boundary | 2px; no empty-copy spacer |
| Notice paragraphs | Zero extra gap; normal supporting-copy line-height (1.5), preserving internal line breaks |
| Upper colored box inner padding | 24px |
| Responsive featured frame | 4:5, no item-count/density-driven minimum height |

No template-specific mobile brand/category/notice size exception remains. Van Gogh notices are now 14px, Loop Bagel categories are 26px and REAL MATCHA/ROSY ORANGE/Loop Bagel brand multipliers are removed. All mobile supporting-copy line-height is 1.5, including Loop Bagel; its 1.38 PC/tablet correction is unchanged. KOHI's category description is 14px on mobile with its existing 800 weight, rather than an extra size multiplier, and the same 8px internal category-copy gap as the other templates. Fonts, colors, starter data, featured product links, ordering and existing notice placement are preserved. Language controls use the saved/starter font variables with script-aware labels for all seven; Loop Bagel's starter remains Nanum Gothic / Bagel Fat One, with no hardcoded UI font override.

The boundary target is the first category block, not its first product row. A heading and its internal 24px gap come after that boundary. Colored upper-area padding belongs inside an actual wrapper; the following 48px belongs to the menu surface, not the upper color. Mocha Forest's new mobile-only upper wrapper contains its header and optional cover; the old brown-painted scroll padding must not swallow the external gap. ROSY ORANGE's existing wrapper uses 24px bottom padding and a 48px external boundary. Optional upper content must not leave empty spacer nodes.

Line rules: REAL MATCHA retains an 8px title-to-underline inset and 24px after the underline edge. Sunday top rules retain 12px from line end to title. KOHI mobile changes its decorative geometry only: heading end → 8px → 1px stroke → 24px → first item; category boundary → 1px stroke → 12px → heading. The next category block's external margin remains 48px. Desktop/portrait-tablet midpoint geometry is unchanged. Stroke thickness is not counted as whitespace.

### Current mobile brand-width policy

The earlier KOHI-only 80% pilot and the subsequent 65% / 48px policy are historical (`docs/mobile-brand-65-qa.md`). The current user-approved bounded policy applies to all seven mobile text brands. `MobileBrandTitle` measures the selected script-aware fonts at 100px and computes against actual header inner width, not the width of the text itself. Minimum: `max(44px, 2.75rem)` for browser text scaling. Single-line visual ceiling: `max(minimum, innerWidth * 88 / 342)`; multiline ceiling: `max(minimum, innerWidth * 64 / 342)`. These are 88px/64px at a 390px phone with the shared 24px left/right insets, not fixed target sizes for every title.

Prefer one intact line if it fits at the minimum. Enlarge toward 100% but stop at the visual ceiling; 60–100% coverage is a preference, not an unconditional constraint for a very short customer name. When wrapping is necessary, choose the fewest balanced whole-word lines that fit at the minimum. All lines share one font size; the longest line targets 75% subject to the multiline ceiling. Minimum, ceiling and intact words take priority if 65%+ coverage is mathematically unavailable. If no whole-word partition fits, split safely at grapheme boundaries, never truncate. CJK uses grapheme-aware balancing. Exceptional very long names use natural balanced wrapping within the full inner width at the minimum without losing characters. Keep existing safe line-height and glyph padding; do not introduce ink-bound optical gap correction. Hidden measurement spans are zero-sized/overflow-clipped so a very long reference text cannot enlarge page scroll width.

Only container-width, title and typography/font-load changes recompute brand fitting. Do not observe sale timers/menu counts or feed brand results into the menu canvas fit loop. Logos use the existing logo branch. This mobile policy runs only when `onePageRhythmMode` is `mobile`; PC/tablet use the separately bounded brand fitter described above, while Display/multi-page remain excluded. Keep upper control-row/brand/copy/section gaps unchanged.

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
