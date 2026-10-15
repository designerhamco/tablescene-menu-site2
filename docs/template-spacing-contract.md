# Menu template spacing contract

## Scope

Every active menu template must declare one spacing contract on its root element.

- `data-spacing-contract="canvas-fit"`: PC/tablet single-page and Display templates that fill one viewport.
- `data-spacing-contract="mobile-reading"`: the seven active single-page templates on phones; stable rem-based reading typography and natural scrolling, no canvas fitting or copy-visibility multipliers.
- `data-spacing-contract="editorial-scroll"`: multi-page templates that preserve reading rhythm and allow natural scrolling.

New templates must select the device-appropriate contract before template-specific spacing is added. Canvas-fit fixed lengths are allowed only for hard safety bounds, one-pixel rules, safe-area offsets, and minimum control or touch sizes. Mobile-reading uses stable rem bases by design, respecting browser text scaling and customer typography settings.

## Canvas-fit templates

The seven active single-page templates now use the adaptive PC/tablet policy in `docs/one-page-adaptive-layout.md`. The three-field reference is the default; excessive actual whitespace with a safe size gain or real wrapped-copy overflow permits a stable switch to actual content. PC/tablet single-page fit never falls back to scrolling, including portrait tablets. Between-item spacing retains its template mapping and copy-aware 1/1.10/1.20 multipliers. Template category ratios, outer insets, colors, fonts and notice anchors are preserved. Display, multi-page, retired and coming-soon engines are excluded. The older no-enlargement/three-field-only policy below is superseded for these seven PC/tablet presentations.

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

Text brands measure actual saved/starter script-aware fonts against their inner slot width, independently of menu density. The template-owned layout shell is passed into the fitter explicitly; DOM classes must never be used to guess the family. Horizontal topline headers target 60% of the actual central title cell's inner width. Every PC/tablet vertical brand column targets 75%; left-edge and center-column shells use the same selector. The longest planned line determines one shared font size for all lines. The former device-wide 40/80/60px and 44/88/64px limits are superseded: no fixed px title target/ceiling or template-name-specific title correction remains. The text-preserving safety floor is 10% of slot width with root text scaling; height and coverage remain soft if that floor cannot mathematically fit. Logos bypass fitting. Mobile keeps its independent fitter and spacing values.

PC/tablet title selection compares one/two-line candidates under one shared policy, with no template-name branches or individual fixed sizes. Two lines may win even if one fits at the minimum, when they permit at least 15% larger text and their shorter/longer line-width ratio is at least 0.5. Otherwise prefer the single line; longer names use the fewest feasible balanced whole-word lines or safe natural wrapping without truncation. Adaptive horizontal headers use a common fixed 16% reading-frame height budget; vertical brand columns keep their shared slot-height calculation. Horizontal font size is bounded by 10%/22% of central slot width with root text scaling. Candidate heights use the rendered 1.08 line advance + 0.12em safe padding. Respecting the relative minimum and preserving the text take precedence when a customer name cannot mathematically fit that budget.

Horizontal topline layouts use three equal-width cells, independent of the featured/menu column calculations below. Description is left, the text title is centered in the middle cell, and notices are right. The middle cell and title lines must share the header/page center (allowing subpixel rounding). The 60% title target uses that middle cell's inner width, not the full row. The common fitter supersedes old skin-specific `ch` width caps; each planned line is explicitly nonwrapping so the browser cannot silently turn a one-line candidate into two. Line advance is measured in the selected fonts at 100px, with 1.08 as its lower bound: CJK fallback metrics can make actual line boxes taller than CSS leading. That measured advance plus 0.12em padding determines the height bound. This is shared layout geometry, not a per-template typography exception. Existing mobile width selection, body typography, item spacing, menu columns and footer anchors are unchanged.

Widgets are category-level content blocks. A category-to-widget or widget-to-widget boundary without a divider uses the same category-to-category ratio, and widget-to-category uses the same divider or no-divider rule as a category boundary. A `bottom` widget may add flexible space above its final-column stack, but widget-to-footer-notice spacing uses the same item-to-item rhythm token and must never be replaced by a separate fixed reserve.

Single-page skins inherit these values from the CafeA spacing tokens. A skin can adjust the bounded scale, but must not replace the semantic tokens with a fixed `px` margin, padding, or gap.

Rosy Orange uses a visual correction of `1.25` from category title to first item and `3.6` between divider-free categories because its large title and title-only rows need a clearer section boundary. Real Matcha uses `2.9` between divider-free categories so its title underline and compact rows remain visually distinct. Mocha Forest uses `3` between categories and `1.2` from heading to items on PC/tablet (`1` on mobile); it must not add per-item bottom padding on top of the shared item rhythm.

REAL MATCHA single-page desktop/landscape-tablet category-to-category transitions explicitly use the `2.9` separation token. Its category boundary rule is visually hidden, so the shared divider-before token (`1`) must not replace that separation or lose the hidden divider's trailing space. The override is scoped to actual same-column visual category transitions and the single-page policy; two-column fallback uses it too. That 2026-10-11 follow-up did not change mobile/portrait-scroll spacing, category-title-to-first-item spacing, widget/footer boundaries or legacy multi-page presentations. Mobile now follows the separate 2026-10-12 contract below. Candidate measurement and final rendering use the same CSS; column counts remain content-driven, not fixed.

Viewport and fit calculations may change the base item gap, but semantic ratios are constants applied exactly once after that base calculation. Do not multiply a semantic ratio by a fit, device, density, or viewport scale again.

Display templates use the calculated content row (`--display-row`) as the base unit. Category-title-to-first-item spacing must use the same row-budget scale as item-to-item spacing.

### PC/tablet fit gap policy

All seven one-page templates use the gap mapping belonging to the selected layout mode: ordered flow, ordered balanced flow, or balanced flow. A template may keep its visual shell boundaries and category ratios, but it must not replace the common item-gap calculation or the shared `0.74` item-rhythm coefficient with a template-key-specific mapper or coefficient. Candidate measurement, committed fit state, validation and overflow backoff use the same mapping. Product-internal title/chip/secondary/promotion/description gaps and image-to-information gaps also use the common fit-linked tokens; a skin may restyle those elements but must not replace their spacing. KOHI's rule-adjacent clearances remain a structural exception and do not replace product spacing. Mobile uses the independent reading contract below.

## Single-page mobile-reading contract — 2026-10-12

The initial 18px/mobile template-ratio correction is historical (`docs/one-page-mobile-rhythm-qa.md`). The approved unified contract below is the current mobile source of truth; PC/tablet calibration remains unchanged.

Applies only to REAL MATCHA, KOHI, Mocha Forest, Sunday Roasters, Van Gogh, ROSY ORANGE and Loop Bagel. Display, multi-page and inactive engines are unchanged. Explicit preview device hints win; public views infer the device with the existing viewport hook (<768px is mobile). Portrait tablet remains a PC/tablet policy and now uses the same single-viewport engine. The earlier portrait reading-scroll behavior is superseded.

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
| Control row to brand / brand to description | 12px, one shared token |
| Upper content blocks | 24px |
| Brand/logo to store description | 12px |
| Category title to category description (either order) | 8px |
| Item title/secondary/description internal boundary | 2px; no empty-copy spacer |
| Notice paragraphs | Zero extra gap; normal supporting-copy line-height (1.5), preserving internal line breaks |
| Upper colored box inner padding | 24px |
| Responsive featured frame | 4:5, no item-count/density-driven minimum height |

Every active one-page representative image uses the shared 4:5 frame with centered `object-fit: cover` on PC, tablet and mobile. The image fills the full frame and may crop equally from the overflowing axis; a template or individual asset must not replace this with `contain` or another fit mode. Transparent artwork may remove a fallback background or placeholder, but that visual exception cannot alter image fitting. Menu widgets remain a separate, user-positionable system with their own fit and position controls. The menu manager recommends at least 1200×1500px at 4:5 so the image fills the frame without ratio-driven cropping.

Common mobile sizes remain the baseline. Notices are 14px and categories are 26px in all seven templates; old brand/category/notice size multipliers are removed. All mobile supporting-copy line-height is 1.5, including Loop Bagel; its 1.38 PC/tablet correction is unchanged. KOHI's category description remains 14px with an 800 weight, without a separate mobile size or title-gap override. Fonts, colors, starter data, featured product links, ordering and existing notice placement are preserved. Language controls use the saved/starter font variables with script-aware labels for all seven; Loop Bagel's starter remains Pretendard / Bagel Fat One, with no hardcoded UI font override.

The boundary target is the first category block, not its first product row. A heading and its internal 24px gap come after that boundary. Colored upper-area padding belongs inside an actual wrapper; the following 48px belongs to the menu surface, not the upper color. Mocha Forest's new mobile-only upper wrapper contains its header and optional cover; the old brown-painted scroll padding must not swallow the external gap. ROSY ORANGE's existing wrapper uses 24px bottom padding and a 48px external boundary. Optional upper content must not leave empty spacer nodes.

Line rules: REAL MATCHA retains an 8px title-to-underline inset and 24px after the underline edge. Sunday top rules retain 12px from line end to title. KOHI mobile uses the common 8px category-description-to-title gap, with 12px clearance around the internal heading rule before the first item. Category transitions use 24px clearance from the preceding category's last item to the category-boundary stroke, then retain 12px from the stroke to the next category description, producing a 24px / 1px stroke / 12px boundary. The first category below the upper area retains its existing 12px / 1px stroke / 12px frame, including when the representative image is absent. These mobile boundaries override shared spacing through scoped tokens; they do not add a second margin. Legacy non-adaptive KOHI spacing explicitly excludes the mobile reading surface. Empty description fields contribute no gap. PC/tablet geometry is unchanged. Stroke thickness is not counted as whitespace.

KOHI alone enlarges category titles by 10% on PC/tablet and tightens the description-to-title gap to 0.18em there. Mobile keeps the shared 26px category title and 8px category-copy gap. Its regular and timed chips keep editable background/text colors, while a translucent pencil texture and irregular clipped edge provide the template's childlike hand-drawn shape without introducing a separate border control. Van Gogh's starter has no ordinary item chips; only active timed-sale chips render. Customer-added chips still use one black-background/white-text palette, an irregular sketch edge and no fixed border outside the editor's background/text color model.

### Current mobile brand-width policy

The earlier KOHI-only 80% pilot and the subsequent 65% / 48px policy are historical (`docs/mobile-brand-65-qa.md`). The bounded policy applies identically to all seven mobile text brands. `MobileBrandTitle` measures the selected script-aware fonts at 100px and computes against actual header inner width, not the width of the text itself. Minimum: `max(44px, 2.75rem)` for browser text scaling. Single-line visual ceiling: `max(minimum, innerWidth * 56 / 342)`; multiline ceiling: `max(minimum, innerWidth * 44 / 342)`. These are 56px/44px at a 390px phone with the shared 24px left/right insets, not fixed target sizes for every title. No template-specific ceiling multiplier may override them; minimum size, whole-text preservation and wrapping remain shared.

Prefer one intact line if it fits at the minimum. Enlarge toward 100% but stop at the visual ceiling; 60–100% coverage is a preference, not an unconditional constraint for a very short customer name. When wrapping is necessary, choose the fewest balanced whole-word lines that fit at the minimum. All lines share one font size; the longest line targets 75% subject to the multiline ceiling. Minimum, ceiling and intact words take priority if 65%+ coverage is mathematically unavailable. If no whole-word partition fits, split safely at grapheme boundaries, never truncate. CJK uses grapheme-aware balancing. Exceptional very long names use natural balanced wrapping within the full inner width at the minimum without losing characters. Keep existing safe line-height and glyph padding; do not introduce ink-bound optical gap correction. Hidden measurement spans are zero-sized/overflow-clipped so a very long reference text cannot enlarge page scroll width.

Only container-width, title and typography/font-load changes recompute brand fitting. Do not observe sale timers/menu counts or feed brand results into the menu canvas fit loop. Logos use the existing logo branch. This mobile policy runs only when `onePageRhythmMode` is `mobile`; PC/tablet use the separately bounded brand fitter described above, while Display/multi-page remain excluded. Keep upper control-row/brand/copy/section gaps unchanged.

Typography profiles identify font characteristics without changing the shared semantic size limits. Every one-page profile uses the common 1.35rem PC and 1.30rem tablet linked item-name/price ceiling; mobile keeps its independent reading sizes. Loop Bagel still selects the reusable `heavy-display` profile for font behavior, but it no longer owns a template-only size cap. Its text brand uses the same 75% vertical-rail one/two-line comparison as every other PC/tablet vertical brand column, without a template or device multiplier.

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

### PC/tablet one-page chip placement — 2026-10-13

Measure the name's unwrapped width, chip group and row inner width in every fit candidate and final crop check. If the name alone fits but name + chips + gap does not, move the chips to the next line while preserving name/price first-row alignment. A naturally long name retains its inherent wrapping; chips move below if they add further name lines. Restore inline placement when width/font changes make the pair fit. Scope this to the seven adaptive one-page templates, excluding mobile, Display and multi-page.

### Shared top-row outer spacing — 2026-10-13

Sunday Roasters and Van Gogh share the same responsive outer padding and header-to-menu gap formula. Van Gogh's former PC-only smaller vertical padding and row gap are removed. Preserve the shared fixed 16% header height budget and 60% central title-width target, their individual typography/decorations, and the independent mobile, multi-page and display policies.

PC-only top-row one-line refinement: a confirmed one-line text brand uses 75% of the shared base header-to-menu gap. Balanced two/multiple lines, uncertain natural wrapping, logos and tablet/mobile devices keep their normal gap. Line selection measures against the unscaled gap to avoid feedback; viewport/font/title changes and unmount restore/recompute the policy. Do not change outer padding or the fixed-row height bounds.

### Featured-role and leader corrections — 2026-10-14

Featured name/chip/price sizes equal their respective menu counterparts in all seven one-page templates on PC/tablet/mobile. This supersedes the earlier PC/tablet featured-name-to-supporting-copy link. Descriptions/notices retain the support atom. ROSY ORANGE adaptive leaders reserve at least 0.75 name-em, remain visible beside the first name line when chips move below, and span the remaining row without a PC auto-start margin or short cap. Chip decisions reserve the leader, use unwrapped intrinsic sizes, and also move chips below when they add extra wrapped-name lines. Central-brand fourth-menu-column rescue checks all five actual columns, excluding no fixed-brand width from the readability budget.

### Calculation ownership - 2026-10-14

Adaptive packing uses registered, conventional, related and bounded free packing tiers in that order, with the existing material-improvement and barrier checks. Stable content signatures include option prices, price-column values, traits, widgets and featured settings; elapsed countdown ticks are excluded. Mobile does not install canvas-fit observers. Reuse chip measurements for identical row inputs and skip unchanged geometry/duplicate viewport notifications. The final crop check remains authoritative; caching never bypasses real content/font/viewport changes. The three-field reference is the default typography safety basis, not a permanent empty-row reservation: one/two-field content with at least 12% verified longest-column headroom, or at least 8% headroom with broad low occupancy, may switch to actual-content packing only after a safe linked size gain of at least 8%, including when the item-name atom is already at its shared ceiling.

All one-page PC/tablet typography profiles share the same product-name ceiling: 1.35rem on PC and 1.30rem on tablet. This is a visual upper bound, not a forced size; measured fit may select a smaller value. Mobile keeps its independent fixed reading policy.

### Notice/language linkage and quieter brands - 2026-10-14

For all seven one-page presentations, notice 1/2/3 and language trigger/menu labels share the menu-description size. Notice Korean and English runs both use the saved Korean font. Language UI keeps the saved Korean/English font by script. Category descriptions and time-sale supporting text share the product-description size. PC text-brand ceilings are 87.5% of their prior geometry-derived ceiling, preserving minimums and header bounds. Tablet ceilings stay unchanged. Mobile single/multiline ceilings are 56/44px at 342px inner width, preserving the 44px minimum and text.

Time-sale messages, deadline labels and countdown digits also use the saved Korean font for both Korean and English in every one-page PC/tablet/mobile presentation. Discount price fonts and language UI script fonts retain their existing roles; Display and multi-page are excluded.

All one-page menu/featured text chips, including sale/sold-out badges and trait chips, use the saved Korean font for Korean and the saved English font for English. Mixed-script labels use script-aware runs. This supersedes fixed legacy chip fonts, preserving chip size/color and device-specific placement; time-sale supporting messages/countdowns keep their separate Korean-font-only rule.

### Approved two-field exception - 2026-10-14

Only name+secondary or name+description items gently increase their remaining secondary/description field by 5%. A description-only item's discount explanation and matching featured description follow that size. Three-field and name-only items do not increase. Category/store descriptions, notices and language UI keep the linked base size. This is an explicit exception to uniform description sizes, not a canvas density multiplier. Mobile uses 12.6px secondary / 14.7px description at a 16px root, keeping existing item/section/internal gaps; PC/tablet measurements include the actual increase.

### Portrait tablet grid and decorative insets - 2026-10-14

KOHI's legacy single-column reading grid and category margins apply only outside the adaptive canvas engine. Actual balanced columns must match the fitted partition. A menu region below the existing 640px two-column width threshold keeps two columns even for dense menus; item/category counts cannot force three narrow columns. Portrait adaptive inner wrappers use their root's content-box height, excluding outer decorative padding, so Loop Bagel's featured frame and its rounded lower corners stay above the checker band. Verify both tablet orientations, actual column geometry, inter-block overlap and complete featured-frame bounds in addition to viewport overflow.

### Optional one-page Call presentation - 2026-10-14

Only an enabled Call configuration with a valid table context shows Call controls. PC/tablet use a circular Bell + call-label button in the last/rightmost menu column's measured footer, after widgets and immediately before existing lower-right notices. Without lower-right notices it docks at the lower-right content edge. In top-row shells, the language UI occupies the furthest bottom-right position and the Call button stacks immediately above it; center-brand notice anchors retain their template placement. Button accents are selected from the rendered menu palette: prefer the brand color when it contrasts with the actual surrounding panel, otherwise use a readable category/menu accent (for example wine in Mocha Forest). The icon/text choose the higher-contrast dark/light foreground. This replaces the mandatory store-name-to-circle-color link; the mobile top bar still follows the rendered store-name color. Reserve the complete footer height during fitting and include Call mode/table context in content/cache signatures; never cover items, widgets or notices or enable canvas scrolling.

Mobile replaces the existing language-control row with a transparent three-slot bar: Bell left, table label centered, globe-only language trigger right. All three use the rendered store-name color. Bell and globe are both 24px (1.5rem); Table label uses the saved Korean font for every script and numeral, sharing the base product-description size token (the approved per-item 5% exception remains local to that item). Preserve the existing 48px row/44px controls/12px brand gap. A mobile-only fixed bottom staff-call button uses the selected readable menu accent and the same action, respects the safe-area inset, and reserves an additional 5rem plus the inset after the existing bottom padding so final content remains unobscured. The dock uses a 0.75rem (12px at default root) corner radius, above decorative checker strokes (dock z-index 80, checker 60); the dialog remains above both. Menu-reading fonts and 20/24/48 spacing remain independent. OFF restores the original controls without empty Call slots. Preview has a default-off checkbox immediately before the detached-view link, preserves its state through device/orientation/locale/new-window URLs, uses Table 1, and opens the existing simulated Call dialog without requests. Real reception/activation remains a separate backend rollout; Display and multi-page presentation are unchanged.

Loop Bagel starter and template fallback Korean font are Pretendard; saved customer typography remains authoritative. Legacy supporting-copy rules resolve the saved Korean font rather than a fixed Nanum Gothic face.

### Detached preview viewport

The new-window link preserves content, locale and Call preview flags, but omits device/orientation overrides. Actual preview routes without an explicit valid device pass no override to the renderer: the browser viewport selects PC/tablet/mobile naturally. Device iframe URLs retain their explicit device/orientation, so the framed selector still simulates its requested layout. This applies to both starter and saved-menu previews; Display and multi-page engines keep their existing responsive policies.

### KOHI portrait category boundaries

KOHI category-to-category boundaries use their existing 3.4 item-rhythm ratio in every adaptive PC/tablet canvas, including 768–1023px portrait tablets. Apply the category boundary once to the preceding block; clear that block's last-item margin to avoid doubling the gap. First categories in each visual column have no added leading gap. Decorative divider strokes stay centered in the actual measured gap and outside fit measurement. Mobile keeps its independent 48px section boundary. KOHI's starter/default English font is Darumadrop One; the supplied v5 transparent illustration replaces the starter featured image while retaining the shared 4:5 centered-cover rule.

### Shared one-page canvas typography and available frame — 2026-10-14

All seven adaptive PC/tablet templates use category size = linked item-name size × 1.6 × saved category role scale as the common base. KOHI keeps its approved 1.1 visual category scale on PC/tablet only; mobile remains at the shared 26px. Other legacy template/device category multipliers do not override the common base. The device type multiplier is exactly 1, so tablet 1.12 and template 1.04 multipliers cannot multiply chips/categories again after fitting. Saved fonts, weights and colors and each layout shell remain authoritative; actual pixel sizes vary with content/font/viewport fit.

Adaptive boards use the complete available root content box, without the legacy 1920px width / 1080px height ceiling. Decorative outer padding still reserves its space; the full-viewport change does not cover checker bands or change content insets. Fit caches/observers recompute against that actual frame, preserving readable rem floors, bounded font candidates, linked role sizes and final crop safety. Display, multi-page, inactive engines and all mobile 16/14/12/26px and 20/24/48px reading rules retain their independent policy.

### Visible column gutters, KOHI rule edges and mobile Call top edge — 2026-10-14

All seven adaptive PC/tablet templates link ordinary visible column gutters to the page inline inset (`--board-padding`), without a second density/device multiplier. ROSY has no extra menu-column inline inset. Mocha's ordinary ivory menu columns each reserve half this gutter, while the first menu column beside the brown brand panel reserves a full gutter measured from that colored edge. The brown panel and outer edges retain one page inset. Portrait Mocha already has outer board padding, so the final panel must not reserve it again. These are measured content gaps, not just CSS grid gaps, and participate in the same fit measurement.

KOHI's ruled panels use `clamp(1rem, 1.8vmin, 1.25rem)` for each text-to-rule clearance, category leading space, heading-to-rule, rule-to-first-item and last-item-to-category-rule clearance, measured from stroke edges. The separate outer inset remains the shared responsive `--board-padding` on all four sides. A rule between two columns or categories reserves two rule clearances plus the stroke width. This supersedes both the old 3.4 category rhythm and the incorrect half-inset clearances. Mobile KOHI separators remain independent. KOHI tablet has a 1.14 fit-scale ceiling in candidate selection, cache retention and the actual-space probe, preventing the inset correction from enlarging tablet type further; PC keeps the adaptive 2 ceiling. Neither applies an extra device typography multiplier.

Enabled mobile Call bars start at the top page edge, allowing only the device safe-area inset. Existing brand/control spacing, transparent background, fonts, icons and colors remain. Mocha's colored upper box loses only its top inset when Call is ON. Loop's upper checker band follows the 48px Call row and reserves its own height before the brand. OFF preserves the original mobile header/decoration insets; PC/tablet, Display and multi-page Call placement is unchanged.

### Colored-panel edges and KOHI outer frame correction — 2026-10-14

For adaptive PC/tablet layouts, a menu column immediately beside a visibly colored brand panel measures its gutter from the colored background edge to the neighboring column's first content edge. Mocha Forest therefore gives the first menu column one full page-inset clearance from the brown panel edge; ordinary ivory menu-to-menu boundaries still combine two half insets into one page inset. The brown panel keeps its own full internal page inset. ROSY ORANGE already satisfies the same contract through a page-inset grid gap on each side of its gradient center rail; keep menu-column inline padding at zero so the gap is not doubled.

KOHI separates outer page framing from rule-adjacent clearance. The adaptive board retains the shared responsive `--board-padding` on all four sides, while its decorative SVG rules cross that empty inset and reach the page edges. Content remains padded because the overlay is outside flow and fit measurement. Category/column rules use `clamp(1rem, 1.8vmin, 1.25rem)` from each visible stroke edge to text; a shared rule reserves two clearances plus its stroke. Mobile KOHI keeps its independent full-width separator geometry and reading spacing.
