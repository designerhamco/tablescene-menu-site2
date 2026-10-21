# 전체 고객 동선 검수 — 2026-10-22

## 현재 결과

PR #299의 운영 기능과 문서 PR #300을 기준으로 공개·로그인 읽기 검수와 임시 DB 통합 검수를 수행했다. 아래 항목은 모두 통과했다. 실제 운영 주문·호출·방문·결제·구독 쓰기는 실행하지 않았다. 이번 단계는 검수 도구와 공개 조회 오류 수정을 포함하며 메뉴 렌더러·디자인·모바일 규칙은 변경하지 않는다.

| 구간 | 검수 방식 | 결과 |
| --- | --- | --- |
| 공개 신청·요금·상품·도움말·인증·약관 | 실제 Production 13경로 × 1440/390px. HTTP·가로 넘침·깨진 이미지·브라우저 오류·axe critical/serious 검사 | 26개 화면 통과 |
| 카탈로그 → 분류/가격 → 상세 → 신청/로그인 | 실제 Production 320/390/430/820/1024/1440px. 기본/디자인 포함·앨범·다이닝·Display 준비 중·상세 링크·키보드·사진·넘침 | 6개 화면 폭 통과. 좋아요 저장 왕복만 모의 API로 격리 |
| 로그인 후 실제 신청 요약 | 기본 베이직 4,900원/디자인 포함 6,800원, 기본 다이닝 6,900원/디자인 포함 8,800원. 실제 DOM 1440×900와 390×844 | 8조합의 선택 디자인·이용권·가격 일치, 가로 넘침 0. 결제/사업자 인증/약관 제출 없음 |
| 신규 디자인 초기화 → 편집 JSON → 같은 서비스 디자인 교체/복귀 | 실제 서버 서비스/API와 승인된 디자인 계약 DB guard를 최소 임시 PostgreSQL/WASM 스키마에 연결 | 91건. 고객 이름/설명·주소·메뉴/사진·위젯/광고/언어/주문 설정·배경/정렬·QR·계약/금액·주문/결제 보존, 재시도·권한·편집 충돌 차단 |
| 다음 결제일부터 이용권 전환 | 실제 서버 서비스 + 임시 DB + 모의 결제사 | 33건. 즉시 계약 변경 없음, 동의/적용일/가격 검증, 편집 충돌·저장 실패 재시도에서 모의 과금 1회. 실결제 0 |
| 테이블·QR·호출 | 실제 호출 서비스 + 임시 DB/승인 migration | 44건. 서비스별 5개/저장 항목 보존·단일 요청·상태·cooldown·QR 교체/세션 폐기·권한 |
| 제출 → 방문별 주문내역 → 직원 상태/수동 결제 → 고객 취소 | 실제 서버/API + 임시 DB/승인 migration | 79건. 가격/옵션 불변 스냅샷·접수 전 미결제 취소·동시 처리·다른 방문/테이블/매장·세션 폐기 차단 |
| 전체 도메인 계약 회귀 | npm test | 744건 통과 |

추가 읽기 검수: 현재 로그인 계정의 마이페이지·결제내역·운영 화면을 확인했다. 이용 중 메뉴는 Display 6개이며, 운영 선택 화면에는 사용 가능한 메뉴판이 없다고 안내한다. 기존 주문 QA 메뉴판의 주문관리 직접 접근도 404로 차단됐다. 이 계정에서 QA 소유자 권한을 우회하지 않았다. 로그인 화면은 읽기 관찰과 실제 DOM 크기만 확인했으며, 미설정 전용 QA 자격증명의 자동 인증 회귀 전체 실행으로 주장하지 않는다.

## 운영 연결 상태의 읽기 감사

Vercel의 Production Config 화면에서 기존 값만 확인했다. 감사 당시 환경변수/권한/대상 목록 변경은 없으며 이후 공개 조회 수정만 배포했다.

- POSTPAY_ORDER_ENABLED, ORDER_DASHBOARD_ENABLED, CALL_ENABLED, TABLE_MANAGEMENT_ENABLED: 모두 true.
- 주문/주문관리 대상 2개, 호출/테이블 대상 3개. 대상 UUID는 결과 문서에 공개하지 않는다.
- 기존 실제 접근 판정 서비스로 메뉴·이용권·공개·점주 ON·활성 테이블을 대조했다. 주문/호출 가능한 QA 메뉴판은 각각 2개이며, 나머지 오래된 호출 대상 1개는 이용권 비활성으로 정상 차단된다.
- 현재 대상의 공개 이름: `QA 베이직 페이지형 주문` (`basic-paged-order-qa-20261018`), `QA 오브 테이블 스마트호출` (`dining-course-order-qa-20261018`). 둘 다 공개·활성 사업자 이용권·활성 테이블 1개·호출/주문 설정 ON이다.
- 현재 Chrome 로그인 계정에서 이 두 QA 메뉴판을 관리할 권한은 확인되지 않았다. 기존 QA 소유 계정 로그인이 실제 관리 화면 검수의 선행 조건이다.

운영 실행 가능 상태와 실제 주문 전송 성공 검증은 구분한다. 이번 읽기 감사로 실제 손님/직원 E2E를 완료했다고 주장하지 않는다.

## 재실행

- `PUBLIC_SURFACE_QA_BASE_URL=https://tablescene-menu-site2.vercel.app PUBLIC_SURFACE_QA_ROUTE='/,/apply,/services/dining,/services/display,/pricing,/products/dining-single-monthly,/products/dining-multi-monthly,/faq,/terms,/privacy,/sign-in,/sign-up,/forgot-password' npm run qa:public-surfaces`
- `CATALOG_QA_BASE_URL=https://tablescene-menu-site2.vercel.app node scripts/qa-catalog-design-access.mjs`
- `node scripts/qa-customer-design-journey.mjs`
- `node scripts/qa-menu-plan-change-db.mjs`
- `node scripts/qa-call-table-operations-db.mjs`
- `node --import tsx scripts/qa-visit-order-history-db.mjs`
- `npm test`

임시 DB 도구는 기존 검수와 같이 독립 설치한 PGlite를 사용한다. 다른 환경에서는 `PGLITE_TEST_MODULE`에 실제 설치 모듈의 절대 경로를 지정한다. QA 자격증명·세션·카드 키·운영 UUID를 결과 출력이나 저장소에 넣지 않는다.

로컬 증빙은 `/private/tmp/journey-public-surfaces.log`, `journey-catalog/results.json`, `journey-checkout-live.json`, `journey-design-db.log`, `journey-plan-db.log`, `journey-call-db.log`, `journey-order-db.log`, `journey-unit.log`, `journey-runtime-eligibility.json`에 보관한다. 개인 계정 정보와 비밀값은 결과에 포함하지 않는다.

## 다음 단계: 실제 QA 이력 생성 검수 계획

2026-10-22 KST 사용자가 “QA 계정 로그인 후 진행”으로 아래 실행 범위를 승인했다. 현재 기존 QA 메뉴판 두 개만 사용하며 실제 영업 매장으로 운영 대상을 확대하지 않는다. 추가 승인을 재요청하지 않고 해당 QA 소유 계정 로그인 완료 후 실행한다. 현재 로그인 계정은 QA 관리 권한이 없어 로그인 인계를 준비한다. 아직 운영 이력은 생성하지 않았다.

1. 기존 활성 테이블 QR로 메뉴판당 방문 1개를 만든다(총 2개). 테이블·공개 QR 식별자·이름·설정을 변경하지 않는다.
2. 메뉴판당 수량 1의 테스트 주문을 2건 만든다(총 4건). 요청 메모에 `QA 동선 검수 2026-10-22`를 명시한다. 1건은 received/unpaid 상태에서 손님이 취소한다. 1건은 직원이 accepted → cooking → ready로 옮기고 손님 취소 차단을 확인한 뒤 직원 취소 사유 `QA 동선 검수 종료`로 미결제 취소한다.
3. 메뉴판당 호출 1건을 만들고(총 2건) 직원 확인 → 완료와 손님 화면 갱신을 확인한다. 필요 시 cooldown을 기다리며 추가 호출을 생성하지 않는다.
4. 종료 시 테스트 주문 4건이 cancelled/unpaid, 호출 2건이 completed인지 확인한다. 주문/호출/방문 이력은 보존하며 삭제하지 않는다. 기존 이력·다른 방문·설정·QR은 건드리지 않는다.

이 계획은 신규 주문 4건·호출 2건·방문 2개의 운영 이력을 남긴다. 실카드 승인/환불·수동 결제완료 처리·구독 상태 변경은 포함하지 않는다. served/실제 결제완료까지의 운영 검증은 이번 계획의 범위가 아니며, 현재는 위 임시 DB 검증 근거를 사용한다. 로그인 권한을 우회하거나 관리자의 인증 정보를 만들어 실행하지 않는다.

실카드 등록·청구·환불·새 가입 메일·실제 모바일 메일 클라이언트 최종 확인은 별도 운영 단계로 남긴다.

## 발견한 공개 조회 오류와 수정

로그아웃 방문자에게는 정상인 공개 QA 메뉴가 다른 매장 소유 계정으로 로그인한 Chrome에서는 not-found 화면으로 표시됐다. HTTP는 streaming 때문에 200이어서 상태 코드만으로 잡히지 않았다. 공개 화면의 메뉴 루트와 실제 상품 내용도 함께 확인해야 한다.

공개 조회가 쿠키 기반 관리 클라이언트를 재사용하면서 계정별 읽기 권한이 섞였다. 공개 로더는 이제 저장 세션과 쿠키가 없는 anon-key 클라이언트를 만들고, 후속 상품/분류/언어 조회도 같은 클라이언트로 읽는다. published 필터와 이용권 검사는 유지한다. DB/RLS/권한은 바꾸지 않으며 소유자/직원 미리보기, 테이블 방문 인증, 주문/호출 API 권한도 유지한다.

- `node scripts/qa-public-menu-read-scope.mjs`: 실제 클라이언트/로더 회귀 19건 통과. anon 키만 전송, 쿠키/저장 세션 없음, 방문 계정과 무관한 공개 내용, draft/expired/missing/hidden 차단, draft 소유자 미리보기 보존.
- Production 무로그인 공개 메뉴 2종은 정상이고 수정 전 로그인 방문은 실패했다. 공개 키와 서버 키의 페이지/카테고리/상품 건수는 같아서 내용 손실과 구분했다.
- 로컬 수정 화면의 베이직 상품 18개와 1440x900 실제 DOM, 가로 넘침 0을 확인했다.
- 수정 후 단위 744건, 타입, 변경 파일 린트, 최적화 빌드 통과. PR #301 병합과 운영 배포를 완료했고 같은 로그인 세션의 사후 검수를 통과했다.

이번 수정은 공개 데이터 읽기 경로에만 적용한다. 메뉴 렌더러, 디자인과 모바일 규칙은 바꾸지 않는다.


## 공개 조회 수정 Production 결과 — 2026-10-22 KST

- PR #301 병합 `7fb329c5250ed2ea45b0e249406580bb8c37e7a1`. [운영 배포](https://vercel.com/designerhamcos-projects/tablescene-menu-site2/G2iYBYBMUhhTK5yJ3SXDfViKyyPA) Ready, 1분 11초, 같은 소스와 `tablescene-menu-site2.vercel.app` 연결을 확인했다.
- 수정 전에 실패한 Chrome 로그인 세션을 그대로 유지해 공개 베이직 18상품과 다이닝 Drink 페이지 8상품/가격을 확인했다. 실제 DOM은 1512×762, 두 화면 모두 가로 넘침 0, not-found 0이다. 이어서 운영 페이지에서 기존 로그인 유지와 QA 관리 권한 미부여도 확인했다.
- 익명 공개 메뉴 2종의 실제 서버 제목/200과 만료 메뉴 차단, 없는 메뉴 404를 확인했다. 방문 쿠키 없는 주문내역 GET·취소 PATCH는 401, 외부 Origin PATCH는 403이며 API 응답의 no-store/Vary: Cookie와 내역 비노출을 확인했다. 이 검사는 실제 주문·취소를 실행하지 않는다.
- 증빙: `/private/tmp/journey-production-ready.jpg`, `journey-production-signed-in-basic.jpg`, `journey-production-signed-in-dining.jpg`, `journey-production-smoke.json`.
- 실제 이력 검수는 사용자 승인 완료 상태다. Chrome의 아티메뉴 `/sign-in?next=/mypage/operations` 화면을 QA 소유 계정 로그인용으로 인계했다. 자격증명/권한을 우회하지 않으며 승인된 방문 2개·주문 4건·호출 2건은 로그인 완료 전 생성하지 않는다.
