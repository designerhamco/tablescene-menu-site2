# KOHI template verification — 2026-10-09

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
