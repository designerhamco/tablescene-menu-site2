# Shared text color groups — 2026-10-24

The catalog preview and menu editor now expose the same six optional color groups through saved `design.textColors`.

| Control | Ownership |
| --- | --- |
| 가게명 | Store text identity |
| 카테고리명 | Category headings and price-option names, including inline option labels |
| 상품 기본정보 | Product/featured name, selling price and price explanation |
| 대표영역 설명 | Store description and notices physically inside the representative surface |
| 메뉴영역 설명 | Secondary names and product/category descriptions |
| 안내사항·위젯텍스트 | Menu-area notices and widget title/body |

Missing groups preserve the original native/legacy role colors. Representative image/placeholder featured names and prices retain white, descriptions white at 82%; chips and sold-out attenuation remain independent. Price notes such as ICE ONLY follow product ink, while real option labels follow category ink. Legacy five-group settings preserve their combined notice/widget color until edited; new six-group edits use `textColorGroupsVersion: 2` so an absent/reset information color stays native. New color changes do not rewrite font roles, sizes, weights, spacing, customer content or image geometry. Old three-group preview URLs remain supported. The form validator rejects invalid colors before persistence, preserves unrelated Design JSON and supports older forms without the new controls. Both typography/design reset paths clear the new explicit overrides. There is no customer-data migration or schema change.

Original time-sale prices use the local selling-price hue blended at 60% concentration with the local panel background. The concentration increases until 4.5:1 contrast is reached where the chosen price hue permits it; the final fallback retains the selected price hue. Featured prices use the existing dark photo fade. Strike-through and text sizes are unchanged. Countdown character updates do not trigger the color observer.

## Verification

- Unit suite: 831 passing, including validation, JSON save/read/reset, preview isolation, legacy role preservation, default product/description separation and original-price contrast.
- TypeScript and Production build passed. ESLint has no errors; the two existing unused-variable warnings are unrelated.
- Production-build DOM matrix: 39 Basic cases (six list/album defaults plus seven designer templates at actual 1280 × 720 PC, 1180 × 820 tablet and 390 × 844 mobile). All available brand/category/option/product/price/price-note/secondary/description/representative/widget fields matched their selected color, with no horizontal overflow.
- Narrow/wide mobile: seven native templates each at actual 320 × 844 Korean and 430 × 844 English; no secondary-color mismatch or horizontal overflow.
- Independence checks: MOCHA FOREST, LOOP BAGEL and ROSY ORANGE, each with no override and one of menu-description, representative-description, product and category overrides. Neighboring groups retained their native colors.
- Notices: top-row notices use the representative color; ordinary menu-footer notices use the menu-description color. ROSY mobile notices inside the representative block use its representative color.
- The picker leaves iframe colors unchanged until Apply; reset removes the temporary override from the preview URL. Menu editor restores saved colors in its controls and uses the same staged picker.
- Dining A/B cover text and Dining B course/product/price-description text follow the same groups. The former duplicate cover-description picker is replaced by the representative-description group; old saved cover colors remain compatible.
- The order button still follows the rendered category color with its existing light foreground.
- Production QA fixture remains 404. The local fixture never reads or writes a customer menu.

Preview labels now read “이미지·텍스트칩 라운드” and “가게명·가게 설명 정렬”. The radius scope is shown once; the old duplicate labels and radius/alignment footer copy are removed. Radius behavior, logo handling and featured-product left alignment are unchanged.

Sample-only DOM records were saved outside the worktree under `/private/tmp/menu-color*.json` and `/private/tmp/menu-colors*.json` for this verification session. Live release verification is recorded in the pull request/task result.

## 2026-10-24 color ownership correction

- A price token now carries its source kind: real option or price note. Identical text such as HOT can belong to either source; classification never guesses from the displayed wording. Category ink reaches only actual option labels. Price notes (for example ICE ONLY) use product ink.
- The representative photo/placeholder caption owns local white variables for both the explicit six-group scheme and legacy typography colors. Name/price remain white; description remains 82% white. The existing sold-out attenuation and independently chosen chip colors remain intact.
- Menu-area notices and widget title/body share the new information group. Description-only edits leave them unchanged; information-only edits leave descriptions and representative notices unchanged. Old five-group saved/preview colors retain their former appearance until explicitly edited. Both reset actions also remove the group-version marker.
- Final Production build, 831 tests, and changed-file ESLint pass. A token regression covers same-text note/option distinction, hidden-option fallback and category columns. Serialization covers independent information save/read/reset and legacy settings. Editor component rendering includes the sixth submitted control.
- Actual DOM matrix: 39 cases at 1280×720 PC, 1180×820 tablet and 390×844 mobile, spanning six neutral defaults and seven native designs. Verified 192 price notes, 18 rendered featured captions, 72 widget text nodes and 68 notice blocks against their expected owner colors; zero mismatch or horizontal overflow.
- Independent-edit comparisons: 40 baseline/supporting-only/information-only/category-only cases, spanning first-column, top-row, upper-left, MOCHA FOREST and ROSY ORANGE at tablet/mobile sizes. Neighbor groups, including representative notices, retained their baseline colors.
- Narrow/wide mobile: all seven native designs at actual 320×844 Korean and 430×844 English; all selected owner colors correct and zero horizontal overflow.
- The new information picker was exercised through its HEX field and Apply button: the iframe URL stayed unchanged during staging, then only menu notices/widget copy received the selected color. Native descriptions and white featured copy stayed intact. Dining A/B cover colors remained correct. No customer record was saved during verification.

Sample evidence is under `/private/tmp/price-note-color-matrix.json` and `/private/tmp/price-color-independence.json` for this session.
