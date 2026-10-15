# KOHI template verification — 2026-10-09

## Current authority — 2026-10-14

KOHI uses the same one-page engines and device boundaries as the other six active templates. PC/tablet uses the shared 75% vertical-brand target, 10% slot-width floor and 18% reading-frame height budget; no KOHI title-size multiplier is passed into the fitter. Mobile uses the common 44px minimum and 56px/44px single/multiline ceilings at 342px inner width. Its four-letter name qualifies for the shared 3–4-grapheme, below-45%-coverage branch, so it reaches the common 64px short-name ceiling without a KOHI override.

PC/tablet category titles use the common item-name × 1.6 base plus KOHI's approved 1.1 visual scale. Mobile category titles are the common 26px and use the common 8px category-description gap. PC/tablet item boundaries use 1/1.10/1.20 according to visible support; mobile keeps the fixed 20px item gap. Ruled-panel clearances and outer decorative lines remain KOHI-specific and outside fit measurement. Tablet fit scale is capped at 1.14 while PC keeps the shared adaptive ceiling.

The sections below are retained as historical audit records. Their older fixed title formulas, 1.12 device multiplier, 1.15/1.35 spacing and template-specific mobile title/category values are not current rules.

## Historical starter follow-up — 2026-10-12

The starter uses live `KOHI` text in Tilt Warp instead of the old Outfit logo image (`logo_url: null`, `logo_replaces_name: false`). The old SVG stays available for saved customer menus. The featured area uses one unlinked transparent crocodile illustration with a red heart on its cup. See `docs/kohi-featured-illustration.md` for generation provenance and verification. Prior sections below document earlier iterations, not the current starter logo or featured asset.

### Supplied PNG and title-size audit

> Historical audit at `c2e3649`: the mobile title values below are superseded by the shared 44px-minimum bounded fitter, 26px categories and 14px notices. See `docs/template-spacing-contract.md` for the current 56px/44px single/multiline ceiling rule. PC/tablet formulas in this audit are historical evidence rather than current authority.

The current featured asset is the user's `거친 실루엣의 커피 악어_수정3.png`, copied unchanged as `kohi-coffee-crocodile-user-v6.png`. Category titles use KOHI's documented 4% exception and the description-to-title gap is slightly tighter; shared item/supporting type rules remain unchanged.

KOHI's desktop title is **not** a fixed multiple of item-name size. At widths ≥1024px it uses `clamp(1.9rem × brandRoleScale, 5.4vh × brandRoleScale, 3.5rem × brandRoleScale) × deviceTypeScale × 1.06`. With a 16px root, the clamped base ranges from 30.4 to 56px before device/KOHI multipliers. The tablet type scale is 1.12; the PC scale is 1. The brand role's S/M/L values are 0.94/1/1.06. This desktop formula does not multiply the menu fit font scale or overall menu font scale; item-name sizing does, so title:item ratios vary with content/fit.

Scrolling/mobile titles use the shared `clamp(2.25rem, 2.55rem × overallFontScale × brandRoleScale + 0.9cqw, 3.25rem) × deviceTypeScale × storeTitleDeviceScale` rule instead. Category titles are genuinely item-name-linked (KOHI tablet 1.4×; PC 1.5×), unlike the store title. These formulae describe current KOHI rules, not a universal title ratio for other templates.

Settled Korean starter measurements (default typography, grouped where applicable):

| Viewport | Title | First item name | Title:item ratio |
| --- | --- | --- | --- |
| PC 1440×900 | 51.516px | 20.8706px | 2.468× |
| Tablet 1198×838 | 53.7232px | 20.4681px | 2.625× |
| Portrait tablet 838×1198 | 54.143px | 17.6467px | 3.068× |
| Mobile 390×844 | 44.31px | 15.04px | 2.946× |

The title has loaded Tilt Warp, the starter has no logo image, and the fit overlay is fully transparent in these measurements. A four-letter title occupies less width than the prior graphic logo, while the viewport-based ceiling prevents it from growing to fill the brand column. This is a conservative sizing policy, not a broken font or missing title render. If approved, an isolated KOHI brand-title increase is preferable to enlarging menu items or changing the common fit engine.

## Starter follow-up — 2026-10-11

### KOHI-only proportion-first pilot

- Default category descriptions are Korean again. Locale translations remain intact; secondary names remain empty and item descriptions remain present.
- Fit font ceilings are `1.20` for tablet and `1.24` for PC, relative to existing linked typography. Gap ceilings are `0.96` and `1.00` respectively. These bound automatic fit enlargement, not customer-selected typography sizes. Public views without a device hint use the tablet ceiling at viewport widths up to 1366px.
- Grouped/balanced/fill measurements and overflow backoff share this policy. Post-fit whitespace enlargement and final render boosts are disabled for KOHI. Dense-content and wrap-density safety backoff remain active.
- Actual visible supporting fields control item boundaries: both fields = normal rhythm, one = `1.15×`, neither = `1.35×`. Promotion support, origin or trait copy retains normal rhythm. This also applies to mobile/scroll, only between items; last-item/category/footer boundaries remain unchanged.
- Category merging, preferred three menu columns (four total with the brand rail), four-menu-column rescue, source order, price-option headers, footer docking, clipping validation and loading/ready gates are unchanged. Other templates retain their existing policies.
- This is not a global rollout. Rendered responsive approval remains pending; automated/source checks alone do not establish final visual quality.
- Pilot checks: 531 tests passed; TypeScript and targeted ESLint passed. The local Korean tablet preview returns HTTP 200 with all five Korean category descriptions, Tilt Warp, copy-aware rhythm attributes, and no secondary-name rows. Automated browser inspection remains restricted, so PC/tablet/portrait/mobile grouped/fill visual and clipping verification is not claimed. Keep this change local/committed until visual approval; do not deploy or roll out globally yet.

Subsequent user approval: KOHI was accepted visually, then the user authorized sharing only the common principles and committing/pushing the combined work. The copy-aware helper moved to `lib/one-page-proportion-policy.ts`; KOHI numeric ceilings remain unchanged. See `docs/one-page-proportion-rollout.md` for the seven-template scope and remaining browser verification limitation. The pending-approval statements above describe the earlier pilot stage, not the current authorization.

- English starter typography is now Tilt Warp. Korean remains Pretendard; the existing Outfit outline logo with `cafe` / `menu` captions is unchanged.
- Category descriptions use weight 800 and 0.9 times the shared device-scaled item-name size (previously weight 700 and the smaller supporting-copy ratio). This is KOHI-scoped and does not alter the fit engine.
- Corrected after clarification: all 17 secondary-language names (`set_name`) are empty; Korean item descriptions and English/Chinese/Japanese description translations are restored. Default category descriptions have subsequently been restored to Korean in the pilot above. Only cream coffee and lemon soda carry an `Ice only` price note; prices and price-option logic are unchanged.
- All regular starter badge styles and the cake countdown badge use the brand red `#DC4235`; the old black outline is removed from the filled badges. Other templates and customer badge overrides are untouched.
- Follow-up verification: 526 tests, TypeScript, targeted ESLint, and production build passed. The corrected local preview HTTP response contains Tilt Warp, red styles, English category descriptions and restored Korean item descriptions, with no secondary-name rows.
- Automated browser inspection was blocked by the browser URL policy, so this follow-up does not claim rendered responsive or visual QA. Earlier browser observations below describe the pre-follow-up presentation.

## Scope

- New independent `cafe_kohi_a` catalog entry and editable starter, based on REAL MATCHA's CafeA renderer.
- Five categories, 17 sample products, and one linked cream-coffee featured slide. The existing non-branded coffee photo is temporary sample content.
- Red brand and category titles (`#B83A32`), black menu content and outline chips, off-white page background. Featured copy uses the original white-on-image gradient style with no copy panel.
- Every category has concise copy above its title in Korean, English, Chinese, and Japanese. Other CafeA templates retain descriptions below titles.
- Decorative SVG rules use page coordinates and do not take up content or fit-measurement space. Both grouped and fill modes are available.
- Existing save/reset/widget-loading guards include KOHI. No database schema, permissions, or Production data changes were made.

## Automated checks

- `npm test`: 522 passed, zero failures (after refinement).
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`: passed.
- Pure divider tests cover full-page boundaries, category transitions, fill-mode continuation fragments, mobile single-column rules, and invalid/overlapping measurements.
- Shared contract tests cover catalog availability, service compatibility, starter round-trip, translations, density, and template switching.

## Initial template browser checks

All checks below use the settled layout, after fonts and the fit safety cover have completed. The transient resize candidate is not the accepted final layout.

| Viewport | Mode / language | Result |
| --- | --- | --- |
| PC 1280×720 | Grouped / Korean | 17 items, no clipped text or horizontal overflow; no rules crossing text |
| PC 1280×720 | Fill / Korean | Four menu columns; full-height vertical rules and valid local horizontal boundaries |
| PC 1440×1000 | Grouped / Korean | Three menu columns; red headings, black text; all descriptions above titles |
| Wide PC 1920×1080 | Grouped / English | Complete translated menu; valid boundaries, no clipped text or rule/text intersection |
| Tablet 1198×838 | Grouped / Korean | Valid three-column layout and boundaries |
| Tablet 1198×838 | Fill / Korean and Japanese | Continuing categories cross columns without invented continuation headings or cross-column horizontal rules |
| Tablet 1198×838 | Grouped / Chinese, feature fixture | Image/price-option copy fits; no clipping or rule/text intersection |
| Portrait tablet 838×1198 | Scroll / Korean | Single menu column; five heading rules and four category rules span page width |
| Mobile 390×844 | Scroll / Korean | Same single-column divider policy, preserved content padding, no horizontal overflow |

- Resizing a settled Korean PC view from 1440×1000 to 1280×720 recalculates the fit and SVG viewBox; final layout remains unclipped.
- Featured coffee image loaded successfully; no browser console errors were recorded during the checks.
- REAL MATCHA and LOOP BAGEL still render their own brand and contain no KOHI divider layer. REAL MATCHA retains its original category treatment.
- Arbitrarily edited or extremely dense future menus are not covered by this sample-content verification; the existing fit safeguards remain active.

## Refinement follow-up

- Category-title-to-first-item ratio increased from `1` to `2`; category separation uses `3.4` times the existing item rhythm. Desktop category transitions use the separation token, and scroll layouts remove duplicate last-item margins. No item-to-item or font-size calibration was changed.
- Featured copy has a transparent background and zero panel padding; title, description and price are white over the existing image gradient.
- Footer notices contain only the decaf/milk option copy in every locale. The two unused slots are explicitly blank.
- Basque cheesecake has one black-accented 60-minute countdown promotion, regular price 6,500 and sale price 5,500. All supported locales have translated badge copy.
- KOHI is registered in the existing renderer's discount and widget guards; other templates retain their existing behavior.
- Rechecked Korean PC 1280×720 and tablet 1198×838 in grouped and fill modes, mobile 390×844, and English PC 1440×1000: all 17 items present, no clipped text, horizontal overflow, or rule/text intersection. Portrait tablet 838×1198 retained its one-column scrolling style and red brand/heading colors.
- Settled heading gaps were 20.2px on the small grouped PC and 22.2px on grouped tablet. Mobile heading gaps were 32px and category transitions 54.4px. These are observations, not fixed pixel settings.
- Countdown text visibly decreased after loading; the only footer line, matching brand/category colors, transparent featured copy and absence of console errors were also verified.
