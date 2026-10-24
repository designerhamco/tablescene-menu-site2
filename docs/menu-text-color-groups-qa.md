# Shared text color groups — 2026-10-24

The catalog preview and menu editor now expose the same five optional color groups through saved `design.textColors`.

| Control | Ownership |
| --- | --- |
| 가게명 | Store text identity |
| 카테고리명 | Category headings and price-option names, including inline option labels |
| 상품 기본정보 | Product/featured name, selling price and price explanation |
| 대표영역 설명 | Store description and notices physically inside the representative surface |
| 메뉴영역 설명 | Secondary names, product/featured/category descriptions, widget text and menu-area notices |

Missing groups preserve the original native/legacy role colors. New color changes do not rewrite font roles, sizes, weights, spacing, customer content or image geometry. Old three-group preview URLs remain supported. The form validator rejects invalid colors before persistence, preserves unrelated Design JSON and supports older forms without the new controls. Both typography/design reset paths clear the new explicit overrides. There is no customer-data migration or schema change.

Original time-sale prices use the local selling-price hue blended at 60% concentration with the local panel background. The concentration increases until 4.5:1 contrast is reached where the chosen price hue permits it; the final fallback retains the selected price hue. Featured prices use the existing dark photo fade. Strike-through and text sizes are unchanged. Countdown character updates do not trigger the color observer.

## Verification

- Unit suite: 829 passing, including validation, JSON save/read/reset, preview isolation, legacy role preservation, default product/description separation and original-price contrast.
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
