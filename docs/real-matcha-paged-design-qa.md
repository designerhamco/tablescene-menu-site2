> Historical pagination record: the hidden copy was subsequently changed to internal scrolling on 2026-10-19. Current behavior and validation: `docs/real-matcha-scroll-qa.md`.

# REAL MATCHA 페이지형 원본 디자인·배치 복원 (2026-10-19)

범위는 숨김 `cafe_real_matcha_paged_test` 복사본이다. 원본 `cafe_design_a` 및 다른 기본 템플릿의 배치/모바일 읽기 정책은 유지한다. 공통 액션의 순서만 호출→장바구니로 바로잡았다. 운영 DB·주문·결제 데이터 변경은 없다.

## 구현

- 기존 PC/태블릿 별도 마크업은 `cafe-a-typography`가 없어 스크립트별 폰트가 적용되지 않았고 초록색 fallback을 사용했다. 이제 원본의 StoreIdentity, CategoryTitle, MenuItemRow, CoverHero, 언어 UI, 타임세일 시계·계산, 안내사항, 이미지 확대창을 재사용한다. 대표 이미지의 여러 슬라이드와 상품 정보도 유지한다.
- 원본의 역할별 폰트·색상·두께/칩·가격·상품 담기를 유지한다. 페이지형은 콘텐츠를 맞추기 위해 글자를 줄이지 않고 16–21.6px의 반응형 본문 이름 기준과 원본 역할 비율/읽기 하한을 사용한다. 고객 저장 역할·크기/폰트를 반영한다.
- 호출+주문 또는 주문만 켠 대표열 상단은 모바일과 같은 투명한 globe / table / bell / cart 한 줄이다. 그림자·원형 배경·추가 버튼 텍스트를 넣지 않는다. 실제 언어 변경·호출/장바구니 동작을 공유한다.
- 호출만 켠 PC/태블릿은 상단에 언어/테이블만 두고, 하단 오른쪽에 기존 OnePageCallButton 원형을 재사용한다. 버튼은 위젯 뒤/안내사항 위의 측정된 공통 하단에 배치해 빈 열이나 페이지 이동에 따라 움직이지 않는다. 중앙 페이지네이션과 우측 호출/안내 영역을 분리하며 모바일은 유지한다.
- 대표열과 메뉴 패널을 분리했다. 메뉴 패널의 상단은 실제 사용 가능한 높이, 하단은 안내사항 및 중앙 페이지네이션이다. 페이지 이동은 모든 메뉴 열의 폭을 기준으로 하단에 고정되며 대표열을 포함하지 않는다. 마지막 페이지의 일부 열이 비어도 이동하지 않는다. 마지막 위젯은 안내사항보다 위에 놓인다.
- PC/태블릿은 실제 메뉴 너비에서 열당 최소 12rem을 확보하는 1–3열 후보를 각각 DOM 측정한다. 오버플로 없는 후보 중 최소 페이지 수를 우선하며 같은 페이지 수면 더 넓은 열을 택한다. 내용/폰트/이미지/기능/화면/할인 활성 경계 변화 시 재측정하고 초 단위 카운트다운은 배치 캐시를 흔들지 않는다.
- 실제 썸네일 QA에서 몇 픽셀 차이로 카테고리 묶음이 다음 열로 넘어가는 경우를 보정했다. 글자 크기를 유지한 채 항목/제목 뒤 간격을 100%/90%/80%로 각각 측정한다(항목 뒤 최소 16px). 페이지 수 또는 사용 열 수가 하나 이상 줄 때만 축소 간격을 선택하며 동률이면 원래 간격을 유지한다. 모바일 및 기존 7종의 간격은 바꾸지 않는다.
- 묶음형은 들어가는 카테고리를 통째로 유지한다. 채움형은 카테고리를 상품 단위로 이어 배치하며 다음 열에 제목을 반복한다. 카테고리·상품·위젯 순서를 바꾸거나 글자/간격을 무조건 늘려 공백을 채우지 않는다.
- 표준 미리보기와 주문 QA에 `묶음형` / `채움형` 비교를 추가했다. 기기/기능/회전/별도 창 전환에서도 선택값을 보존한다. 모바일은 비교 UI 없이 원본의 자연 스크롤이다.
- `data-template-key=cafe_design_a`로 원본 스킨 선택자를 공유하며 실험 식별은 `data-paged-template-key`로 분리한다. 페이지형 메뉴 영역을 독립된 div region으로 두어 원본 태블릿 엔진의 section 숨김/타이포 재계산 규칙이 유입되지 않게 한다.

## 검증

- `npm test`, 독립 `tsc --noEmit`, 변경 TS/TSX 린트, Production 빌드.
- `scripts/qa-basic-dining-order.mjs`: 52개. 실제 PC 1440×900/1920×1080, 태블릿 가로 1180×820/세로 820×1180, 기본·전체 썸네일·많은 메뉴·긴 설명·위젯, 두 배치. 실제 내용 경계/순서/위젯→안내/프레임 스크롤 없음/페이지네이션 위치 고정, 모바일 장바구니 마지막, 옵션/수량/장바구니 수정/가상 후불 주문, 다이닝 A/B와 미리보기 버튼 전환. 운영 주문 write는 차단한다.
- `scripts/qa-paged-design-parity.mjs`: PC/태블릿 두 방향에서 원본과 실험의 브랜드·카테고리·이름·보조명·설명·가격의 실제 계산된 font-family/color/font-weight를 비교하고 원본 대표 슬라이드 개수를 확인한다. 기기별 reading-size/브랜드 폭에 따른 크기는 별도다.
- `scripts/qa-basic-dining-regression.mjs`: 기존 7종 × 기기·기능·4개 언어 112개. 모바일 20/24/48 리듬, 기존 PC/태블릿 fit, 가격 정렬 및 화면 경계 회귀 검사.
- 개발 중 HMR 청크 교체로 발생한 transient pageerror는 완료로 취급하지 않는다. 최종 검수는 수정 없이 고정된 Production 빌드에서 실행한다.

## Call-only footer follow-up verification

`qa-paged-call-placement.mjs`: 24 cases passed across PC, both tablet orientations and 320/390/430px mobile. Verified call-only vs both/order-only/off, both layouts, widgets, stable circle position across every page, notice/pagination separation and simulated call-dialog entry. Existing order/layout matrix: 52 passed; 638 unit tests, independent type check, changed-file lint and Production build passed. No actual call/order writes occurred.
