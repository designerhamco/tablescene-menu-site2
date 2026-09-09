# 메종 마레 Production QA

검증일: 2026-09-10 KST  
템플릿: `dining_aube_table_b` (`메종 마레`)  
상태: `coming_soon` 유지

## 범위와 안전 기준

- 사용자 제공 Owner QA 계정만 사용했다.
- 결제, 주문, 구독을 만들지 않았다.
- `business_basic_multi_monthly`와 같은 기능 경계를 갖는 14일짜리 QA entitlement만 생성했다.
- 실제 판매 목록과 템플릿 교체 후보에는 메종 마레를 노출하지 않았다.
- 오브 테이블 전용 Smart Call Production allowlist는 넓히지 않았다.

## QA 데이터

- 메뉴판 ID: `c6d3d83c-13c4-4a65-8551-064ffeb93176`
- slug: `maison-marais-qa`
- entitlement ID: `d33dd4af-992f-43b9-8646-5b0a2beada31`
- 접근 종료: 2026-09-23 KST 운영일 기준
- 스타터 생성 결과: 메뉴 페이지 3개, 코스 7개, 메뉴 아이템 20개

반복 가능한 생성 스크립트는 `scripts/seed-aube-smart-call-qa.ts`의 `--template-key dining_aube_table_b` 옵션을 사용한다. 적용 전 dry-run에서 사용자 UUID, slug, 기존 행 유무를 반드시 확인하며 동일 slug가 있으면 중단한다.

## 실제 확인 결과

1. 공개 `/menu/maison-marais-qa`에서 커버와 `Chef's Tasting`, `Seasonal Plates`, `Wine & Pairing` 세 페이지가 표시됐다.
2. PC·태블릿은 좌측 전체 폭 행 메뉴와 우측 콘텐츠 구조를, 모바일은 헤더 아래 가로 페이지 탭을 사용했다.
3. MY/메뉴판 편집기에서 커버·메뉴판 구성·디자인·다국어·공개 설정 탭이 열렸다.
4. 기기 미리보기에서 PC 1440×900, 태블릿 가로 1180×820, 모바일 390×844 프레임을 전환했고 모두 실제 메종 마레 renderer를 사용했다.
5. 디자인 탭에서 Noto Serif KR·Cormorant Garamond 기본값과 가게명·페이지/코스명·나머지 글자 역할 설정을 확인했다.
6. 다국어 탭은 한국어를 기본으로 두고 영어·중국어·일본어를 선택적으로 활성화하는 구조였다. 번역이 없는 현재 공개 화면에서는 KR만 비활성 언어 버튼으로 표시됐다.
7. `Seasonal Plates` 설명 끝에 QA 문구를 편집기에서 저장한 뒤 공개 화면 반영을 확인했고, 같은 편집 흐름으로 원문을 복원해 공개 화면에서 QA 문구가 사라진 것을 확인했다.

## QA에서 발견하고 수정한 오류

- PR #129: 멀티페이지 Dining 상품이 단일 페이지 편집 권한으로 분류되어 메뉴 페이지 탭이 숨겨지던 문제를 수정했다.
- PR #130: 화면에서는 페이지를 수정할 수 있지만 서버 최종 저장이 동일한 단일 페이지 판정으로 거부되던 문제를 수정했다.
- 두 수정 모두 단일 페이지 Dining의 페이지 관리 차단과 Display 전용 페이지 설정을 그대로 유지한다.

## 현재 운영 상태

- QA 메뉴판은 14일 동안 Owner 계정에서 재확인할 수 있도록 유지한다.
- entitlement 만료 후에는 기존 lifecycle·retention 정책을 따른다.
- 판매 공개, 템플릿 교체 후보 등록, Smart Call allowlist 확대는 이번 QA 범위에 포함하지 않았다.
