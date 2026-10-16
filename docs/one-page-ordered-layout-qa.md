# 원페이지 채움형 배치 감사 — 2026-10-16

## 직접 확인하는 환경

- 개발 서버: `http://localhost:3000/qa/ordered-layout`
- 활성 원페이지 8종의 공개 스타터를 실제 미리보기 renderer로 표시한다.
- PC 1512×762 / 1920×1080, 태블릿 1180×820 / 1024×768 / 820×1180, 모바일 390×844를 선택한다.
- iframe의 실제 viewport는 선택한 값이다. 바깥 화면에 맞춘 CSS 축소는 메뉴의 fit 입력을 바꾸지 않는다.
- 채움형/묶음형 비교, 호출 ON/OFF, 한국어/영어/중국어/일본어, 새 창 열기를 제공한다.
- 계정·결제·주문·실제 고객 메뉴 데이터에 쓰지 않는다. 스타터 편집/저장 기능은 제공하지 않는다.
- 개발 모드에서만 접근한다. 로컬 Production 빌드의 같은 경로는 HTTP 404를 확인했다.

## 공통 수정 내용

`c877429` 1차 감사에서 남았던 선데이·ROSY의 배치 실패와 일반 채움형의 하단 앵커 문제를 후속 수정했다.

1. **하나의 상품 단위 계산기:** 8종 PC/태블릿 채움형이 같은 `ordered-canvas-layout.ts` / `ordered-flow-packing.ts`를 사용한다. 제목+첫 상품은 함께 이동하고, 나머지 상품은 등록 순서대로 다음 열에 이어진다. 상품 내부는 분리하지 않는다. ROSY도 카테고리 전체 묶음 분배를 우회하지 않고 이 계산기를 사용한다. 중앙 브랜드 열은 별도로 보존한다.
2. **공통 간격 유지:** 기존 CSS 토큰에서 상품 1/1.10/1.20 리듬·제목/카테고리 간격·분리선 여백을 읽는다. 임의의 템플릿별 글자/간격 축소율을 추가하지 않는다. 열 처음의 분리선 앞 여백만 구조상 제외한다.
3. **하단 실제 공간 예약:** 마지막 열의 호출·언어·안내사항 높이를 실제 폭에서 재고 공통 상품 간격을 더한 뒤 메뉴를 배치한다. 아래와 오른쪽 inset에 고정한다. ONUE의 옛 360px 푸터 상한과 그리드/절대 위치 중복을 제거한다. 헤더나 중앙 브랜드에 있는 기존 안내사항은 이동하지 않는다.
4. **안전 검사 통일:** 푸터 앞의 공통 간격과 열린 열 하단의 8px 안전값을 이중 공제하지 않는다. 후보 선택과 최종 ready 판정이 같은 예약 용량 초과를 검사한다. 푸터 자신의 텍스트는 자기 충돌로 세지 않지만 실제 메뉴·이미지·위젯 충돌 검사는 유지한다.
5. **실제 긴 문구 검증:** 3개 의미 필드의 안전 기준을 유지하면서 후보의 채움 점수는 실제 행의 공백으로 계산한다. 실제 줄바꿈이 잘리는 후보도 선택 전에 제외한다. 기준 문구가 사라져 마지막 열이 푸터만 남는 경우에는 순서를 유지하며 상품을 이어 배치한다. 측정용 배율·기준을 되돌린 뒤 실제 위치를 다시 적용하여 마지막 probe의 위치가 남지 않게 한다.
6. **선데이 좁은 태블릿:** 상단 행+옆 대표 이미지 구조에서 기존 28% 이미지 폭으로 안전 후보가 없을 때만 24%→20% 순서로 메뉴 폭을 확보한다. 가독성 하한이나 본문을 희생하지 않는다. 템플릿 이름이 아닌 해당 구조의 fit 상태로 저장한다. 모바일에는 적용하지 않는다.

## 검증

### 모카 포레스트 색상 회귀 수정 — 2026-10-16

아래 초기 순회의 배치 검사는 색상 누락을 검출하지 못했다. 공통 ordered 계산기로 옮기면서 기존 사후 열 검사에 의존하던 메뉴 패널 속성이 빠져 카테고리/상품명/가격이 검정, 설명이 회색으로 표시됐다. 메뉴 표면이 React에서 기본 ivory 패널 역할을 직접 선언하도록 수정했다. 기존 와인색/아이보리 패널 CSS를 재사용하며 글자 크기·간격·배치 계산은 변경하지 않았다.

실제 렌더링 색상 검사(브랜드/메뉴 본문/호출 버튼/언어 트리거·팝업 색상 변수)를 추가했다. 개발 서버에서 채움형 5 viewport × 호출 ON/OFF 10/10, 묶음형 PC/가로·세로 태블릿 3/3, 모바일 320/430px × 한국어/영어 4/4가 색상 및 기존 배치 검사를 통과했다. 증거는 `/private/tmp/mocha-palette-fixed-final/report.json`, `/private/tmp/mocha-palette-grouped/report.json`, `/private/tmp/mocha-palette-mobile/report.json`과 PNG에 있다. 652개 단위 테스트, TypeScript, 변경 파일 ESLint, Production build도 통과했다.

### 초기 배치 검증

- **PC/태블릿 채움형 128/128 통과:** 8종 × (한국어 5개 viewport × 호출 ON/OFF + 영어/중국어/일본어 × PC/태블릿 각 1개 viewport × 호출 ON). 실제 viewport는 1512×762, 1920×1080, 1180×820, 1024×768, 820×1180이다. 로컬 Production 빌드(3100)에서 코드 갱신 없이 전체 순회했다. 모든 선택 결과는 2–3개 메뉴 열이며 실제 잘림·겹침·상품 분할·순서 오류·푸터 단독 빈 열·예약 높이 초과가 없다.
- **모바일 64/64 통과:** 8종 × 320/430px × ko/en/zh/ja. 기존 공통 읽기 간격과 가격 정렬을 확인했다.
- **묶음형 8/8 통과:** 로컬 Production 빌드, 세로 태블릿 820×1180, 한국어 호출 ON.
- **제외 엔진 9/9 smoke 통과:** Display/오브 테이블/메종 마레 × PC/태블릿/모바일. 자체 renderer 존재, 가로 넘침 및 ordered-canvas 누출 없음.
- **검수 UI 통과:** 8종 선택, 실제 iframe viewport, 묶음형/채움형·언어·호출 전환, 바깥 가로 넘침/페이지 오류 없음. Production의 `/qa/ordered-layout`은 404를 유지한다.
- **652개 단위 테스트, TypeScript, 변경 파일 ESLint, Production build 통과.** 새 테스트는 원자적 행 넘김, 예약 공간, 중복 안전 여백, 빈 푸터 열, 실제 내부 폭에 따른 12rem 구조 구제를 검증한다.

증거는 `/private/tmp/ordered-row-production-a/report.json`, `ordered-row-production-b/report.json`, `ordered-row-production-grouped/report.json`, `ordered-row-mobile/report.json`(ko), `ordered-row-mobile-locales/report.json`(en/zh/ja), `ordered-row-excluded/report.json` 및 같은 디렉터리의 PNG에 보관한다. 이후 내부 너비 계산은 같은 공식을 공통 함수로 모았으며, 4열 구조 구제 시 panel inset을 포함한 실제 12rem을 검증한다.

## 반복 실행

```sh
node --import tsx scripts/qa-one-page-ordered.mjs
node --import tsx scripts/qa-one-page-ordered.mjs --mobile
ORDERED_QA_MODE=orderedBalancedFit ORDERED_QA_CALL=on ORDERED_QA_WIDTHS=820 ORDERED_QA_LOCALES=ko node --import tsx scripts/qa-one-page-ordered.mjs
```

- `ORDERED_QA_KEYS`: 템플릿 키 쉼표 목록.
- `ORDERED_QA_WIDTHS`: 한국어 검사 viewport 너비 필터.
- `ORDERED_QA_LOCALES`: 추가 번역 언어. `ko`만 지정하면 추가 번역 사례를 생략한다.
- `ORDERED_QA_MOBILE_LOCALES`: 모바일 언어 목록. 기본 `ko`, 전체 회귀는 `ko,en,zh,ja`.
- `ORDERED_QA_CALL`: `on`/`off` 또는 생략해 둘 다 검사.
- `ORDERED_QA_BASE`, `ORDERED_QA_OUTPUT`: 서버 주소와 결과/스크린샷 디렉터리.
- 기본 출력: `/private/tmp/ordered-layout-qa/report.json`과 실제 화면 PNG.

검사는 폰트와 실제 행 위치 및 로딩 덮개가 안정된 뒤 실제 viewport, 상품 누락/중복, 상품/가격 정렬, 열별 카테고리 경계, 실제 잘림·겹침, 상품 분할, 호출/안내 충돌, 스크롤 및 깨진 이미지를 확인한다. 숨긴 모바일 메뉴 영역을 PC 검사 대상으로 사용하지 않는다. 추정 fit overflow 플래그만으로 실제 안전 검사를 대체하지 않는다. 원페이지 검수 목록이 활성 공통 셸 목록에서 빠지면 단위 테스트가 실패한다.

검사 중 코드를 갱신해 발생한 HMR navigation/context-destroyed 결과는 레이아웃 성공으로 세지 않는다. 최종 순회에서는 코드 변경을 멈추고 같은 조건을 다시 실행한다. 실제 DOM과 폰트가 안정된 상태에서 통과해야 한다.

새 고객 문구·폰트·상품 개수·위젯에는 같은 공통 재측정과 실패 판정을 적용한다. 스타터 검증 통과가 가능한 모든 고객 입력의 무오류를 보장한다는 뜻은 아니다.
