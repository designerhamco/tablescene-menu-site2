# ArtiMenu 전체 작업 큐

최종 갱신: 2026-10-20

## 2026-10-20 광고·앨범형 보완

- 보기 옵션 명칭은 ‘광고’, 기본 OFF다. 메뉴관리의 별도 ‘광고’ 탭에서 최대 3장 등록·저장한다. 기존 기본 정보 영역에서 이동하며 권한·업로드·검증은 유지한다.
- 광고 이미지는 레이어 너비를 채우고, 중립 이미지 자리 예시는 장마다 배경 명도를 조금 달리한다. 이미지 내부 하단에 간격이 좁은 dot, 우측 상단에 그림자 있는 흰 X만 둔다. 레이어 테두리/포커스 외곽선과 하단 탭을 제거했다. 오늘 하루 보지 않기와 저장된 숨김 상태 사용은 폐기하며 진입마다 다시 표시한다.
- 베이직 앨범의 담기는 카드 오른쪽 끝에 정렬한다. 다이닝 앨범은 각 가격/옵션 행마다 점선을 표시하고 가격·담기를 우측 정렬한다. 모바일 가격 옵션 상품도 다른 일반 상품과 동일한 1~2열 카드 규칙을 사용한다.
- 가격이 설정된 코스는 이미지 금지·아이템 1열 규칙을 앨범에도 적용한다. 코스 전체 주문은 유지한다. 상단행 앨범의 대표영역 체크 기본은 OFF이며 직접 켤 수 있다.
- 기존 6종 목록형·고객 템플릿 디자인·모바일 간격은 유지한다. 대표영역 내용 정렬/색상 등 편집기 후속은 별도 단계다. 검수: `docs/menu-popup-album-qa.md`.

## 2026-10-20 모바일 로고 설명·다이닝 커버 도구

- 기본 디자인에서 로고 ON인 모바일은 가게설명도 중앙 정렬한다. OFF와 PC/태블릿 정렬, 기존 모바일 간격·메뉴·안내사항은 유지한다. 다이닝 커버 설명은 기존 중앙 정렬을 유지한다.
- 다이닝 사진 커버의 PC/태블릿 상단 도구는 투명 배경/흰 글자·아이콘을 사용한다. 호출 원형과 공통 주문·호출 팔레트는 커버용 흰 제목이 아닌 저장 가게명색을 따르며 커버·본문 이동에도 유지한다.

## 2026-10-20 로고·다이닝 커버 및 편집기 색상 후속

- `DONE` 기본 6종 로고 보기 체크 기본 OFF, 가게명 대체·비율 보존·모바일 중앙 정렬. 기본 다이닝 커버 이미지 기본 OFF/흰 배경, ON일 때 검정색 75% 오버레이와 밝은 커버 글자. 기존 디자인은 유지한다.
- `TODO` 편집기 색상: 베이직 페이지/대표영역 배경과 패널 끝 기준 간격 자동 조정. 다이닝 커버/일반 페이지/좌측 내비게이션 배경 분리, 커버 가게설명 별도 색상 및 나머지 글자 색상 연결. 전면형에는 좌측 열 설정을 숨긴다. 현재 범위/후속 기준: `docs/menu-editor-color-plan.md`.

## 2026-10-20 대표 이미지·배경 패널 검토

- `DONE` 기본 1열형 태블릿 대표 이미지 4:6, 그 외 승인 비율/하단 정렬 유지. 대표 이미지 등록의 단일 권장 크기/비율 대신 기기별 크롭·미리보기 안내.
- `PROPOSED` 편집기 단계에서 페이지 배경/대표영역 배경 분리. 대표 배경이 없거나 페이지와 같으면 기존 간격, 다르면 내부 padding과 실제 패널 끝 기준 gutter/측정 폭을 재계산. 1열은 오른쪽, 중앙열은 양쪽을 적용하며 저장/초기화/기존 데이터·모바일 호환 검증을 함께 처리한다. 이번에는 구현하지 않는다.

## 2026-10-20 기본 디자인 크기·정렬 마무리

- `DONE` 기본 6종 PC/태블릿 상품 글자 약 6% 축소, 카테고리/페이지 제목 및 모바일 규칙 유지. 베이직 대표상품과 실제/측정 행은 같은 크기를 사용한다.
- `DONE` 1열/중앙열 대표 이미지 하단 정렬. 중앙열 호출/주문은 이미지 아래 고정한다.
- `TODO` 사용자의 결과 확인 이후 기존 디자이너 템플릿 스크롤 구조와 공통 기능을 확대한다. 이번 기본형 보완에 함께 적용하지 않는다.

## 2026-10-20 기본 디자인 배치 보완

- `DONE` 1열/중앙열 대표 이미지 4:5, 좌상단 대표상품 기본 OFF, 중앙 고정 대표열 아래 호출/주문 세로 배치, 상단행 설명 예시 확대.
- `DONE` 기본 다이닝 좌측 내비게이션 옅은 배경, 다이닝 PC/태블릿 상품 관련 글자 6% 확대. 기존 모바일 규칙 유지. `docs/default-layout-refinement-qa.md`.
- `DONE` 사용자 결정: 묶음형/채움형을 현재대로 둔다. 고급 옵션으로 이동하지 않는다.

## 2026-10-20 기본 디자인 마무리

- `DONE` 기본 베이직 4종/다이닝 2종 구성, 좌상단 전 기기 4:3, 묶음형/채움형 동일 크기, 단일 호출 선택, 장바구니 원형 표시 위치 보완.
- `DONE` 기본 샘플의 안정된 ID 기반 다국어와 호출·옵션·장바구니·주문내역 공통 UI 언어 연결. 다이닝 모바일은 가격 옵션이 보조명보다 먼저 나온다.
- `TODO` 사용자의 기본 디자인 6종 최종 확인 후 기존 디자이너 템플릿 구조별 적용, 편집기/주문·호출·테이블/QR, 이용권 기반 교체·요금 동선을 단계적으로 진행한다.
- 아래 복수 요청 실접수 후속은 취소한다. 최신 정책은 단일 선택이다. 상세: `docs/default-design-completion-qa.md`.

## 2026-10-20 직원 호출 요청 선택

- `DONE` 호출 항목 최대 5개/30자 확인. 베이직·다이닝 미리보기에 5개 예시와 복수 선택, 목록 스크롤/하단 페이드, 고정 보내기 구현. 실접수 단일 선택/매장 저장 항목 유지. `docs/staff-call-selection-qa.md`.
- `TODO` 관리페이지 연동 시 복수 선택을 하나의 실제 호출 스냅샷으로 수신/표시/취소할 수 있도록 API/RPC를 연결한다. 미리보기의 복수 선택을 실접수 완료로 취급하지 않는다.
- `DONE` 이후 승인에 따라 중앙 대표열 아래 세로 버튼과 좌상단 전 기기 4:3을 반영했다. 최신 배치 보완 기록을 따른다.

## 2026-10-20 기본 디자인 상세·주문내역

- `DONE` 다이닝 모바일 상품명→보조명→옵션 가격 순서, 베이직 좌상단 대표영역 스크롤(좌상단 배치형). 기존 PC·태블릿 다이닝과 다른 베이직 구조/모바일은 유지.
- `DONE` 미리보기 장바구니/주문내역 탭, 시간·수량·금액·테이블·결제·진행 표시, 예시 상태·고객 취소 시뮬레이션. 실제 데이터 전송 없음.
- `TODO` 고객 방문 세션 기준 주문내역 조회와 상태 새로고침, 접수/미결제 조건의 원자적 고객 취소. 조리 준비 이후 고객 취소 차단, 직원 취소 권한과 분리. 관리자 변경/취소 동시성·결제 완료 경합·세션 만료/다른 테이블 차단 검사 후 실제 연결.
- `TODO` 편집기 색상: 가게명·카테고리(일반/코스/페이지)·나머지 글자, 별도 커버 설명색. 현재 기타 글자색은 편집 불가하므로 UI·저장·렌더러를 함께 연결. 커버 배경/농도는 기존 설정 재사용.

## 2026-10-19 기본 디자인·이용권 전환

- `DONE` 카테고리 설명 보기 옵션(베이직 2곳 예시), 카테고리→첫 상품 미세 간격 확대, 모바일 옵션명/가격 열 정렬과 최소 간격, 기본 대표 이미지 배경 명도, 다이닝 상단 중복 호출 제거·장바구니 보기/담기 아이콘 구분. 검수: `docs/dining-actions-default-options-qa.md`.
- `DONE` 사용자 승인 후 다이닝 모바일 가격 옵션은 상품명 아래 별도 행, 기본 다이닝 미리보기에는 가격 옵션 체크를 추가했다. PC·태블릿의 기존 배치와 단독 메뉴의 독립 구분/간격은 유지한다. 기본 베이직 초콜릿 휘낭시에·버터 크루아상·맛차 테린은 이미지 체크 상태와 무관한 텍스트 상품 예시로 고정했다. 검수: `docs/dining-actions-default-options-qa.md`.

- `DONE` 3차 UI 피드백: 기본 베이직 상품명만 표시할 때 썸네일·상품명/가격 세로 중심 정렬, 품절 칩 테두리 제거, 일반 텍스트칩 독립 보기 옵션, 보기 옵션 성격별 분류와 접기/펼치기.
- `DONE` 열 수 판단 방식: 사용자 승인 후 현재 스크롤 베이직의 썸네일·가격을 제외한 실제 상품명 폭/줄바꿈을 같은 읽기 크기에서 비교해 2·3열을 선택한다. 자동 4열을 제거하고 넘치는 메뉴는 스크롤한다. 희박/협소 화면 1열 예외와 기존 디자인·모바일 규칙은 유지한다. 기준/검수: `docs/basic-menu-scroll-policy.md`, `docs/real-matcha-scroll-qa.md`.
- `DONE` 2차 피드백: 기본 시안 가격 우측 정렬/담기 인접, 선택적 2·3개 가격 옵션과 가격 설명·할인·품절·보조 언어명·메뉴 설명 토글, 기본 묶음형, 이미지 확대 라운드, 다이닝 KR 언어 UI/원형 호출/메뉴 플러스 아이콘/정원 배지/모바일 제목 보정. 검수: `docs/dining-actions-default-options-qa.md`.
- `DONE` 1차 피드백: 다이닝 상단 제어/가격 옆 담기, 서비스 벨·문서 주문 아이콘, 기본 디자인 Pretendard·카테고리 선 제거, 기본 미리보기 표시 옵션, 모바일 언어 메뉴 화면 경계 보정. 검수: `docs/dining-actions-default-options-qa.md`.
- `DONE` 최신 승인본 기반 1차 검토 시안: 베이직 1열 고정형/다이닝 전면 페이지형, 독립 검토 경로, 빈 장바구니 상단 제거, 서비스·구조·이용권/가격표 분리 기반.
- `DONE` 사용자가 기본 디자인 2종을 확정했다. 베이직 나머지 3종(상단행·중앙열·좌상단)을 독립 검토 경로로 확장하고 다이닝 가격 옵션 우측/점선·썸네일 확대·한영 상품명과 베이커리 이미지 예시를 정리했다.
- `TODO` 다이닝 기본 좌측 내비게이션형과 기존 디자이너 템플릿의 구조별 스크롤 전환. 기존 색상/서체/장식/모바일 독립 규칙 보존. 이번 베이직 3종의 시각 확인도 필요하다.
- `TODO` 같은 서비스 내 이용권별 디자인 교체, 데이터 보존·되돌리기, 서버 권한 검증, 요금제 전환. 가격 숫자를 고객의 기존 계약 금액에 소급하지 않는다.
- `TODO` 메뉴 편집기·주문/호출/테이블/QR 운영 화면, 디자인 선택/신청/결제 동선, 실주문 QA와 단계적 공개. 자세한 순서: `docs/default-design-rollout.md`.

## 2026-10-19 REAL MATCHA 채움형 여백·비율 고정

- `DONE` PC·태블릿 채움형에서 인위적인 간격 확대/세로 중앙 이동을 제거하고 원본 의미 비율과 기기별 읽기 크기를 안정적으로 사용한다. 마지막 내용 뒤 페이지 여백 수준의 스크롤 안전여백을 추가하고, 빈 여백만 남으면 페이드를 숨긴다. 묶음형·모바일·다른 엔진은 유지한다. 검수: `docs/real-matcha-scroll-qa.md`.

## 2026-10-19 REAL MATCHA 원본 간격 규칙 복원

- `DONE` 정식/호환 REAL MATCHA PC·태블릿의 원본 적응형 페이지 여백을 복원하고 동일 토큰으로 실제 열 간격을 측정한다. 카테고리·위젯·안내사항 경계 2.9 비율과 타이틀 75% 측정 목표를 점검한다. 기존 버튼 위 제한 14–20px, 모바일·다른 엔진은 유지한다. 단위 657개·브라우저 83조건 통과. 검수: `docs/real-matcha-scroll-qa.md`.

상태 의미:

- `TODO`: 아직 시작하지 않음
- `IN_PROGRESS`: 현재 작업 브랜치에서 진행 중
- `NEEDS_HUMAN`: Production 접근, 실제 결제, 디자인 또는 제품 결정이 필요함
- `BLOCKED`: 선행 작업 또는 외부 조건 때문에 진행할 수 없음
- `DONE`: 완료됨. 다시 구현하지 않음

## 2026-10-19 REAL MATCHA 페이지 기준 여백 연결 (위 복원 전 기록)

- 기존 화면 비례/DOM 측정은 유지하고 페이지 네 면의 여백과 대표열·메뉴 열 사이 간격을 하나의 토큰으로 통일했다. 외곽 여백 자체는 변경하지 않는다.
- 호출·주문 버튼 위 안전여백은 페이지 여백의 75%, 기본 루트 14–20px로 소폭만 확장한다. 태블릿 약 15.4px, 1440px PC 약 16.9px로 실측했다. 페이드·모바일·다른 템플릿 엔진은 유지한다. 기준/근거: `docs/basic-menu-scroll-policy.md`, `docs/real-matcha-scroll-qa.md`.

## 2026-10-19 REAL MATCHA 채움형·반응형 규칙 정리

- 한 화면 배치를 먼저 찾되 공통 읽기 하한에서도 넘치면 메뉴 내부 스크롤을 허용한다. 실제 열 폭별로 1–3열과 공통 PC/태블릿 글자 크기를 비교하며, 기존 역할 비율·문구/가격 연동·상품 리듬·카테고리 경계를 다시 사용한다.
- 채움형은 등록 순서·제목 한 번을 유지한 채 열 높이를 고르게 나누고 외부 간격만 제한적으로 늘린다. 그래도 짧으면 메뉴 열 전체를 세로 가운데에 맞춘다. 안내 높이는 마지막 열만 사용하며 대표열·버튼은 고정, 페이드는 실제 넘침에만 표시한다.
- 정식 REAL MATCHA와 호환 테스트에 한정한다. 모바일·다른 6종·멀티페이지·Display의 엔진은 유지한다. 656개 단위 및 타입/린트/빌드, 실제 화면 132조건 통과. 기준: `docs/basic-menu-scroll-policy.md`, 근거: `docs/real-matcha-scroll-qa.md`.

## 2026-10-19 채움형 카테고리 제목 중복 수정

- REAL MATCHA 정식/테스트 스크롤 채움형에서 다음 열로 이어질 때 카테고리 제목을 다시 삽입하지 않는다. 제목 높이도 재삽입 예산에서 제외하며, 원래 제목은 한 번만 나오고 메뉴 순서·묶음형·모바일은 유지한다. 기존 페이지 분할 호출의 제목 반복 기본값은 보존한다.
- 649개 단위·타입/린트/빌드와 기존 화면 검사 80건 통과. 태블릿의 ADE/CLASSIC COFFEE가 각각 한 번만 보이고 메뉴 18개가 모두 이어진다. 검수: `docs/real-matcha-scroll-qa.md`.

## 2026-10-19 정식 REAL MATCHA 스크롤 전환

- 운영 기준본 `baseline/basic-before-contained-scroll-20261019` (`395be27e22360d5bb24e8ae13988dbe6e664f792`)을 보관했다. 되돌릴 때는 정식 전환 커밋만 revert하며 DB/기존 QA 주문 이력은 삭제하지 않는다.
- 정식 `cafe_design_a`의 single presentation을 승인된 REAL MATCHA 내부 스크롤 렌더러에 연결한다. 대표열·하단 액션은 고정하고 넘치는 메뉴만 스크롤하며, 끝에서 페이드를 숨긴다. 저장된 묶음형/채움형 설정과 소유자 미리보기 전환도 연결했다. 모바일은 기존 CafeDesignA 읽기 렌더러를 그대로 사용하고 multi/Display는 제외한다.
- QA 두 메뉴판에서 새 후불 주문 #3(라떼 HOT 1개, 5,800원), #4(코스 전체 1개, 185,000원)를 각각 접수부터 제공 완료까지 검수했다. 둘 다 미결제 상태로 보존하며 PG·결제 완료·환불은 실행하지 않았다.
- 나머지 6종 스크롤 확대는 미완료다. 공통 REAL MATCHA 셸로 라우팅하는 제안은 기존 고유 구조/디자인 보존을 입증하지 못한다는 자동 승인 검토 거절로 적용하지 않았다. 기존 6종 렌더러와 fit 정책은 유지한다. 후속 구조별 구현/검수 기준은 `docs/basic-scroll-rollout.md`에 기록했다.

## 2026-10-19 선결제 미리보기·가격 옵션 간격

- 선결제 표시 체크는 모바일+주문 ON에만 노출하고 PC·태블릿은 off를 전달한다. 모바일 체크 선택값은 기기 전환 후 유지한다. 결제 기능은 계속 준비 중이다.
- 스크롤 복사본과 원본 세로 태블릿에서 빠진 옵션명/가격 간격을 원본 PC 공식으로 보완했다. 원본 PC·가로 태블릿의 안정된 실제 값은 유지하며 모바일은 넓은 폴더블 표현까지 6px 읽기 간격을 사용한다. 검수: `docs/real-matcha-scroll-qa.md`.
- 원본 768×1024의 기존 canvas-fit 경고는 변경 전 운영에서도 재현된다. 스크롤 복사본은 정상이며, 원본 정식 전환 전 별도 검수 항목으로 남긴다. 후속 권장 순서는 기준본 보관→기존 QA 주문/관리자 동선 최종 확인→정식 REAL MATCHA 적용→다른 고정열/행 유형의 베이직 확대다. 이번 수정에서 다른 템플릿 전환은 시작하지 않는다.

## 2026-10-19 버튼 마무리 보정

- 호출 항목은 8px 라운드와 사방 테두리(선택 진한색/미선택 회색)를 복원했다. 수량 −/+만 원형 예외로 두고, 메뉴판 CTA 굵기는 공통 500으로 통일한다. 나머지 모달·완료 상태·템플릿 배치와 본문 서체는 유지한다. 검수: `docs/menu-order-ui-qa.md`.

## 2026-10-19 메뉴판 공통 액션·모달 디자인

- 주문 버튼은 렌더링된 가게명 색, 호출 버튼은 메뉴판의 밝은 종이색과 가게명 테두리/글자를 사용한다. 읽기 어려운 조합만 메뉴 잉크 또는 흑백으로 보정한다. 색상 변경은 열린 메뉴와 옵션·장바구니에 함께 반영된다.
- 홈페이지 pill과 분리한 메뉴 운영 UI는 Pretendard 400–600, 버튼 8px, 시트 16px를 사용한다. 얇고 긴 핸들·단순 X·테두리 없는 호출 완료 영역·진한 호출 취소 테두리를 적용한다. 기존 본문 간격·빈 팝업/담긴 전체 장바구니·주문 계약은 유지한다. 검수: `docs/menu-order-ui-qa.md`.

## 0. 2026-10-19 장바구니 전체 화면 보정

- `DONE` 빈 PC·태블릿 장바구니는 팝업, 상품이 담긴 장바구니는 전체 화면으로 분리. 기존 번호/폰트/뒤로가기/옵션·수량·주문 유지. 643개 단위·타입/빌드, 새 상태/기기 검사 33개·기존 주문 8개·다이닝 전체 화면 2개 통과.

## 0. 2026-10-19 주문·호출 UI 후속

- `DONE` 테스트 PC·태블릿 번호 비노출, 장바구니 번호/뒤로가기/Pretendard 400–600, 빈 장바구니 팝업, 베이직·다이닝 모바일 기능별 상·하단 제어. 643개 단위·33개 새 UI·52개 주문·27개 제어·112개 기존 템플릿과 Display 3개 검수 통과. `docs/menu-order-ui-qa.md`.

## 0. 2026-10-19 REAL MATCHA 스크롤 테스트

- `DONE` 숨김 복사본의 PC·태블릿 메뉴 내부 스크롤·대표열 고정·조건부 하단 페이드·고정 호출/주문 버튼. 원본/모바일 보존. 643개 단위 검사·타입/린트/빌드, 52개 흐름·27개 버튼/모바일·3개 원본 스타일 비교·112개 기존 템플릿 회귀 검사 통과. `docs/real-matcha-scroll-qa.md`.

## 0. 2026-10-18 베이직·다이닝 전환

- `DONE` 베이직/다이닝 명칭·5개 헤더 메뉴·Display 준비 중과 신청 차단, 기존 Hero 보존.
- `DONE` 원본 REAL MATCHA를 유지하는 숨김 페이지형 복사본, PC/태블릿 페이지 분할·고정 동작·위젯 순서와 모바일 자연 스크롤.
- `DONE` 양쪽 공통 옵션/장바구니/후불 주문·독립 미리보기·코스 전체 주문·고객 QR 모바일/terminal 채널·사장 설정과 기존 주문관리 연결 코드.
- `DONE` 633개 테스트·타입·린트·빌드, 배포용 112개 기존 템플릿·44개 새 흐름·4개 기존 장바구니와 격리 Postgres RPC 검증. 선결제는 disabled, 실제 PG 호출 없음.
- `DONE` 2026-10-19 사용자 승인으로 운영 RPC 2개·타입 갱신·14일 전용 QA 2개·UUID 한정 runtime 활성화. QA별 미결제 주문 1건, 옵션/코스·테이블·시각·금액·관리자 제공 완료·중복 방지 확인. `docs/runbooks/basic-dining-postpay-production-qa.md`
- `DONE` 후속 UI: 숨김 베이직의 호출/장바구니를 대표열 상단으로 이동, 원형/그림자 제거와 기존 언어 스타일 복원. 다이닝 기존 호출 스타일 유지·운영 주문관리 진입/요약 보완.

- `DONE` 2026-10-19 숨김 REAL MATCHA의 원본 시각 컴포넌트 복구, 모바일형 대표열 액션/장바구니 마지막, 실제 너비별 열 후보 비교, 묶음형·채움형 미리보기, 대표열을 제외한 메뉴 하단 페이지네이션 고정. `docs/real-matcha-paged-design-qa.md`.

- `DONE` 2026-10-19 숨김 페이지형의 호출 전용 PC/태블릿은 원본 원형 버튼을 하단 오른쪽으로 복원했다. 호출+주문 상단/모바일 흐름을 유지하고 안내/페이지 번호와 겹치지 않도록 공간을 측정한다.

## 0a. 2026-09-23 이전 제품 집중 정책 (이력)

- `DONE` 디자인 메뉴판 중심 전환 — 단일페이지의 할인·위젯, 멀티페이지의 여러 페이지 구성, Display 디자인 기능과 메뉴판별 대표 QR 1개를 유지한다. 공개된 메뉴판 카드에서는 `QR 다운로드`로 대표 QR PNG를 즉시 내려받는다.
- `DONE` 운영 기능 일괄 비활성 — 스마트호출·매장 운영·직원 관리·테이블 관리·테이블별 QR·Display 대기번호·Order/PG의 메뉴·직접 URL·server write를 중앙 정책으로 fail closed 한다. 기존 코드와 데이터는 삭제하지 않는다.
- `DONE` 고객 안내 정합성 — 신청·요금·상품 상세·FAQ·AI 상담·서비스 소개에서 스마트호출과 테이블별 QR을 제공 기능으로 노출하지 않고 대표 QR만 안내한다.

## 1. 사장·직원 권한 시스템

- `DONE` 직원 권한 DB 기반과 `menu_site_members`, `menu_site_invitations`, `menu_site_audit_logs`
- `DONE` 초대 수락 RPC와 Phase A RLS/constraint/index/trigger
- `DONE` 역할별 permission matrix와 공통 menu-site access helper
- `DONE` 사장 소유 메뉴판과 활성 직원 membership 메뉴판 통합 서버 조회
- `DONE` 직원 역할 표시 view model과 마이페이지 목록 연결
- `DONE` `menu.read` 권한 기반 직원 목록 접근, Owner 우선, revoked 제외, 비활성 lifecycle 제외
- `DONE` 직원의 Owner/Staff 미리보기 접근
- `DONE` 실제 직원 계정 viewer E2E — 승인된 기존 Owner·직원 계정과 운영 가능한 기존 메뉴판으로 초대 발송·수락, 역할 배지, Owner-only 버튼 숨김, 읽기 전용 미리보기, 편집 route 차단을 Production에서 확인
- `DONE` Owner/Manager/Editor 메뉴 편집 action 연결
- `DONE` 공개·비공개 변경을 Owner/Manager로 제한
- `DONE` 결제·구독·환불·복구·추가 구매·보관·삭제의 Owner-only runtime 검증 — `docs/owner-only-runtime-audit.md`
- `DONE` 직원 초대 UI와 이메일 전송 — 실제 발송은 수락 화면·SMTP QA 전까지 feature gate로 비활성, `docs/staff-invitation-delivery.md`
- `DONE` 초대 수락 화면 — HttpOnly intent cookie, verified Auth email, 원자적 수락 RPC 연결
- `DONE` 초대 재전송·취소 — Owner 재검증, batch token 회전, 발송 실패 rollback, revoke·audit 연결
- `DONE` 직원 역할 변경과 접근 회수 — Owner-only active membership, role allowlist, revoke·audit·rollback 연결
- `DONE` 직원용 마이페이지 상세 경험 — 관계 배지, permission 기반 기능 안내, 사장 전용 보관·삭제 탭 제외
- `DONE` 계정 역할 정보 구조 — 반복되는 메뉴판별 `사장` 배지를 로그인 정보로 이동하고 직원의 메뉴판별 세부 역할은 유지
- `DONE` 권한 제한 UI — 마이페이지·편집기·매장 운영 메뉴를 숨기지 않고 비활성 상태와 사유로 안내하며 직접 URL 접근도 서버에서 fail closed
- `DONE` 이미지·동영상 Storage 권한 — Production Storage policy 변경 없이 권한 확인 후 서버 경계에서만 실행
- `DONE` 위젯·번역·AI 권한 연결 — AI 사용은 Owner 크레딧, 충전·결제 UI는 Owner-only
- `DONE` 감사 로그를 모든 직원 작업에 연결 — 공통 write gate에서 actor·role·permission·surface 기록, audit 실패 fail closed, `docs/staff-write-audit.md`

## 2. 메뉴판 미리보기 기기 프레임

- `DONE` PC 프레임 — 1440×900 동일 출처 iframe viewport
- `DONE` 태블릿 프레임 — 가로 1180×820 기본, 세로 820×1180 전환이 가능한 동일 출처 iframe viewport
- `DONE` 모바일 프레임 — 390×844 동일 출처 iframe viewport
- `DONE` PC·태블릿·모바일 선택 버튼에 기기 아이콘을 함께 표시하고 단일·멀티페이지가 같은 실제 renderer를 사용하도록 유지
- `DONE` 기존 preview 화면과 renderer 재사용 — 실제 렌더링 route와 `MenuPageRenderer`를 그대로 사용
- `DONE` 새 창에서 메뉴판 보기 — 현재 선택한 PC·태블릿·모바일과 태블릿 방향을 유지하면서 기기 프레임·상단 도구 없이 실제 renderer만 새 창에 연다. 확대·축소는 모든 기기에서 브라우저 기본 기능으로 통일
- `DONE` 첫 미리보기 도움말 — 실제 메뉴판 위에 기기 선택부와 브라우저 확대·축소 위치를 직접 짚는 반응형 코치마크로 개편. `오늘 하루 보지 않기` 체크박스와 `닫기`를 분리해 체크 후 닫을 때만 하루 숨김을 저장하고, 체크하지 않은 닫기·Escape·새 세션 재노출을 자동 검증
- `DONE` 미리보기 상단 UI 정리 — 브라우저 안내의 Guest는 제거하고 URL 입력창처럼 보이는 긴 둥근 사각형과 회색 채움 원형 프로필·더보기·확대/축소를 유지. 단일·멀티페이지의 기기 선택기는 기본 펼침이며, 화살표를 누르면 최대 432px 반투명 바가 80px 손잡이로 줄면서 위로 이동하고 다시 누르면 아래로 열린다. 마우스 근접 효과는 사용하지 않음
- `DONE` 미리보기 안정화 — 하단 고정 위젯·안내사항의 0에 가까운 정상 여백을 잘림으로 오인하지 않도록 실제 음수 overflow만 실패 처리. 리얼 맛차·라운드 포커스의 반복 새로고침 안내를 제거하고 선데이 로스터스 로딩 안내에는 사이트 기본 서체를 고정
- `DONE` 태블릿 화면 회전 아이콘 — 사용자 제공 정사각형 SVG의 원본 경로와 viewBox를 인라인으로 사용하고 `preserveAspectRatio`로 탭바 안의 찌그러짐을 방지
- `DONE` Display 미리보기 전용 안내·제어 — 기기 선택 안내 없이 브라우저 확대/축소만 설명하고, 하단 페이지 제어는 포인터가 화면 아래 영역에 들어올 때만 표시하며 멀어지면 숨김
- `DONE` 모바일 Order/PG·스마트호출 미리보기 제거 — 디자인 메뉴판 집중 정책에 따라 PG 선택 UI·장바구니·호출 흐름을 모든 템플릿에서 비노출
- `DONE` 별도 scale 엔진을 만들지 않는 제품 정책 확정

## 3. 활성 템플릿 전체 기능 QA

- `DONE` 단일페이지 표시명·스타터 개편 — 오브 커피를 `리얼 맛차`, 선데이 라인을 `선데이 로스터스`로 바꾸고 공개 미리보기 별칭 route를 연결하되 내부 저장 키는 호환 유지. 리얼 맛차는 맛차 메뉴·그린 칩·단일 가격·카테고리 제목선·Oswald로 재구성하고, 모카 포레스트는 `#F4EDDC` 베이지·`#852322` 와인색·사용자 제공 대표 이미지·3:1 캐릭터 하단 위젯·Chelsea Market·전체 메뉴 설명·`SIGNATURE`/`BEST` 칩과 보강 메뉴로 정리. 가게명 열을 제외한 메뉴 열 여백과 카테고리 경계를 유동 비율로 확대하고 모바일도 동일 팔레트와 역할 서체를 사용. 선데이 로스터스는 Federo와 `#24369C` 계층·옅은 점 구분선을 사용
- `DONE` 실제 활성 템플릿 목록 확정 — `hidden`은 임시 판매 노출 상태이며 QA 제외 사유가 아님, `docs/active-template-qa.md`
- `DONE` 리얼 맛차(내부 키 `cafe_design_a`) — 반응형·dense/footer/widget/multi-page renderer와 격리 저장 round-trip
- `DONE` 모카 포레스트 — 반응형 renderer와 격리 저장 round-trip
- `DONE` 선데이 로스터스(내부 키 `cafe_sunday_line_a`) — 반응형·dense·4개 locale 최대 길이 renderer와 격리 저장 round-trip
- `DONE` 라운드 포커스 — 반응형·대표 메뉴 없음 fallback renderer와 격리 저장 round-trip
- `DONE` Brew Chapter — cover/no-cover/no-image·페이지 이동 renderer와 격리 저장 round-trip
- `DONE` 기타 활성 템플릿 — 누아 메뉴 반응형 renderer·fail-closed capability·격리 저장 round-trip
- `DONE` 위젯·디자인·폰트·배지·가격 옵션·품절·타임세일·이미지·커버 QA — 지원 capability 기반 desktop/mobile stress fixture와 계약 테스트
- `DONE` 한국어·영어·중국어·일본어 QA — 7개 출시 템플릿의 52개 desktop/mobile route, 장문 overflow·이미지·언어 control 확인
- `DONE` 생성·편집·최종 저장·preview·public QA — 7개 starter final-save round-trip과 동일 fixture preview/public desktop/mobile 비교
- `DONE` Display 별도 정책 유지 결정
- `DONE` Display 타임세일 지원 — 다이닝 공통 관리자 편집·저장·번역 계약 재사용, 공개 배지·정상가·할인가·마감 표시, 전체/분할 레이아웃 QA
- `DONE` 단일페이지 4종 스타터 최종 정리 — 카테고리 최소 수가 아니라 실제 화면 밀도와 여백 균형을 기준으로 메뉴 수를 보정하고 중복 할인 문구 제거, 메뉴 ID·번역 키·프로모션 참조 무결성을 계약 테스트로 고정
- `DONE` 단일페이지 4종 스타터 기본 번역 — 생성 즉시 한국어·영어·중국어·일본어 완성 번역과 활성 locale을 포함하고 최종 저장 round-trip 검증
- `DONE` `만들기` 스타터 미리보기 4개 언어 완성 — 활성 단일페이지 4종·멀티페이지 2종·Display 1종의 preview fixture에 한국어·영어·중국어·일본어 실제 문구를 연결. 언어 변경 시 페이지·카테고리·메뉴·설명·가격 옵션·할인·커버·보조 라벨이 함께 바뀌며 21개 비한국어 실제 route에서 한글 fallback·가로 overflow·fit 실패가 없음을 자동 검증
- `DONE` 단일페이지 4종 유동 디자인 — 핵심 글자·간격을 고정 px가 아닌 viewport·container 기반 유동값으로 전환하고 PC·태블릿·모바일 시각 회귀 검증. 카테고리명은 메뉴명 대비 실제 계산 크기 1.35배 이상을 유지하고, 메뉴 설명·안내·대표 메뉴 설명·가게 설명은 동일한 viewport 기반 계산식을 공유. 모카 포레스트 언어 전환 UI는 템플릿 배경과 조화되는 베이지 `#F4EDDC`로 보정
- `DONE` 단일페이지 편집 데이터 렌더링 계약 — 내부용 페이지명을 모바일·PC 디자인 문구로 노출하지 않으며, 모카 포레스트의 `MENU` 같은 스타터 페이지명이 실제 렌더링에 다시 나오면 브라우저 QA가 실패하도록 고정
- `DONE` 디자인 엔진 최종 자동 회귀 — 공개·판매 템플릿 31개 PC·모바일 화면의 HTTP·빈 화면·overflow·이미지·요청·console/page error·axe critical/serious와 미리보기 행동 검사를 유지. 최종 DOM overflow 시 글자·간격 안전 축소 후 재검증하는 종단 보정을 유지하고, 초기 안정화 후 브라우저 확대·축소는 로딩 레이어 없이 뒤에서 재계산. 활성 7개 템플릿의 비한국어 21개 route와 툴바·새 창 미리보기 검사를 실패 0건으로 고정
- `DONE` 미리보기 기기 의미·타이포 연동 4차 보정 — 1180px 태블릿 가로가 desktop breakpoint를 지나더라도 명시적 `previewDevice=tablet` 규칙을 사용한다. 최신 기준은 단일페이지 역할 글자에 1.12 장치 배율을 더하고 안전 맞춤 엔진으로 잘림을 방지한다. 오브 커피·모카 포레스트는 선데이 라인의 기기별 `카테고리명/보조언어명/설명/가격/옵션명` 비율을 그대로 공유하고, 가게명도 같은 viewport 계산식과 태블릿 0.94 보정을 사용한다. 모카 포레스트 디저트는 4개로 유지한다.
- `DONE` 단일페이지 역할별 타이포그래피 완전 연동 — 디스플레이·멀티페이지를 제외한 4종에서 `상품명=대표 상품명`, `텍스트칩=대표 텍스트칩`, `상품 설명=대표 설명=카테고리 설명=가게 설명=안내 1/2/3`, `상품 가격=대표 가격`을 각각 하나의 유동 역할 토큰으로 연결했다. 대표 영역도 모든 기기에서 대응 메뉴 역할과 같은 계산 크기를 사용하며, 텍스트칩은 상품명 계산 크기의 0.62배로 직접 연동한다. 보조언어명은 모든 스타터 항목에 필수이며 공통 보조서체의 600 굵기를 사용한다. PC·태블릿·모바일 화면에서 크기·서체·굵기·행간·자간·스타일을 계산값으로 비교하며 불일치 시 실패하도록 브라우저 QA를 고정했다.
- `DONE` 단일페이지 언어 UI와 대표 영역 편집 계약 정리 — 오브 커피·모카 포레스트 PC·태블릿의 언어 변경 UI를 가게명 위 독립 행으로 이동하고 오브 커피는 왼쪽, 모카 포레스트는 오른쪽에 정렬했다. 대표 영역 편집 화면은 최대 5개의 `대표 이미지` 관리와 이미지별 `대표 상품` 연결을 서로 다른 카드로 완전히 분리한다. 상품을 연결하지 않거나 상품 정보 표시를 꺼도 이미지는 유지하고 공개 메뉴판에는 이미지 단독으로 표시한다.
- `DONE` 단일페이지 대표 영역 기기별 표시 — 대표 영역 전체 사용 설정을 유지하면서 PC·태블릿·모바일 표시 여부를 독립 저장한다. 기존 데이터는 모두 표시로 호환하고, 숨긴 기기에서는 빈 자리 없이 메뉴 fit/fill 배치를 다시 계산한다. 멀티페이지 커버는 별도 계약을 유지한다.
- `DONE` 단일페이지 4종 60분 재고 마감 디지털 타이머 — 모든 활성 단일페이지 스타터에 기간 할인을 포함하고 초 단위 `HH:MM:SS` 타이머로 통일했다. 상대 너비·tabular 숫자와 현재 언어 접근성 이름으로 레이아웃 안정성과 다국어 안내를 유지한다. 라운드 포커스의 HOUSE SPECIALS 이미지와 ESPRESSO·MILK & CREAM 밀도를 보강하고, 선데이 라인의 일반 메뉴 이미지는 제거했으며, 모카 포레스트 모닝딜은 진한 브라운으로 대비를 높였다.
- `DONE` 타임세일·폰트·읽기 전용 입력 일관성 — 타임세일은 지원 템플릿과 서버 저장 모두 메뉴판당 최대 50개로 통일하고 기존 가격·일정 안전 검증을 유지한다. 폰트 설정은 현재 템플릿의 실제 한글·영문 기본 폰트를 표시하며, 수정 불가 input·textarea는 공통 비활성 시각 스타일을 사용하되 공개 주소는 복사할 수 있다.
- `DONE` 단일페이지 위젯 배치 방식 — 위젯 추가·수정에서 `콘텐츠 이어붙이기`와 `마지막 열 하단 정렬`을 선택해 `settings` JSON에 저장한다. 하단 위젯은 PC·태블릿의 마지막 열과 모바일 콘텐츠 끝으로 모이고 안내사항 바로 위에 쌓이며, 위젯↔안내사항 간격은 실제 메뉴 아이템↔메뉴 아이템 간격과 동일하게 유지한다. 이미지형 위젯은 `3:1`, `2:1`, `4:3`, `1:1`, `3:4`, `1:2`, `1:3` 중 한 비율을 저장하고 모든 기기에서 동일하게 사용한다.
- `DONE` 단일페이지 공통 여백·위젯·안내 서체 보정 — 분리선 없는 공통 카테고리 경계를 메뉴 간격의 2.6배로 확대하고 리얼 맛차 2.9배·라운드 포커스 2.8배를 유지한다. 위젯 테두리·그림자를 제거하고 빈 위젯은 `NO IMAGE`로 표시하며, 안내사항 1/2/3은 영문 문자열도 설정된 한글 서체를 사용한다. 라운드 포커스는 최종 잘림 검증을 유지한 채 새 창 준비 시간을 약 7초에서 약 3.7초로 단축했다.

- `DONE` 태블릿 우선 미리보기 — 단일·멀티페이지의 최초 미리보기는 태블릿 가로를 기본으로 열고 선택기 순서를 `태블릿 → PC → 모바일`로 고정한다. 가로·세로 선택을 같은 행으로 줄이고 탭바를 48% 반투명 배경으로 보정했다. 명시적 `device` URL은 우선하며 Display는 PC 전용 기본값을 유지한다.

## 3-A. 메뉴판 간 메뉴 재사용

- `DONE` 다이닝↔디스플레이 메뉴 가져오기 제품 계약 — 연결 유지와 독립 복사, 공통 필드와 메뉴판별 필드 분리, `docs/shared-menu-catalog.md`
- `DONE` Owner 전용 가져오기·연결 해제 화면과 원자적 RPC·동일 Owner 동기화 trigger 구현 — Draft PR #51
- `DONE` 공개·보관 메뉴판 덮어쓰기 차단, explicit confirmation, target advisory lock, 타 계정 전파 차단
- `DONE` 활성 연결 양쪽 hard delete 차단과 대상 Storage 경로 오소유 방지
- `DONE` 신규 shared-menu migration Production 1회 적용과 generated types 재생성 — 2026-08-28 사용자 승인, `docs/runbooks/shared-menu-catalog-migration.md`
- `DONE` 실제 Owner 계정의 안전한 draft 대상에서 독립 복사·연결·연결 해제 Production E2E — 결제·주문·구독 없는 전용 비공개 QA 초안 두 개로 Display 36개 메뉴의 독립 복사, 연결 유지 동기화, 연결 해제 후 데이터 보존·동기화 중단을 확인하고 QA 원본·대상 데이터를 원복한 뒤 전용 초안과 연결 기록만 정리, `docs/shared-menu-catalog.md`

## 3-B. 템플릿 교체·상품 등급

- `DONE` 누아를 제외한 다이닝 5개 출시 템플릿 교체 계약 — 누아는 신규 노출·생성·교체에서 제외하고 기존 데이터 renderer 호환성만 유지
- `DONE` 단일·멀티페이지, 디스플레이 이미지·영상 기능 등급 코드 계약
- `DONE` 교체 시 메뉴·가격·이미지·번역·URL 보존, 할인 비활성·위젯 미노출 후 재검수
- `DONE` 템플릿별 배경·폰트·배지 디자인 스냅샷 보존·복원
- `DONE` Owner-only 편집 화면 교체 UI, 같은 서비스·출시 템플릿 제한, 동시 변경 fail closed
- `DONE` 단일↔단일·멀티↔멀티만 허용하는 서버 등급 제한과 썸네일 카드 교체 UI
- `DONE` 멀티페이지 다이닝의 공통 Call Layer·Order 비활성 Call-only 계약 회귀 검증
- `DONE` 다이닝 신규 SKU·결제 entitlement 연결과 Production 제약 적용 — 단일 월 5,900원·연 63,700원, 멀티 월 9,900원·연 106,900원, 서버 등급 검증·갱신·환불·복구 연결과 기존 고객 레거시 SKU 보존
- `DONE` 다이닝 기능 매트릭스 — 단일 5,900원은 할인·위젯 포함, 멀티 9,900원은 할인·스마트호출 포함, Order는 모든 등급 미제공
- `DONE` `OPEN` 코드 제거·청구 금액 일치 — 하나의 `OPEN` 코드가 단일/멀티·월/연 상품별 할인가를 결정하며, 코드를 지우면 8,900원·106,800원·12,900원·154,800원 정가로 즉시 복원. UI payload·PortOne 요청·서버 preflight·구독/주문/결제 저장·후속 갱신이 저장된 확정 금액을 공통 사용하도록 검증
- `DONE` 판매 가능한 멀티페이지 다이닝 `오브 테이블` 디자인·데이터 계약 — 커버 선택 노출, 최대 10개 메뉴 페이지, 1·2열/정렬 설정, 코스·직접 메뉴 혼합, 페이지 탭 드래그 정렬, 고정 dot 이동과 공개 renderer를 구현. 템플릿명과 스타터 이름을 통일하고 기본 커버는 `THE MENU`·한글 설명으로 구성했으며 기본정보 로고가 있을 때만 표시하고 텍스트 매장명은 커버에서 반복하지 않는다. 시그니처·단품·드링크 완성형 스타터와 전용 커버 이미지를 연결. 모든 페이지의 제목·설명은 중앙 정렬한다. `Signature Course`는 코스·메뉴 정보까지 중앙 정렬하고 `A La Carte Menu`·`Drink Menu` 본문은 왼쪽 정렬한다. Pretendard/Tenor Sans 기본값, 역할별 폰트·색상 저장 연동, 문장형 영문 대소문자, 유동 타이포·여백을 적용했다. `나머지 글자`는 메뉴 본문·가격·품절·Prev/Next와 모바일 헤더·언어 UI·스마트호출 모달 전체에 연동하며 한글/CJK와 영문·숫자를 분리 렌더링한다. 0.4초 페이지 전환 뒤 페이지 제목·코스 제목·메뉴 묶음 reveal과 아래에서 올라오는 스마트호출 bottom sheet를 연결했다. 완료된 실제 번역 데이터가 모두 준비된 언어만 공개하고 그 외에는 KR로 fail closed 한다. 커버 이미지에는 선택 배경색을 기본 75%로 겹치고 편집 화면에서 0~100%로 조절한다. additive migration과 generated types 갱신은 2026-08-30 사용자 승인 아래 Production 완료. 2026-09-14 제품 승인에 따라 9,900원 멀티페이지 신규 구매·동급 교체 후보로 전환
- `DONE` 두 번째 판매 멀티페이지 템플릿 `메종 마레` — A타입의 커버·메뉴 페이지·코스·직접 메뉴·편집·번역·스마트호출 계약과 schema를 재사용하고, PC·태블릿은 왼쪽 페이지 메뉴/오른쪽 콘텐츠, 모바일은 헤더 아래 가로 스와이프 페이지명 탭으로 분리. 버건디·아이보리 컬러, Noto Serif KR·Cormorant Garamond 기본 글꼴, 모던 프렌치 스타터 데이터를 독립 적용. 하단 dot·Prev/Next·페이지 swipe를 제거하고 실제 커버 제목·페이지명만 전체 폭의 상단 정렬 행 버튼으로 표시. 2026-09-14 1440×900·1180×820·390×844 Production 화면과 PC 페이지 이동·console error 0을 재확인하고 오브 테이블과 같은 9,900원 멀티페이지 신규 구매·교체 후보로 전환
- `DONE` 멀티페이지 A·B 생성·편집 계약 QA — 코드 기반 구매 프로비저닝에서 페이지·코스·직접 메뉴·가격 옵션 참조 무결성과 페이지별 1·2열/정렬 설정을 검증했다. 2026-09-10에는 기존 Owner QA 계정에 결제·주문·구독 없는 14일 메종 마레 메뉴판을 생성해 PC·태블릿·모바일 미리보기, PC·태블릿 좌측 페이지 메뉴, 모바일 가로 페이지 탭, KR fail-closed, 실제 페이지 설명 저장·공개 반영·원복까지 확인했다. 이 과정에서 멀티페이지 편집 탭과 최종 저장이 단일 페이지 권한으로 막히는 오류를 PR #129·#130으로 수정했다. 2026-09-14에는 두 템플릿만 동일 등급 신규 구매·교체 후보로 노출하는 계약을 추가했다. 스마트호출 실제 판매 확대는 runtime/site allowlist를 유지해 별도로 fail closed, `docs/runbooks/maison-marais-production-qa.md`
- `DONE` 디스플레이 이미지·동영상 템플릿 통합 가격 — 월 정가 19,900원·오픈할인 14,900원, 연 160,900원. 별도 동영상 addon 없이 MP4 직접 업로드를 포함하고 파일당 30MB·메뉴판당 2개 제한과 장기 캐시를 유지하며, 기존 연 결제의 현재 환불 기준은 소급 변경하지 않음
- `DONE` 디스플레이 `썸머 블루` 이미지·동영상 템플릿 기능 연결 — 이미지 프로모션·분할 메뉴·전체 메뉴·동영상 프로모션 4개 페이지, MP4 직접 업로드, 타임세일, 다국어, 생성·저장·preview/public 계약과 1920×1080·1366×768 fit을 검증. 하단 페이지 제어는 화면 아래 포인터 접근 시에만 나타나고 멀어지면 숨김
- `DONE` 디스플레이 `썸머 블루` HOT·ICE 가격 열 가독성 — 전체 메뉴 양쪽 열에서 옵션 헤더와 가격이 붙지 않도록 유동 열 너비·최소 간격을 보강하고 실제 DOM 간격 12px 이상을 공개 회귀 검사로 고정
- `DONE` 디스플레이 `썸머 블루` 할인 문구 역할 분리 — 바질 크림 라떼는 `시즌할인`, 카푸치노는 `커피할인` 칩과 메뉴별 특별가 문구를 사용한다. 클래식 버터 스콘은 할인 대상에서 완전히 제거해 칩·보조 문구·취소선·할인가 없이 정상가만 표시
- `DONE` 디스플레이 `썸머 블루` 최신 최종 육안 승인 — 2026-09-16 사용자가 미리보기 UX·HOT/ICE 가격 열 보정 화면을 승인하고 베이커리 할인 제거를 최종 조건으로 지정. PR #216에서 클래식 버터 스콘의 할인 칩·보조 문구·취소선·할인가를 제거하고 정상가만 남겨 최종 조건을 충족

## 3-C. AI 크레딧 웰컴 정책

- `DONE` 계정 첫 메뉴판 생성 완료 시 6크레딧 평생 1회 제품 계약 — `docs/ai-credit-policy.md`
- `DONE` 계정 단위 advisory lock·고유 index·소유권·최초 메뉴 재검증 migration 초안
- `DONE` 체험·사업자 신규 메뉴 성공 경로만 웰컴 RPC 연결
- `DONE` 추가 메뉴판·재구독·갱신 재지급과 체험 만료 회수 경로 제거
- `DONE` 요금 안내·FAQ·약관·개인정보처리방침 문구 동기화
- `DONE` 신규 migration Production 1회 적용·postcheck와 generated types 갱신 — 2026-08-28 사용자 승인, `docs/runbooks/ai-first-menu-welcome-credit-migration.md`
- `NEEDS_HUMAN` 전용 신규 QA 계정의 첫 메뉴 6개 지급·추가 메뉴 미지급 E2E

## 3-D. 단일페이지 월결제 30일 무료체험

- `DONE` 연간 가격을 월 할인가 × 12 × 90% 후 100원 단위 내림으로 통일 — 단일 63,700원, 멀티 106,900원, Display 160,900원
- `DONE` 별도 6,600원 개인 체험의 신규 공개 판매 경로 제거 — 과거 결제 복구·만료·전환 호환 코드는 보존
- `DONE` 결제수단 필수 등록, 첫 30일 0원, 30일째 단일페이지 월 5,900원 첫 결제 코드 구현
- `DONE` 무료체험 중 해지 예약 시 30일까지 접근을 유지하고 첫 결제보다 만료를 우선하는 기존 갱신 정책 회귀 검증
- `DONE` 계정당 최초 1회와 과거 개인 체험 중복 제외를 서버에서 fail-closed 검증
- `DONE` 사용자별 1회 trial 기간 컬럼·constraint·partial unique index Production 적용과 generated types 갱신 — 2026-08-29 사용자 승인, `docs/runbooks/business-subscription-free-trial-migration.md`
- `DONE` 승인된 약관 기준으로 Vercel Production `BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED=true` 설정 — 2026-08-29
- `DONE` PR #68 병합·Production 배포·공개 route QA — merge commit `ce844e0`, Vercel Production `READY`
- `NEEDS_HUMAN` 신규 전용 QA 계정에서 빌링키 발급·0원 시작·해지 예약·30일 첫 결제 경계 확인 — 실제 첫 결제 실행은 별도 승인

## 4. 모든 활성 템플릿의 모바일 Order 호환

> 2026-08-29 정책 변경: 아래 항목은 기존 호환 코드 기록이다. 신규 판매·공개 UI·API write에서는 Order를 제품 정책으로 비활성화하며, 모바일 미리보기의 PG 선택 UI도 제거한다.

- `DONE` 공통 모바일 상단 헤더 — template 외부 `PublicMenuExperienceShell`, safe-area sticky shell
- `DONE` 왼쪽 언어 변경 — 공통 locale control, 기존 template mobile control 중복 숨김. 오브 테이블은 원형 globe·그림자 없이 `KR/EN/CN/JP` 텍스트 control과 화면 안쪽 왼쪽 정렬 menu 사용
- `DONE` 가운데 테이블 번호 — 오브 테이블 모바일 헤더에서는 중복 매장명을 제거하고 유효 세션의 table label만 표시
- `DONE` 오른쪽 호출과 장바구니 및 장바구니 수량 — 오브 테이블 모바일은 그림자·외곽 도형 없는 header 호출 아이콘, PC는 기존 하단 호출 진입 유지. 독립 visibility와 99+ 수량 shell, 실제 action은 방문 세션 이후 연결
- `DONE` 기존 카테고리 탭 충돌 방지 — normal-flow sticky header와 6개 Basic mobile route QA
- `DONE` 주문은 모바일만 지원하는 정책
- `DONE` Display는 Order 미지원 정책
- `DONE` 유효한 테이블 방문 세션이 없을 때 주문·호출 숨김 — UI fail-closed selector, 실제 server session 검증은 섹션 5에서 연결

## 5. 테이블 QR와 방문 세션

- `DONE` 마이페이지 메뉴판 카드의 QR 진입을 전부 `QR 관리`로 통일 — 모든 메뉴판에 대표 주소·QR 복사·재다운로드를 공통 제공하고, 테이블별 QR은 스마트호출 지원 상품에서만 추가 노출하도록 대표 QR과 테이블 runtime 권한을 분리
- `DONE` 제품 정책 확정 — 방문 세션 비밀값은 hash-only로 유지하고, 재다운로드 가능한 불투명 공개 UUID를 별도로 사용. 12시간 세션, 메뉴판당 비보관 테이블 100개
- `DONE` DB 기반 migration 초안 — server-only RLS, 테이블 수·세션 만료 constraint, token 회전·비활성 시 세션 revoke
- `DONE` migration 수동 적용과 generated Supabase types 갱신 — 2026-08-06 `tablescene-prod` 1회 적용, `docs/runbooks/table-qr-session-foundation-migration.md`
- `DONE` 테이블 관리 — Owner/Manager create·update·disable·token rotate·archive, default-off runtime gate
- `DONE` 일반 메뉴 QR과 테이블 주문 QR 분리 — 일반 slug는 세션을 만들지 않고 `/table/[token]`만 방문 세션 발급
- `DONE` 안전한 QR 식별자 분리 — 기존 무작위 token hash와 방문 세션 비밀값은 서버에만 유지하고, 인쇄 주소에는 인증 권한이 없는 공개 UUID만 사용
- `DONE` 방문 세션과 만료 — server 발급, 12시간 이내 expiry, Secure·HttpOnly·SameSite=Lax cookie
- `DONE` 세션 재사용·탈취 방지 — menu-site/table/status/revoke/expiry/User-Agent hash 검증, last-seen write throttle
- `DONE` 통합 QR 관리 화면 — 대표 메뉴 주소·QR과 테이블별 고유 주소·QR을 한 화면에서 복사·재다운로드하고, 테이블명 변경은 주소를 유지하며 명시적 QR 교체만 기존 주소·방문 세션을 폐기
- `DONE` 재다운로드 QR용 `qr_public_id` Production migration 적용·generated types 갱신·postcheck — 2026-09-01 사용자 승인 아래 linked `tablescene-prod`에 SQL 파일 한 건만 직접 적용, `docs/runbooks/persistent-table-qr-public-id-migration.md`
- `DONE` 테이블별 고유 QR 계약 — 각 테이블은 예측 가능한 `/table1` 대신 서로 다른 UUID `/table/[uuid]`를 사용하고 서버에서 active table·메뉴판 lifecycle·runtime gate를 재검증
- `DONE` 제품 번들 정책 — 테이블 QR/session은 멀티페이지 9,900원 스마트호출에만 연결하고 단일페이지와 Order에서는 비활성
- `DONE` Production pilot allowlist — `TABLE_MANAGEMENT_ENABLED`와 `TABLE_MANAGEMENT_ALLOWED_SITE_IDS`를 함께 요구하고 관리자 화면·QR 진입·기존 세션 재사용을 동일 메뉴판 UUID로 fail closed
- `DONE` 오브 테이블 Production 파일럿 — 사용자 제공 QA 계정에 결제·주문 없이 14일짜리 전용 메뉴판을 만들고 테이블 2개 생성, 테이블명 변경 시 QR 유지, 실제 호출 접수·확인·완료·2분 제한, 매장별 호출 항목 저장과 공개 반영을 확인했다. 호출 항목 저장 중 발견한 RPC conflict target 모호성 `42702`는 단일 SQL migration으로 Production 수정하고 원복 재검증했다. QR 명시적 교체 후 이전 공개 주소가 `/table/unavailable`로 차단되고 기존 방문 세션의 테이블 정보·호출 권한이 제거되며 새 QR은 정상 동작하는 것까지 확인 완료, `docs/runbooks/aube-smart-call-production-pilot.md`

## 6. 모바일 장바구니와 후불 주문

- `BLOCKED` 실제 Order 상품화·활성화 — 장기간 사용하지 않는 제품으로 확정. 기존 구현과 데이터는 보존하되 환경변수가 남아 있어도 제품 정책 상 UI와 server write를 fail closed

- `DONE` V1 정책 확정 — Postpay 우선, Order·Call 별도 add-on, tableSessions 포함, 기기별 cart, 20 lines·50 units·line 20
- `DONE` DB 기반 migration 초안 — orderable 분리, 주문 option, session-bound order, immutable snapshot, idempotency, server-only RLS
- `DONE` migration Production 1회 적용과 generated Supabase types 갱신 — 2026-08-06 `tablescene-prod`, `docs/runbooks/postpay-order-foundation-migration.md`
- `DONE` 메뉴·옵션 선택과 수량 — 공통 모바일 drawer, required/min/max option, line/total limit
- `DONE` 장바구니 — visit-session scope local cart와 retry request UUID 유지; 요청사항 입력은 현재 고객 UI에서 제외하고 기존 선택적 DB 필드만 호환 유지
- `DONE` 테이블 번호와 주문 전송 — HttpOnly session 재검증 API와 atomic RPC Production 적용 완료
- `DONE` 주문 당시 메뉴·가격 snapshot — 제출 transaction에서 immutable snapshot 생성
- `DONE` 품절 주문 차단 — 제출 transaction에서 `visible/orderable/is_sold_out` 재검증
- `DONE` 중복 주문 방지 — session + client request UUID advisory lock/idempotency
- `DONE` atomic 주문 RPC migration Production 1회 적용과 generated types 갱신 — 2026-08-06 `tablescene-prod`, `docs/runbooks/postpay-order-submission-rpc-migration.md`
- `BLOCKED` Order 재개 — 향후 별도 제품 결정 전에는 `POSTPAY_ORDER_ENABLED`, allowlist, PG를 활성화하지 않음

## 7. 주문관리와 수동 결제

- `DONE` 전용 `매장 운영` 허브 — MY/메뉴판 상단 버튼과 마이페이지 왼쪽 메뉴에서 새 창으로 진입하고, 공개·활성 멀티페이지와 Display 메뉴판을 runtime 활성 전에도 상단 탭에 노출. Order·매출 메뉴와 대시보드 요약은 UI에서 숨기고 호환 코드만 보존하며, 스마트호출·테이블·대기번호는 개별 runtime·site allowlist·권한에 따라 비활성 사유를 표시
- `DONE` 매장 운영·모바일 계정 UX — 운영 왼쪽에 AI 크레딧 없는 로그인 정보 제공, 모바일 알림을 햄버거 옆 숫자 배지 아이콘으로 이동, `1:1 문의` 로그인 복귀와 임시 `채팅상담` 동선 제공
- `DONE` 매장 운영 진입 위치 — 공통 PC·모바일 헤더에서는 제거하고 MY/메뉴판의 `메뉴판 추가 구매` 버튼을 `매장 운영`으로 교체
- `DONE` 주문 접수·조리 전·조리 중·조리 완료·제공 완료 — 전방향 단계별 conditional update
- `DONE` 미결제 주문 취소와 취소 사유 — 제공 전·미결제만 1–500자 사유로 취소
- `DONE` 기존 카드단말기 결제완료 — ArtiMenu 카드 승인 없이 `manual_card` 기록
- `DONE` 현금 결제완료 — `manual_cash` 기록
- `DONE` 처리 직원 기록 — 재인증 permission gate와 `status_updated_by`/`payment_completed_by`
- `DONE` 브라우저 영수증 — immutable snapshot 기반 인쇄 전용 영수증
- `BLOCKED` Order Dashboard 신규 활성화 — Order 재개 정책 전까지 기존 화면만 보존

## 8. Call 기능

- `DONE` 손님 직원 호출 MVP — 유효 table session과 공통 Call Layer, 직원 호출 단일 preset
- `DONE` 오브 테이블 스마트호출 경험 — 우측 하단 전용 호출 버튼, 테이블 번호와 관리자 항목명만 노출하는 white bottom sheet, 바깥 영역·handle 닫기, 실제 write 없는 공개 템플릿 미리보기, 호출 완료·취소 후 2분 cooldown 안내
- `DONE` 기본 호출 항목 미리보기 — 물·식기·테이블 정리 뒤 범용 직원 호출을 마지막 대안으로 두는 4개 선택지를 실제 write 없는 화면에서 확인 가능
- `DONE` 실제 매장별 호출 항목 관리·저장·전송 코드 — 기본 4개, 매장별 이름·순서·사용 설정, 보관 처리, 접수 당시 항목명 snapshot, 기존 제한 유지
- `DONE` 매장별 호출 항목 Production migration 1회 적용과 generated types 갱신 — 2026-08-28 사용자 승인, `docs/runbooks/store-call-items-migration.md`
- `DONE` 호출 목록과 처리 직원 — `call.manage` Owner/Manager/Order staff 권한과 actor 기록
- `DONE` 접수 확인과 처리 완료 — `pending → acknowledged → completed` conditional update
- `DONE` 중복·과다 호출 방지 — 미처리 호출 반환, 완료·취소 후 2분 cooldown, session당 시간당 10회
- `DONE` 호출 이력 — 최근 100건과 테이블·선택 호출 내용·상태·시간을 15초 갱신 대시보드에서 조회
- `DONE` Call MVP migration Production 1회 적용과 generated types 갱신 — 2026-08-07 `tablescene-prod`, `docs/runbooks/call-mvp-foundation-migration.md`
- `DONE` 실제 Call 상품 entitlement — 멀티페이지 다이닝 9,900원 번들에 포함하고 단일페이지·Display·Order에서는 fail closed
- `DONE` 실제 Call Production 파일럿 — 오브 테이블 QA 메뉴판 하나만 allowlist에 두고 테이블 QR 진입, 호출 접수·관리 상태 전환·cooldown·호출 항목 변경, QR 교체에 따른 이전 주소·세션 폐기까지 Production에서 확인. 실제 판매 확대 전까지 단일 QA allowlist 유지

## 8-A. Display 수동 대기번호

- `DONE` POS·Order·PG와 분리된 무료 수동 MVP 계약 — 사장이 숫자만 등록하고 `준비 중 → 픽업 요청 → 수령 완료`로 처리
- `DONE` 관리자 `매장 운영 > 대기번호` 화면과 공개 `/pickup/[slug]` 대기판 — 오늘 번호만 표시하고 10초 자동 갱신. 공개 대기판은 실제 메뉴판의 `template_key`와 저장된 글꼴 설정을 읽어 템플릿별 전용 디자인으로 연결하며, 현재 판매 가능한 Display `썸머 블루(display_menu_a)`는 청록·화이트 팔레트와 동일 타이포를 사용
- `DONE` Owner/Manager/Order staff의 `pickup.manage` 권한, 직원 write audit, Display·활성 lifecycle·runtime/site allowlist fail-closed 경계
- `DONE` 향후 POS adapter 경계 — `source=external`, `external_order_ref`를 예약하고 현재 UI·상태 모델 재사용
- `DONE` Production migration 적용과 generated types 재생성 — 2026-09-01 `tablescene-prod` 1회 적용, RLS·FORCE RLS·service-role 최소 권한·인덱스 postcheck 완료, `docs/runbooks/manual-pickup-queue-migration.md`
- `DONE` Production pilot 활성화와 E2E — 공개 `260630test` 한 곳에만 Vercel `PICKUP_QUEUE_ENABLED=true`·명시적 site allowlist를 설정하고 재배포. QA 번호 `9999`를 `준비 중 → 픽업 요청 → 수령 완료`로 전환해 관리자 화면·공개 대기판·DB 타임스탬프를 확인했으며 활성 목록에는 남기지 않음
- `BLOCKED` POS 자동 연동 — POS 업체·API·계약·인증·주문번호 규칙 확정 후 진행

## 9. 선결제 PG

- `DONE` 현재 PortOne 코드·공식 V2 문서 감사와 merchant 구조 권장안 — `docs/prepay-pg-decision.md`
- `DONE` PortOne 파트너 정산 자동화·오픈마켓 하위상점 전표 지원 추가 감사 — 배달 플랫폼·식당 정산 사용 사례는 확인했으나 직접 merchant 구조와는 구분, `docs/prepay-pg-decision.md`
- `NEEDS_HUMAN` PortOne에 독립 음식점 직접 merchant 구조와 ArtiMenu 플랫폼 하위 정산 구조의 계약·전표·정산 책임 서면 확인
- `NEEDS_HUMAN` 음식점 직접 merchant와 ArtiMenu 플랫폼 하위 정산 중 제품·법률·운영 모델 결정
- `BLOCKED` 사업자별 PG 온보딩 구현 — PortOne 답변과 첫 pilot 음식점 확정 후 진행
- `BLOCKED` 모바일 선결제 — Order/PG 장기 비활성 제품 정책이 해제되고 계약 구조가 확정될 때까지 구현하지 않음
- `BLOCKED` 웹훅과 idempotency — Order/PG 장기 비활성 제품 정책이 해제되고 계약 구조가 확정될 때까지 구현하지 않음
- `BLOCKED` 결제 실패 — Order/PG 장기 비활성 제품 정책이 해제되고 계약 구조가 확정될 때까지 구현하지 않음
- `BLOCKED` 취소·부분취소·환불 — Order/PG 장기 비활성 제품 정책이 해제되고 계약 구조가 확정될 때까지 구현하지 않음
- `BLOCKED` 주문 상태와 결제 상태 분리 — Order/PG 장기 비활성 제품 정책이 해제되고 계약 구조가 확정될 때까지 구현하지 않음
- `NEEDS_HUMAN` 실제 결제·취소·환불 검증

## 10. 매출관리와 알림

- `DONE` 일별·월별 매출과 주문 수 — 한국 시간 기준 주문 접수·결제 완료 시각 분리 집계, `sales.read`와 기존 Order Dashboard default-off gate 재사용
- `DONE` 메뉴별 판매량 — 결제 완료 주문의 immutable item snapshot을 메뉴명 기준으로 합산한 Top 10
- `DONE` 결제수단별 집계 — 외부 카드 단말기·현금·PG 완료 건수와 금액
- `DONE` 취소·미결제 집계 — 당월 생성 주문의 현재 취소·미결제 건수와 주문금액
- `DONE` 주문 알림과 호출 알림 — 최초 목록은 조용히 기준선으로 저장하고 이후 15초 갱신에서 새 ID만 session-scoped 앱 내 배너·문서 제목으로 표시
- `DONE` 사용자 선택형 브라우저 알림 — 관리 화면에서 직접 켠 경우에만 비활성 탭·창에서도 기존 15초 갱신을 유지해 새 ID를 일반화된 문구로 표시, 자동 권한 요청·소리·외부 전송·백그라운드 push 없음
- `NEEDS_HUMAN` 알림톡·문자·백그라운드 push 같은 외부 채널의 업체·비용·동의·fallback 정책 결정

## 11. 전체 고객 흐름 QA

- `DONE` 반복 가능한 전체 계약 테스트 — `npm test` 한 명령으로 28개 파일·142개 테스트 실행, 해지 예약 구독 재결제 차단과 Order/Call 공통 gate 회귀 포함
- `DONE` Production `menu_site_id is null` 결제 주문 읽기 전용 감사 — 3건 중 AI 크레딧 10개 충전 2건은 계정 단위 정상 완료로 확인하고, 실제 미이행은 주소 중복으로 메뉴판·entitlement가 생성되지 않은 과거 6,600원 개인 체험 1건으로 분리. 고객 식별정보와 결제 ID는 출력하지 않음, `docs/runbooks/incomplete-payment-order-audit.md`
- `DONE` 과거 미이행 개인 체험 결제 1건 처리 — 2026-09-01 사용자 승인 후 재확인에서 PortOne은 이미 6,600원 전액 취소(`CANCELLED`) 상태임을 확인. 중복 취소 요청 없이 Production 주문을 `refunded`, 결제를 `cancelled`로 정합화하고 재조회 통과. 메뉴판·entitlement 변경 없음, `docs/runbooks/incomplete-payment-order-audit.md`
- `NEEDS_HUMAN` 회원가입·구매·메뉴판 생성 — 전용 신규 QA 계정의 실제 가입 메일·인증 링크·로그인 세션 E2E 완료. 구매·첫 메뉴 생성은 실제 빌링키와 PortOne 단계가 필요
- `DONE` 직원 초대·수락·접근 — 승인된 기존 Owner·직원 계정으로 실제 이메일 발송·수락과 viewer 화면·미리보기·편집 차단 E2E 확인
- `DONE` 메뉴 편집·디자인·위젯·다국어 — 활성 템플릿 저장·locale·capability·preview/public QA 재확인
- `DONE` 미리보기·공개·일반 QR — 공통 renderer·기기 프레임·공개 route·QR 분리 QA 재확인
- `DONE` 멀티페이지 스마트호출 로컬 통합 QA — 유효 세션·Business Basic·멀티페이지·runtime 공통 gate, 단일페이지·no-session·Display 제외, 호출 접수·처리 상태 흐름 재검증
- `DONE` 테이블 QR·방문 세션·스마트호출 Production E2E — 전용 오브 테이블 QA pilot의 생성·테이블명 변경 시 QR 유지·실제 호출 전체 상태 전환·2분 제한·호출 항목 저장/공개 연동·QR 교체 후 이전 주소 및 기존 방문 세션 차단·새 QR 재진입까지 확인
- `BLOCKED` 주문관리·수동 결제완료 E2E — Order 제품 재개 전까지 기존 호환 코드만 보존
- `NEEDS_HUMAN` 보관·복구·해지 — Owner runtime 감사 완료, 실제 구독 상태 변경 E2E 필요

## 12. 오픈 준비

- `DONE` 관리 액션 피드백 토스트 — 기존 상단 성공·오류 안내 박스를 유지하면서 테이블·호출·대기번호·직원·문의·메뉴 가져오기·인증 흐름의 액션 결과를 현재 viewport에서도 즉시 확인하도록 공통 Sonner 토스트를 병행 표시
- `DONE` 사용자 표시 브랜드를 `아티메뉴` / `ArtiMenu`로 통일하고 내부 호환 식별자는 유지
- `DONE` PG 심사용 다이닝 5상품 분리 노출과 공개 상품 상세·제공·교환·환불 안내 — `docs/pg-site-review-readiness.md`
- `DONE` QR오더 소개의 미구현 PG·정산 표현 제거와 계약 전 준비 상태 명시
- `DONE` 직원 초대 이메일 실제 발송과 기존 직원 계정 수락
- `DONE` Production 의존성 보안 패치 — Next.js 16.3.1, eslint-config-next 16.3.1, React Router 7.18.2와 안전한 transitive 버전으로 갱신하고 Production audit 0건 및 전체 138개 테스트·TypeScript·lint·build 재검증
- `DONE` 아티메뉴 Supabase Auth 메일 문구·Production 템플릿 적용 — 회원가입 인증과 비밀번호 재설정 제목·HTML을 준비하고 2026-09-01 `tablescene-prod`에 두 템플릿만 적용·새로고침 재검증. callback/reset 경로, QA·롤백·보안 기준은 적용 런북에 기록
- `DONE` 회원가입·비밀번호 재설정 이메일 기능 QA — 재설정 메일의 Resend `delivered`·한국어 제목·HTML·발신자·recovery redirect와 네이버 데스크톱 렌더링을 확인했다. 신규 QA 계정의 가입 메일은 Gmail 실제 수신, DKIM·SPF·DMARC 통과, 한국어 제목·HTML, 인증 링크의 `/mypage` 이동과 로그인 세션 생성까지 완료. TokenHash 기반 재설정 메일 수신·확인 화면·새 비밀번호 저장·새 비밀번호 로그인과 만료 링크 fail-closed를 Production에서 확인했다. 390px 로컬 렌더링에서 두 메일 HTML의 가로 overflow가 없으며, 실제 모바일 메일 클라이언트의 시각적 렌더링 확인만 비기능 최종 점검으로 남음
- `DONE` Production custom SMTP와 Auth URL 설정 확인 — Resend 인증 도메인 `dndcommerce.co.kr`, 전용 sending key, `아티메뉴 <no-reply@dndcommerce.co.kr>`, `smtp.resend.com:465` 활성화. Site URL과 Production/Preview callback·reset redirect 재확인
- `DONE` Production 환경변수·비밀키 읽기 전용 감사 — 2026-09-14 Vercel에서 필수 12개 변수의 이름·Production/Preview scope·Secret/Config 분류·경고 부재를 값 공개 없이 확인했다. Cron·AI·Supabase·Resend·PortOne은 실제 runtime 결과로 유효성을 교차 확인했고 결제 mutation과 환경변수 변경은 하지 않았다, `docs/runbooks/vercel-production-runtime-audit.md`
- `NEEDS_HUMAN` 외부 공급자 비밀키 정기 교체 — 새 키 발급·Production 교체·재배포·기존 키 폐기는 공급자별 rollback과 runtime 재검증을 준비한 뒤 별도 운영 창에서 수행
- `DONE` Vercel Cron 실제 실행 QA — Production Logs에서 `/api/cron/expire-personal-trials`와 `/api/cron/process-notification-events`의 `GET 200`, `/api/cron/process-subscriptions`의 `GET 200`·`completed`를 확인했다. 구독 작업은 `dryRun=true`, `execute=false`, `failed=0`, `lifecycleErrors=0`으로 실제 결제·취소·데이터 변경 없이 완료됐고 legacy/stale lifecycle anomaly 16건만 보고했다. Run 버튼과 Production 상태는 변경하지 않음, `docs/runbooks/vercel-production-runtime-audit.md`
- `NEEDS_HUMAN` PortOne 실제 결제 확인
- `DONE` 약관·개인정보 처리방침 시행일과 프로모션 기간 확정 — 시행일·오픈 할인 시작일은 2026년 10월 1일, 오픈 할인 종료일은 2027년 9월 30일로 통일
- `DONE` 판매·교체 대상 템플릿 최종 디자인 육안 확인 — 2026-09-14 썸머 블루는 사용자 육안 승인, 메종 마레는 PC·태블릿·모바일 Production 확인을 완료했다. 오브 커피·모카 포레스트·선데이 라인·라운드 포커스는 1440×900·390×844 캡처와 8개 Production 경로의 overflow·이미지·콘솔 자동 검사를 통과했다
- `DONE` 최종 배포 — 정책·AI 상담·토스트·QR 관리 통일과 멀티페이지 A·B 판매 전환을 Production에 반영했다. PR #140 병합·Production 배포, PR #141 결제 안내 문구 보정 병합·Production 배포 후 `/apply/basic`에서 9,900원 멀티 요금과 오브 테이블·메종 마레 썸네일 노출을 확인했다

## 13. 향후 AI 상담

- `DONE` AI 챗봇 초기 제품 범위 — 사이트 이용 안내만 제공하고 계정·결제·환불 실행 및 개인정보 입력을 금지하며 불확실한 답은 1:1 문의로 전환, `docs/ai-support-chat-policy.md`
- `DONE` 대화 DB 미보관, OpenAI Responses API `store=false`, 질문 500자·응답 300 token 제한, 민감정보 사전 거부, default-off runtime gate
- `DONE` `/support/chat` 상담 화면과 고객센터 진입 — runtime-off에서는 준비 중 안내와 1:1 문의만 표시
- `DONE` 비용 효율형 `gpt-5.6-luna` 로컬 실제 API QA — 요금제·30일 무료체험 안내, 계정 변경 요청과 system prompt 탈취 요청 거절, 자연스러운 한국어·plain text 응답 확인
- `DONE` Vercel Production Firewall `/api/support/chat` IP별 10분 6회·초과 `429` 규칙 적용과 활성 상태 재확인
- `DONE` `ArtiMenu AI Support` 전용 OpenAI 프로젝트 — `gpt-5.6-luna`만 허용, 월 5달러 hard limit, 50%·80%·100% 알림, 15,000 TPM·10 RPM 제한
- `DONE` 상담 전용 `OPENAI_SUPPORT_API_KEY` 분리와 Vercel Production secret 반영 — 기존 `OPENAI_API_KEY`는 로컬·호환 fallback으로만 유지
- `DONE` 개인정보 처리방침 수탁자 목록의 실제 OpenAI 법인명 반영과 국외 이전 필수 항목·공개 문구 검토안 작성 — `docs/ai-support-privacy-disclosure-review.md`
- `DONE` AI 상담 별도 국외 이전 동의 UI, 서버 동의값 검증, 개인정보 처리방침 상세 고지 반영
- `BLOCKED` OpenAI 미국 리전 단일 처리 고정 — 현재 로컬 운영 키는 미국 리전 엔드포인트에서 401, 글로벌 엔드포인트는 정상 응답. 미국 리전 프로젝트·키 준비 전에는 최신 API 하위처리 국가 목록을 함께 고지
- `DONE` AI 상담 Production 공개 — 개인정보 처리방침 시행일을 2026년 10월 1일로 확정하고 2026-09-14 Vercel Production Config `AI_SUPPORT_CHAT_ENABLED=true`를 추가해 재배포 `CSCjQtpMbTtBzSexv1j51gppL5yK`의 `Ready`를 확인했다. 공개 `/support/chat`에서 국외 이전 동의 전 입력 비활성, MP4 이용 안내 실제 응답, 카드번호 형식의 민감정보 사전 차단과 1:1 문의 전환을 재검증했다.
- `DONE` AI 상담 상품 지식 최신화 — 판매 중인 오브 테이블·메종 마레, 단일·멀티·Display 할인, 대표·테이블별 QR, AI 크레딧 지급·차감 기준을 독립된 검증 가능 컨텍스트로 분리했다. 로컬 실제 API에서 Display 할인·MP4 질문이 현재 정책대로 응답하는 것을 확인했다.
- `DONE` 고객센터 1차 정보 구조·디자인 — 고객센터 첫 화면에서 FAQ·AI 상담·1:1 문의를 목적별로 분리하고, FAQ를 왼쪽 정렬·무그림자·불투명 표면 체계로 정돈했다. 연 결제 표기와 Display 기능 안내의 오래된 문구도 현재 상품 기준으로 보정했다.

## 14. 출시 전 디자인·실사용 최종화

- `IN_PROGRESS` 현재 Production 기능 베이스라인 재검증 — 오브 테이블 QA의 스마트호출 4개 항목·완료 이력 3건, 활성 테이블 1개, 대표·테이블별 QR 다운로드 성공 토스트를 화면과 DB에서 확인했다. 호출 설정/내역 탭, 검색·상태·날짜·처리자 필터, 확인자·완료자와 각 처리 시각, 최대 5개 항목, 상시 화면 알림과 선택형 브라우저 알림·소리까지 Production `eb09e7e`에서 재검증했다. Display 대기번호 공개 API·화면 200과 완료 이력 1건도 확인했다. 현재 QA 계정이 소유한 Display 메뉴판이 없어 새 번호 등록·픽업·수령 쓰기 흐름만 남음, `docs/runbooks/production-feature-baseline-qa.md`
- `IN_PROGRESS` 메뉴 제작 AI 실사용 E2E — 기존 Production QA 메뉴판에서 설명 생성 `-1`, 메뉴 정리 `-3`, 다국어 부분 번역 `-1` 거래와 최근 4크레딧의 정확한 잔액 감소를 확인했다. 신규 계정의 첫 메뉴 6크레딧 평생 1회 지급·추가 메뉴 미지급과 실패 롤백은 30일 무료체험 E2E에서 함께 확인, `docs/runbooks/production-feature-baseline-qa.md`
- `NEEDS_HUMAN` 신규 결제·30일 무료체험 실제 E2E — 사업자 확인·실제 결제수단 등록, 0원 시작, 해지 예약·복구, 30일 종료 경계의 첫 결제·만료 우선순위를 확인. 실제 카드 입력 단계만 사용자 작업 필요
- `DONE` 직원 권한 2차 설계 — 고정 역할을 `매니저`·`편집자`·`운영 직원`·`조회 전용` 프리셋으로 정리하고 직원별 허용/차단 덮어쓰기를 추가했다. 결제·구독·보관·삭제·직원 관리는 Owner 전용으로 유지하고 제한 기능은 숨기지 않고 비활성 사유를 표시한다. 2026-09-14 `20260914074800_add_staff_permission_overrides.sql`을 `tablescene-prod`에 단일 적용했으며, 검증 제약과 service-role 전용 RPC 권한을 postcheck했다. `docs/runbooks/staff-permission-overrides-migration.md`
- `DONE` 사이트 전체 시각 시스템 재정비 — `DONE` Pretendard 기반 전역 타이포 단계: 기초 크기·굵기 토큰과 의미별 역할(디스플레이·페이지·섹션·하위 섹션·본문 제목·항목 제목·3단계 본문·레이블·내비게이션·캡션)을 확정했다. 홈페이지·공개 페이지·인증·고객센터·신청·MY/메뉴판·편집기·매장 운영·관리자와 중첩 컴포넌트의 H1~H6를 전수 연결하고, 일반 UI에서 900 굵기와 숫자 직접 입력 크기를 제거했다. 모든 이름 기반 본문 크기도 기초 토큰에 연결했으며 새 활성 UI가 계약을 벗어나면 실패하도록 `app` 라우트와 루트 `components` 전수 검사로 확장했다. `DONE` 버튼·카드 단계: 검정 주요 버튼, 흰색 보조 버튼, 빨강 위험 버튼과 40/44/52px 높이, 무확대 호버, 포커스·비활성 규칙을 공통화했다. 카드는 흰 배경·1px 중립선·24px 모서리·무그림자로 통일하고 MY/메뉴판, 편집기, 매장 운영, 고객센터, 인증, 신청 화면의 공통 액션과 표면을 연결했다. `DONE` 입력·선택 단계: 텍스트 입력·본문 입력·선택 상자의 높이, 모서리, 선, 글자, 포커스·비활성·오류 상태와 체크·라디오 포커스를 공통 토큰으로 연결했다. `DONE` 모달·토스트 단계: 공통 Dialog·AlertDialog·Sheet·Drawer와 AI 상담창, Sonner 토스트를 중립선·무그림자 표면과 의미 기반 제목·설명 역할에 연결했다. AI 크레딧·회원탈퇴·구독 관리·재구독 복구·담당자 수정·결제 상세 등 계정·결제 모달, 메뉴 편집기의 삭제·초기화·이미지·번역·AI 설명·AI 메뉴 정리 확인창, 신청·동의 상세 시트까지 같은 표면 체계로 통일했다. `DONE` 상태 색상 단계: 성공·주의·오류·정보의 배경·선·텍스트 강도를 의미 토큰으로 고정하고 기존 emerald·amber·red 알림 조합도 같은 팔레트로 정규화했다. `DONE` 여백·그리드 1차: 공개·신청·인증·고객지원 화면의 페이지 상하 간격과 카드 그리드 간격을 반응형 토큰으로 묶고, 약관 문서의 개별 그림자를 제거해 공통 카드 표면으로 정리했다. 매장 운영 허브와 호출·테이블 QR·대기번호 화면, 마이페이지 본체와 메뉴판 생성·미리보기 제한·가져오기·전환·QR 관리 화면, 메뉴 편집기의 외곽·탭 내비게이션·주요 섹션·구조 편집 패널은 공통 반응형 페이지 간격과 무그림자 표면을 적용했다. 고객 편집형 메뉴 템플릿은 호환 규칙에서 제외해 고유 색상과 레이아웃을 보존한다. `DONE` 편집기 모바일 액션 단계: 기본·페이지·인트로·커버·소개·이벤트·디자인·공개·메뉴 구성의 최종 액션을 같은 공통 표면으로 묶고, 640px 미만에서는 초기화·저장 버튼을 한 열 전체 폭으로 배치해 긴 문구와 복수 액션이 겹치거나 카드 밖으로 넘치지 않게 했다. 2026-09-16 로그인된 QA 세션의 390×844 실제 화면에서 기본 정보와 긴 메뉴판 구성 목록·하단 저장 액션을 확인하고, 상단 미리보기·공개 보기·QR 다운로드도 한 열 전체 폭으로 정리해 모바일 육안 회귀를 완료했다
- `DONE` 고객센터 전용 디자인 — FAQ·AI 상담·1:1 문의의 정보 구조와 무그림자 표면 체계를 정리했다. 중복된 FAQ 진입 카드와 하단 검정 CTA를 제거하고, 고객센터의 AI 상담 카드는 별도 페이지 이동 없이 공통 퀵 상담창을 직접 열도록 연결했다. FAQ는 카테고리·질문 통합 검색을 지원하며 화면 밖 문항도 즉시 표시한다. AI 상담은 모바일 키보드 축소 상황에서도 입력창과 최신 답변을 유지하고, 문의 내역은 제목 검색·답변 상태 필터를 독립 문의 페이지와 MY 탭에 동일하게 연결했다. 문의 작성·수정 폼은 공통 필드·타이포와 한글 레이블로 통일했다. 390px 및 390×430 실제 Chrome 회귀를 완료했다
- `DONE` 메뉴판 종료 상태 문구 — 내부 상태값과 보관·복구 정책은 유지하면서, MY/메뉴판의 탭·카드·빈 상태와 접근 제한 안내에 노출되던 `삭제됨`을 고객 친화적인 `종료됨`으로 통일
- `DONE` AI 상담 콘텐츠·대화 UX 보정 — 현재 판매 정책·QR·AI 크레딧 지식과 추천 질문을 최신화하고, 2026-09-16 Production에서 추천 질문 4종을 실제 전송해 가격·기능 경계·QR·스마트호출·AI 크레딧·디스플레이 업로드 제한과 답변 길이를 확인했다. 모바일 채팅창의 중복 안내·여백·버튼 폭·메시지 폭을 보정하고 오류 발생 때뿐 아니라 상담 중 언제든 1:1 문의로 전환할 수 있게 했다. 390×844와 키보드 축소 390×430 실제 Chrome에서 입력창·최신 답변 자동 스크롤·국외 이전 동의 접힘을 재검증했으며, 문의 내역 제목 검색·답변 상태 필터와 작성·수정 폼의 공통 필드·한글 레이블도 두 진입 경로에 동일하게 연결했다. `docs/runbooks/ai-support-production-qa.md`
- `DONE` 판매 템플릿 디자인 2차 보정 — 단일페이지 4종은 스타터 밀도·4개 언어·유동 타이포·간격·모카 포레스트 언어 UI를 보정했고, 모바일 언어 UI를 제목 위 독립 행 오른쪽으로 통일했다. 태블릿은 공통 1.12 장치 글자 배율을 사용하고 방향은 한 개의 화면 회전 아이콘으로 전환한다. 오브 커피·모카 포레스트는 선데이 라인의 기기별 가게명 계산식과 카테고리·보조언어명·설명·가격·옵션명 비율을 공유하고, 대표 역할은 모든 기기에서 대응 메뉴 역할과 같은 크기로 유지한다. 선데이 상·하단 행 간격과 라운드 포커스 1:1:1 열 비율을 확정했으며 라운드 포커스 외곽·열 내부 여백도 확대했다. 멀티페이지 2종은 기존 승인 디자인과 독립 반응형·모션 계약을 유지했다. Display는 미리보기 안내·하단 제어·HOT/ICE 가격 열·할인 대상을 보정했으며, 베이커리 할인 제거를 최종 조건으로 한 썸머 블루 육안 승인을 완료
- `IN_PROGRESS` 전체 회귀 QA — 공개 홈·신청·고객지원·인증·약관과 판매 템플릿을 PC 1440×900·모바일 390×844로 반복 검사하는 `npm run qa:public-surfaces`를 추가했다. 2026-09-16 Production 31개 화면에서 HTTP 오류·가로 overflow·깨진 이미지·console/page error·유효한 같은 도메인 요청 실패가 모두 0임을 확인했다. 이어 axe-core WCAG A/AA의 심각도 `critical`·`serious` 검사도 고정하고, 처음 발견된 19개 화면의 명암 대비 오류를 위치별로 보정했다. PR #200의 Vercel Preview와 Production 배포 후 실제 공개 도메인의 31개 화면을 다시 검사해 렌더링·접근성 실패 0건을 확인했다. 메뉴판 미리보기 도움말은 최초 노출, 체크하지 않고 `닫기`를 눌렀을 때의 세션 닫기, `오늘 하루 보지 않기`를 체크한 뒤 닫았을 때의 당일 닫기를 실제 브라우저로 검사한다. 또한 단일페이지 4종의 데스크톱 fit 상태가 `ready`로 안정화되고 엔진 overflow·실제 DOM 경계 잘림·scroll overflow가 없어야 통과하도록 보강했다. 2026-09-21 최신 로컬 공개 회귀 31개 화면과 템플릿 locale·툴바·기기별 역할 타이포그래피 회귀 34조합은 모두 실패 0건으로 통과했다. 로그인 전용 QA 계정만 사용하는 `npm run qa:authenticated-surfaces`도 추가해 마이페이지·편집기·매장 운영·직원 관리의 PC·390px 화면, 세션 유지, 잘린 액션, 접근성 오류를 읽기 전용으로 반복 검사할 수 있게 했다. 다음은 전용 QA 자격증명으로 인증 화면 자동 검사를 실행하고 구매·메뉴 생성·다국어·AI·QR·호출·대기번호·직원 권한의 write E2E와 실제 모바일 메일 클라이언트를 확인하는 단계다. `docs/runbooks/public-surface-regression-qa.md`, `docs/runbooks/authenticated-surface-regression-qa.md`

## 다음 작업

권장 순서는 ① 현재 Production의 호출·대기번호·QR·메뉴 AI 기준선 재검증 ② 실제 결제수단이 필요한 30일 무료체험·웰컴 크레딧·해지 전체 E2E ③ 사이트 공통 디자인 시스템 확정 ④ 공개 사이트·인증·MY/메뉴판·편집기·매장 운영의 단계적 시각 개편 ⑤ 고객센터 디자인과 AI 상담 콘텐츠·대화 UX 보정 ⑥ 템플릿별 디자인 2차 보정 ⑦ 전체 기기·권한·외부 연동 출시 회귀 QA ⑧ 모바일 메일 확인·계획된 비밀키 교체이다. `오브 테이블`·`메종 마레`는 9,900원 멀티페이지 상품으로 유지하고, QR오더·PG·POS 주문은 별도 재개 결정 전까지 장기 비활성으로 보존한다. Production 실제 카드 입력·비밀키 발급·폐기 단계만 사용자 작업이 필요하다.
