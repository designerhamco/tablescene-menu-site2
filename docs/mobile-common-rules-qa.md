# Common one-page mobile rules — 2026-10-12

Current source of truth: `docs/template-spacing-contract.md` and `AGENTS.md`.

## Scope and result

All seven active one-page templates: REAL MATCHA, KOHI, Mocha Forest, Sunday Roasters, Van Gogh, ROSY ORANGE and Loop Bagel. PC/tablet fitting and Display/multi-page styles are not changed. No starter/saved content, logo, image, price, color or font selection is changed.

Before changes, actual 390×844 starter DOM measurements already passed the shared 20px item / 24px heading / 48px section boundaries, 24px control-to-brand and 12px brand-to-description gap. These were not seven different gap systems. This follow-up removes remaining internal mobile exceptions: KOHI category-copy gap now uses the same 8px token; Loop Bagel supporting line-height is now the common 1.5 rather than 1.38. Item title/secondary/description boundaries explicitly use a common 2px token, and no last/hidden copy spacer is added.

### Defaults at 16px root

| Boundary | Value |
| --- | --- |
| Item → item | 20px regardless of supporting-copy visibility |
| Heading group / underline end → first item | 24px |
| Category / widget / footer transitions | 48px |
| Upper area / colored box end → first category block | Same 48px section token |
| Control row → title; upper content blocks | 24px |
| Title/logo → store description | 12px, preserving font-dependent optical differences |
| Category title ↔ description | 8px, preserving description order |
| Item title/secondary/description internal boundary | 2px |
| Notice paragraphs | 0px extra gap; 14px text with 21px line-height |
| Colored upper box inner padding | 24px |

Decorative stroke offsets are not interchangeable with whitespace. KOHI heading end → 8px → 1px stroke → 24px → first item; other heading groups measure 24px from their own bottom/underline edge. KOHI top-category stroke → 12px → heading, Sunday top rule → 12px → heading and REAL MATCHA title → 8px → underline remain. This does not make the heading-to-item raw box gap 24px in KOHI; it is 33px including 8px and the stroke, and the post-stroke whitespace is exactly 24px.

## Bounded mobile title

Minimum `max(44px, 2.75rem)`; prefer one intact line, enlarge toward full inner width, stop at a width-relative visual ceiling. At a 390px viewport / 342px inner width the ceiling is 56px for a single line and 44px for multiple lines. A narrow one-line name with 3–4 non-space graphemes may use a 64px ceiling only when its measured coverage at the regular ceiling is below 45%; one/two-character and five-or-more-character names keep 56px. Other phone widths scale those ceilings proportionally. Multiple lines use one shared font size and a 75% soft longest-line target. Minimum, complete text/word preservation and visual ceiling take priority when all percentage wishes cannot be met. Logos bypass fitting; no ink-gap correction or PC/tablet title fitting is introduced.

Actual 390px starter title sizes after this rule: REAL MATCHA 56px, KOHI 64px, Mocha Forest 44px, Sunday 44px, Van Gogh 56px, ROSY ORANGE 46.66px, Loop Bagel 56px. The sizes are outputs of selected-font widths, line count and the shared short-name condition, not per-template multipliers.

## Language controls

All seven controls now render script-aware labels and inherit the saved/starter Korean and English font variables. Six previously inherited the English font for Korean labels; Loop Bagel previously hardcoded its UI fonts. Its actual starter remains Nanum Gothic / Bagel Fat One. The local `brand-font-outfit` fixture is a non-persistent setting-change regression test, not a starter edit, and is disabled in Production.

## Verification

- 560 unit tests passed; TypeScript, targeted ESLint and production build passed.
- Current local browser run: 129 starter/regression checks passed with no browser errors. Seven starters at 320/390/430×844; opened each language dropdown; all seven at PC 1440×900, landscape tablet 1198×838 and portrait tablet 838×1198; excluded Display and both multi-page engines carry no one-page mobile flags. Every PC/tablet fit, including portrait tablets, settled to `ready`.
- All seven 390px starter screenshots were visually reviewed. DOM assertions check actual item gaps, heading/stroke gaps, linked upper/category/widget/footer boundaries, internal copy gaps, supporting line-height, notice rows, fixed body sizes, title limits and name/price alignment, not merely CSS source declarations.
- Local development fixtures: 77 checks passed without browser errors, covering all seven templates with copy visibility combinations, featured area enabled/disabled, long multiword names, unspaced Korean, long Latin, 500 Korean characters, logo bypass, live English-font setting override and English/Chinese/Japanese starter layouts.
- Read-only evidence: `/private/tmp/mobile-built-qa.json`, `/private/tmp/mobile-common-qa.json` and `<templateKey>-mobile-common.png`. Reproduce with `scripts/qa-one-page-mobile-common.mjs`; use `MOBILE_COMMON_QA_BASE_URL` for a built/deployed URL and `MOBILE_COMMON_QA_PRODUCTION=1` to omit local-only fixtures.

These checks cover the specified matrix, not every possible customer dataset or browser. Keep the common spacing/typography contract for future copies; do not reintroduce mobile fit/density multipliers.
