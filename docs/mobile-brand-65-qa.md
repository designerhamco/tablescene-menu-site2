# Unified mobile typography and brand width — 2026-10-12

## User-approved current scope

All seven active dining single-page mobile templates: REAL MATCHA, KOHI, Mocha Forest, Sunday Roasters, Van Gogh, ROSY ORANGE and Loop Bagel. Display, multi-page, inactive engines and all PC/tablet modes are excluded. No starter/saved menu content, images, prices, product links, colors or fonts are changed.

- Notices: 14px on all seven; no Van Gogh 12px exception. Existing zero extra paragraph gap and normal body line-height remain.
- Categories: 26px on all seven; no Loop Bagel size exception.
- Text brand: selected font measurements target 65% of page inner width after existing horizontal padding, with a hard 48px minimum. Old mobile brand multipliers are removed. Use shared font size on balanced lines and prefer whole words; retain every character. Minimum size/whole-word preservation take precedence when exact 65% is mathematically unavailable. No undisclosed font-size ceiling. Logos bypass fitting.
- Name/price 16px, descriptions/category descriptions 14px and secondary names 12px remain. KOHI category descriptions keep their existing 800 weight. PC/tablet KOHI category descriptions retain the existing item-name-linked formula, not a new fixed 14px rule.
- Keep 20px item, 24px heading and 48px section boundaries, upper box/stroke edge semantics and notice anchors. Only brand font size responds to width; do not reintroduce viewport/menu-density scaling for mobile body copy.

Current implementation and future-work instructions are `docs/template-spacing-contract.md` and `AGENTS.md`. The older 80% pilot, fixed 44px fallback and previous numeric exceptions are historical, not active policy.

## Completed local checks

- Seven actual starters at 320/390/430×844: category 26px, every rendered notice 14px, brand at least 48px, no horizontal overflow; common spacing and first-name/price checks passed. All seven were visually reviewed at 390px.
- KOHI at 390px: inner width 342px, title ~94.23px, actual text width ~222.29px (64.997%). User example `ESPRESSO / BASEBASE`: both rows 48px, ~222px and ~222.63px, no truncation. All seven fonts also passed this long-name fixture at 320px.
- Long multiword, Korean-without-spaces, 78-character Latin and 80/500-character Korean cases retain their complete text, minimum size and zero horizontal overflow. The four-word fixture uses four balanced 48px lines instead of leaving an unnecessarily 95%-wide line. Logos bypass the fitter. Outfit recalculates KOHI at ~86.60px for its own metrics and still reaches 65%.
- Narrow minimum-size examples are not hidden template exceptions: Sunday at 320px remains 48px with its intact `ROASTERS` word about 86% wide; at 390px it is about 69%. The same common constraints apply to every font/name. Do not claim both exact 65% and a 48px minimum for every arbitrary word length.
- Full/title-only/description-only/secondary-only copy combinations with featured area disabled passed all seven at 390px. Chinese/Japanese/English KOHI, Japanese Loop Bagel and English Sunday passed. Explicit mobile at 1440×900 uses the full 1392px inner width and 65% title while preserving body size/gaps.
- Seven PC 1440×900, landscape tablet 1198×838 (including delayed ROSY/Loop final ready checks) and portrait tablet 838×1198 had no mobile typography/fitter flags or horizontal overflow. PC/tablet fit formulas and decorative geometry are untouched. Display, both dining multi-page engines and legacy REAL MATCHA multi-page likewise have zero mobile-rule/fitter flags.
- No final browser warning/error logs. QA data and screenshots are temporary session evidence under `/private/tmp/mobile-65-qa.json`, `<templateKey>-mobile-65.png` and `espresso-basebase-mobile-65.png`, not repository assets. Final tests/type/lint/build and deployed release are reported at delivery.

These checks cover the named matrix, not all possible customer datasets/browsers. Future PC/tablet title changes require the user's next specification; do not activate this mobile fitter there implicitly.
