# KOHI template verification — 2026-10-09

## Scope

- New independent `cafe_kohi_a` catalog entry and editable starter, based on REAL MATCHA's CafeA renderer.
- Five categories, 17 sample products, and one linked cream-coffee featured slide. The existing non-branded coffee photo is temporary sample content.
- Red category titles (`#B83A32`), black content and outline chips, off-white page background.
- Every category has concise copy above its title in Korean, English, Chinese, and Japanese. Other CafeA templates retain descriptions below titles.
- Decorative SVG rules use page coordinates and do not take up content or fit-measurement space. Both grouped and fill modes are available.
- Existing save/reset/widget-loading guards include KOHI. No database schema, permissions, or Production data changes were made.

## Automated checks

- `npm test`: 520 passed, zero failures.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`: passed.
- Pure divider tests cover full-page boundaries, category transitions, fill-mode continuation fragments, mobile single-column rules, and invalid/overlapping measurements.
- Shared contract tests cover catalog availability, service compatibility, starter round-trip, translations, density, and template switching.

## Browser checks

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
