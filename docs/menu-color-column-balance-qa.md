# Logo palette, other-text color and Basic column balance — 2026-10-20

## Scope

- Keep the rendered native brand color available when a logo replaces its heading. An empty hidden element retains the original heading classes and ancestry, takes no layout space and is ignored by visible brand fitting. Both language palette and interaction theme use that source. Dining retains its separate saved-brand/cover inversion policy.
- Enable the existing editor's ‘나머지 글자’ color picker and reset. One selected color updates itemName/supporting/price. Existing font controls, role sizes/weights, validation, owner authorization and filtered JSON update remain. Serialize these colors, emit their CSS variables and opt the renderer into role colors. Default/null colors keep native palettes; chips retain their own theme. No schema migration or customer data rewriting.
- After product-name readability, compare measured 3/2-track column ends using the shared `basic-menu-scroll.ts` selector. Require a severe original imbalance, at least 40% less spread, at least 8 percentage points less unused area, and at most 35% viewport extra scroll. Never add overflow to an otherwise fitting board for whitespace alone. No typography changes, category reorder, automatic fourth track, mobile policy change or Dining/Display column change.

## Measured comparison

`scripts/audit-basic-column-balance.mjs` measured seven Basic skins at actual 1440×900, 1180×820 and 820×1180 viewports, grouped and flow (42 combinations), using the real block/name/chip measurement functions at the same reading size.

Only Mocha Forest grouped changed its selected count: 3 → 2 at PC and landscape tablet. Portrait already selected two. At 1440×900, end-height spread fell from 647.17px to 213.95px, unused column area from 21.24% to 8.72%, with 106.02px extra scroll. At 1180×820, spread fell from roughly 640px to 278.03px, with 117.75px extra scroll. Flow stays three because it already balances well. Other original candidates retain their prior count. Snapshots: `/private/tmp/basic-column-balance-before/` and `/private/tmp/basic-column-balance-after/`.

## Verification

- 689 unit checks; separate TypeScript, changed-file ESLint and optimized build.
- `qa-menu-logo-language.mjs`: 9 skins × PC/tablet/mobile, logo OFF/ON (27 combinations); language color and call/order interaction palette unchanged. Actual public-sized view, not a hidden measurement node.
- `qa-menu-text-colors.mjs`: real TypographySettingsForm mounted as a local isolated form, actual color selection/reset, hidden submitted fields, normalized save JSON round trip and real native renderer CSS. 9 skins × PC/mobile (18 combinations). No authenticated write or database mutation. Full suite also verifies invalid colors, default/null reset and independent brand/category colors.
- `qa-native-basic-scroll.mjs`: 78 combinations, original skin font/color/weight and independent mobile sizes/rhythm; narrow/wide phones, tablet orientations, locales, fixed representative/actions, reachable content/notices, common preview cart/call/advertisement and Dining standalone separation.

- Formal REAL MATCHA: 6 further PC/tablet/phone viewports, all starter items in registered order and reachable. Mobile keeps its approved 26px heading gap (the older generic rhythm helper expects 24px); other shared item/section/copy/font checks are unchanged.

Independent representative-panel backgrounds/geometry and Dining's separate cover-description color remain in `menu-editor-color-plan.md`; they are not part of this change.
