# 아티메뉴 템플릿 문서 안내

전체 서비스·가격·약관 문서는 [아티메뉴 프로젝트 문서 안내](artimenu-project-guide.md)에서 확인한다.

기준일: 2026-11-11. 아래 등록 목록은 현재 코드와 대조한 문서 요약이다. 문서 확인은 모든 화면·옵션 조합의 회귀 검수를 대신하지 않는다.

## 문서를 읽는 순서

| 확인할 내용 | 현행 문서 | 실제 등록·구현 경계 |
| --- | --- | --- |
| 작업의 필수 기준 | [아티메뉴 개발 작업 규칙](../AGENTS.md) | 사용자 승인 및 적용 범위 |
| 템플릿 구조·리스트/앨범 구분 | 이 문서의 등록표, [렌더러 구조](menu-template-architecture.md) | [menu-design-policy](../lib/menu-design-policy.ts), [catalog-designs](../lib/catalog-designs.ts) |
| 여백·글자·비율·카테고리·위젯·안내사항 | [템플릿 공통 계약](template-spacing-contract.md) | 해당 계약에서 연결한 공통 토큰·측정·배치 모듈 |
| 미리보기 보기옵션 | [보기옵션 계약](template-preview-display-options.md) | [template-preview-options](../lib/template-preview-options.ts), [menu-preview-design](../lib/menu-preview-design.ts) |
| 스타터 문구·번역·구매 일치 | [스타터 번역 기준](starter-translations-qa.md) | [starter-preview-localization](../lib/template-demo-data/starter-preview-localization.ts), [starter-translation-provisioning](../lib/starter-translation-provisioning.ts) |
| 다이닝 페이지·코스 | [다이닝 제품 계약](aube-table-multi-page-template-contract.md)과 공통 계약의 최신 Dining 절 | [aube-table](../lib/aube-table.ts), [DiningAubeTableA](../components/menu-templates/DiningAubeTableA.tsx) |
| 공식 사이트 UI | [사이트 디자인 시스템](site-design-system.md), [타이포그래피](site-typography-final.md), [컨트롤](site-control-contract.md), [작업 영역](site-content-layout-contract.md) | 공통 사이트 컴포넌트와 CSS |

새 승인이 적용 범위에 해당하면 그 승인이 우선이다. 공통 계약의 최신 적용 절을 먼저 읽고, 날짜가 있는 과거 QA 기록을 현행 규칙으로 복원하지 않는다. 문서와 구현이 다르면 차이를 확인해 함께 수정하며, 코드에 있다는 이유만으로 사용자 승인보다 우선하지 않는다.

## 최신 본문 열 너비 규칙 — 2026-11-11

베이직 PC·태블릿의 1열 고정형과 상단행형 본문은 별도 대표열과 각 메뉴 열의 실제 사용 너비를 같게 계산한다. 기본/디자이너·리스트/앨범 모두 [대표열과 메뉴 열의 동일 너비](basic-menu-scroll-policy.md#대표열과-메뉴-열의-동일-너비--2026-11-11)를 따른다. 중앙열·좌상단형, 상단 헤더, 모바일/다이닝의 구분도 해당 절에서 확인한다. 과거 고정 24~25% 상단행 본문 너비는 현행 사양이 아니다.

## 서로 다른 분류 축

- **서비스**: 베이직·다이닝·디스플레이. 엔진과 데이터/조작 범위가 다르다.
- **디자인 종류**: 기본 디자인(`standard`)과 디자이너 디자인(`designer`). 기본은 중립 스타일, 디자이너는 각 스킨의 서체·색·장식을 보존한다.
- **구조**: 1열 고정형, 상단행 고정형 등의 대표영역/탐색 위치다.
- **상품 표시 형식**: 리스트형(`list`)과 사진 중심 앨범형(`album`). 모든 구조에 앨범형이 자동으로 등록되는 것은 아니다.
- **베이직 배치 모드**: 묶음형(`orderedBalancedFit`)과 채움형(`orderedFit`). 리스트/앨범 또는 기본/디자이너 구분과 같은 축이 아니다. 실제 지원 UI는 등록된 capability를 따른다.

ID·renderer key·서비스·구조·상품 표시 형식을 분리해서 다룬다. 같은 renderer를 사용하는 기본 디자인도 서로 다른 design ID로 선택·구매·저장한다.

## 현재 기본 디자인 등록표

등록 원본은 [DEFAULT_DESIGN_REVIEWS / MENU_LAYOUTS](../lib/menu-design-policy.ts)다. 현재 베이직은 구조 5개에 리스트 5종·앨범 2종, 다이닝은 구조 2개에 리스트 2종·앨범 2종이다. 합계는 기본 디자인 **11종**이다.

| 서비스 | 구조 | 리스트형 design ID | 앨범형 design ID |
| --- | --- | --- | --- |
| 베이직 | 1열 고정형 | `basic-first-column` | `basic-first-column-album` |
| 베이직 | 상단행 고정형 | `basic-top-row` | `basic-top-row-album` |
| 베이직 | 상단행 고정형(왼쪽 로고) | `basic-top-row-left-logo` | 등록 없음 |
| 베이직 | 중앙열 고정형 | `basic-center-column` | 등록 없음 |
| 베이직 | 좌상단 배치형 | `basic-upper-left` | 등록 없음 |
| 다이닝 | 전면 페이지형 | `dining-full-page` | `dining-full-page-album` |
| 다이닝 | 좌측 내비게이션형 | `dining-sidebar` | `dining-sidebar-album` |

베이직 기본 디자인은 `cafe_design_a` renderer를 공유한다. 다이닝 전면형은 `dining_aube_table_a`, 좌측형은 `dining_aube_table_b`를 사용한다. 다이닝 두 기본 구조의 스타터 예시는 같은 중립 메뉴 원본을 사용한다. 목록과 카탈로그는 [catalog-designs](../lib/catalog-designs.ts)에서 구성하며, 은퇴/호환 renderer의 존재는 신규 판매 등록을 뜻하지 않는다.

현재 전체 카탈로그는 기본 11종과 디자이너 10종(Basic 7, Dining 2, Display 1)의 21종이다. 이 수와 표는 등록 변경 시 함께 갱신한다. Display는 Basic/Dining 기본 디자인 구조표에 포함하지 않는다.

## 구조별 레이아웃 경계

| 구조 | PC·태블릿 대표/탐색 영역 | 메뉴와 안내사항 |
| --- | --- | --- |
| 1열 고정형 | 왼쪽 대표열 | 메뉴 영역만 contained scroll, 안내사항은 마지막 실제 콘텐츠 뒤 |
| 상단행 고정형 | 3셀 헤더: 가운데 가게명/로고, 오른쪽에 언어→설명→안내사항 정보 열 | 메뉴는 헤더 아래, 일반형 안내사항은 상단 오른쪽 유지 |
| 상단행 고정형(왼쪽 로고) | 첫 셀에 왼쪽 로고/가게명, 마지막 셀에 언어→설명의 오른쪽 정렬 정보 열 | 안내사항은 헤더가 아니라 마지막 메뉴 콘텐츠 뒤 |
| 중앙열 고정형 | 가운데 대표열, 메뉴 트랙은 좌우 | 메뉴가 공통 스크롤 흐름을 따르며 안내사항은 실제 콘텐츠 뒤 |
| 좌상단 배치형 | 첫 메뉴 패널의 맨 위에 대표영역 | 대표영역도 메뉴와 함께 스크롤, 안내사항은 실제 콘텐츠 뒤 |
| 다이닝 전면 페이지형 | 선택 커버와 본문 페이지, 하단 페이지 탐색 | 페이지/코스 단위 탐색·내부 읽기, 위젯은 완전한 카테고리 사이 |
| 다이닝 좌측 내비게이션형 | PC·태블릿 왼쪽 탐색, 모바일 페이지 탭 | 같은 다이닝 데이터/코스 규칙, 커버 안내는 별도 하단 앵커 |

좌상단 기본형/ONUE의 사진 대표영역은 PC·태블릿 4:3, 모바일 1:1이다. 일반 대표 이미지, 로고, 상품 앨범 이미지, 위젯의 비율을 이 비율과 혼동하지 않는다. [공통 계약](template-spacing-contract.md)의 해당 기기·구조별 최신 절을 따른다.

디자이너 Basic의 등록 구조는 [one-page-layout-shells](../lib/one-page-layout-shells.ts)를 따른다. REAL MATCHA·Loop Bagel은 왼쪽 대표열, Sunday Roasters·Van Gogh는 중앙 가게명의 상단행, MELLOW는 왼쪽 로고 상단행, ROSY ORANGE는 중앙열, ONUE는 첫 패널 상단 배치다. 공통 규칙을 적용하면서 각 스킨의 승인된 장식·색상·비율은 보존한다.

## 리스트형·앨범형과 배치 규칙

리스트형은 상품명·설명·가격을 행으로 읽는 구성이고, 앨범형은 상품 사진과 정보를 카드/그리드로 읽는 구성이다. 앨범형도 같은 원본 메뉴·언어·가격·보기옵션의 지원 범위를 사용하며 독립 메뉴 데이터를 만들지 않는다. 상품 이미지 비율은 기본 1:1이며 4:5·5:4 선택을 지원한다. [menu-appearance](../lib/menu-appearance.ts)가 값과 저장 형식을 소유한다.

Basic 앨범은 카테고리 가격열을 제외하고 일반 가격을 유지한다. Dining 앨범은 일반/직접 메뉴의 사진·가격 표시를 바꾸되, 코스의 이미지 미노출·원자적 묶음·코스 가격 규칙을 유지한다. 앨범 상품 비율을 대표영역/커버 비율에 적용하지 않는다.

현재 Basic PC·태블릿은 공통 contained-reading 정책이다. 넘치는 메뉴를 읽을 수 있게 하며, 빈 공간을 없애려고 폰트를 무제한 확대하거나 임의로 카테고리를 재정렬하지 않는다. 기본 모드는 묶음형이고, 묶음형은 카테고리 제목과 전 상품을 하나의 트랙 단위로 보존한다. 명시적 채움형은 등록 순서를 유지하며 항목이 다음 열로 이어질 수 있다. 이어진 카테고리의 끝에서도 다음 카테고리/위젯 경계를 실제 열별로 판정한다. 현재 원본은 [menu-layout-modes](../lib/menu-layout-modes.ts), [basic-menu-scroll](../lib/basic-menu-scroll.ts)이며, 앨범 그리드에는 리스트용 열 분할을 억지로 적용하지 않는다.

모바일은 별도 자연 스크롤·읽기 토큰이다. PC·태블릿의 열/폰트/fit 수정으로 모바일 값을 바꾸지 않는다. Dining의 페이지 탐색·코스 단위와 Display의 화면 예산은 Basic contained engine에서 분리한다. 상세 숫자는 이 문서에 복제하지 않고 [공통 계약](template-spacing-contract.md)의 최신 절과 실제 토큰을 확인한다.

## 보기옵션의 범위

[보기옵션 계약](template-preview-display-options.md)은 기능 옵션과 디자인 탭, capability별 노출, 스타터 기본 체크, 임시 예시, URL 유지, 초기화와 고객 데이터 미변경을 설명한다. 기기·회전·묶음/채움·주문/호출·새 창은 상단 도구막대, 콘텐츠 노출과 디자인은 보기옵션 패널이 소유한다.

미리보기 기본값은 스타터·기본 디자인 정책에서 읽는다. 기본 OFF와 사용 불가는 다르다. 예를 들어 상단행의 대표영역은 기본 OFF여도 지원 capability가 있으면 체크해 사용할 수 있다. 실제 저장 메뉴의 디자인 설정과 같은 설정 형식/렌더러를 사용하되, 카탈로그의 임시 선택은 고객 메뉴나 신규 구매 기본값을 저장하지 않는다.

## 디자인 시스템은 별도 문서·코드

[사이트 디자인 시스템](site-design-system.md)은 아티메뉴 공식 사이트·마이페이지·편집기·미리보기 도구 UI의 버튼, 탭, 입력, 표면, 간격, 글자 역할을 다룬다. 실제 CSS는 [ui-system.css](../styles/ui-system.css), [site-design.css](../styles/site-design.css), [site-spacing.css](../styles/site-spacing.css), [typography.css](../styles/typography.css)에 있고 공유 컴포넌트와 연결된다.

고객이 보는 **메뉴판 자체**는 [템플릿 공통 계약](template-spacing-contract.md), [템플릿 서체 preset](../lib/template-typography-presets.ts), [메뉴 색상 역할](../lib/menu-text-colors.ts), [메뉴 모양 설정](../lib/menu-appearance.ts)과 각 renderer/skin이 담당한다. 사이트 UI의 글자/간격/아이콘 규칙을 메뉴판에 그대로 덮어쓰지 않는다. Basic/Dining도 지원 기능과 색상 역할이 달라 각각의 최신 적용 범위를 확인한다.

## 과거 기록과 현행 규칙의 구분

다음은 당시 단계와 검수 결과를 보존하는 이력이다. 문서 이름에 기본 디자인/engine이 있어도 그대로 신규 템플릿의 현행 설계서로 복사하지 않는다.

- [기본 디자인 rollout](default-design-rollout.md), [구조 검수](default-design-structure-qa.md), [6종 완료 검수](default-design-completion-qa.md): 당시 4개 Basic 구조/6개 기본 디자인, 미판매 검토 단계, 예전 이미지 비율 등이 포함된다.
- [기본 배치 보완](default-layout-refinement-qa.md): 과거 4:5·4:6 비율 및 당시 크기 조정 기록. 현재 대표영역 규칙은 공통 계약의 후속 승인 절이 우선한다.
- [Basic 초기 엔진 기록](basic-template-engine-rules.md): 보존된 canvas-fit, 축소/채우기 탐색과 과거 bottom 위젯 규칙. 현재 active contained reading·자유 위젯 흐름의 근거로 쓰지 않는다.
- [보기옵션 최초 검수](template-preview-display-options.md): 현행 요약 아래에 2026-10-20 당시 검수 개수/동작 기록을 보존한다.
- [다이닝 제품 계약](aube-table-multi-page-template-contract.md): 초기 상태/가격/서비스 제한은 당시 기록이며 최신 카탈로그/서비스 정책과 공통 계약이 우선한다.
- [Brew Chapter 계약](multi-page-template-product-contract.md): 은퇴 renderer의 호환 기록이며 신규 Dining 설계가 아니다.

## 신규/수정 템플릿의 문서 완료 기준

등록표·capability·미리보기/구매 원본·기기별 레이아웃·리스트/앨범 지원·색상 역할·대표/상품/위젯 이미지 비율·보기옵션 기본값/사용 가능 여부를 함께 확인한다. 규칙을 변경하면 해당 공통 계약과 관련 검증을 갱신하고, 디자인별 예외는 적용 서비스/구조/기기를 명시한다. 이번 문서 대조는 이 분류와 탐색 경로를 보완한 것이며, 모든 역사 문서의 문장을 현행 사양으로 재작성하거나 모든 사용자 설정 조합을 새로 실행한 검수는 아니다.

로고 크기와 상단 정보 열의 현행 기준은 [공통 계약의 Basic identity and top-row information](template-spacing-contract.md#basic-identity-and-top-row-information--2026-11-11-current)을 따른다. 로고는 전용 칸을 기준으로 기기별 두 축 한도를 적용하고, 설명은 정보 열 가용 폭 전체를 사용한다.
