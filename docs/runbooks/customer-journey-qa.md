# 전체 고객 동선 검수 — 2026-10-22

## 현재 완료 상태

기존 QA 두 메뉴판의 첫 실제 방문 2개·주문 4건·호출 2건 검수 후, 별도 승인된 수동 결제완료 검수도 방문 2개·주문 2건으로 완료했다. 앞선 주문 4건은 cancelled/unpaid, 추가 주문 2건은 served/manual_paid, 호출 2건은 completed다. 두 차례 임시 권한은 모두 회수했다. 기존 메뉴/테이블/QR·이력·계약·디자인은 유지한다. 호출 상태 갱신 수정도 PR #303으로 운영 배포·실제 모바일 확인을 마쳤다. 실제 카드 청구/환불과 실제 휴대폰 메일 앱 확인은 별도 사람 참여 항목으로 남는다.

## 앞선 읽기·격리 DB 검수 결과

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
- 현재 Chrome 로그인 계정에서 이 두 QA 메뉴판을 관리할 권한은 확인되지 않았다. 이후 승인된 최소 임시 권한으로 실제 검수를 완료하고 해당 권한을 회수했다(아래 결과).

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

## 승인된 실제 QA 이력 생성 검수 계획

2026-10-22 KST 사용자가 “QA 계정 로그인 후 진행”으로 아래 실행 범위를 승인했다. 현재 기존 QA 메뉴판 두 개만 사용하며 실제 영업 매장으로 운영 대상을 확대하지 않는다. 최초에는 QA 소유 계정 로그인 인계를 준비했다. 이후 사용자가 현재 계정의 한시적 검수 권한 연결을 별도로 승인하여 아래 실제 실행 결과로 완료했다.

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


## 실제 검수 중 발견한 호출 상태 갱신 보완 — 2026-10-22

직원 호출의 접수 확인/완료는 저장되고 직원 화면에 표시됐지만, 고객 호출창에는 최초 POST 응답만 남아 있었다. 같은 방문에서 전송한 호출 ID를 5초 간격으로 조회해 확인/완료/취소를 반영한다. 확인 이후 고객 취소 버튼은 제거하고 완료 후 다른 요청을 선택할 수 있다. 재호출 2분 제한은 기존 서버 규칙을 유지한다.

조회는 기존 서명된 테이블 방문 인증과 운영 대상·이용권·호출 ON 검사를 사용한다. 호출 ID·메뉴판·테이블·방문 ID를 모두 대조하고 응답에는 호출 ID/상태만 포함한다. 직원 식별자/다른 방문 내용은 반환하지 않는다. no-store/Vary: Cookie, 닫힘/숨김/미리보기 통신 중지, 재활성화 갱신, 응답 순서 보호·오류 backoff를 적용한다. DB 스키마/RLS/권한/운영 대상은 변경하지 않는다.

- 실제 서비스/API + 격리 PostgreSQL: 31건. 상태 4종, 매장/테이블/방문 격리, 없는 호출·만료 세션·잘못된 ID·운영 OFF·이용권/공개 차단·backend 상세 비노출.
- 기존 호출/테이블 DB 회귀 44건, 전체 단위 744건, 타입·변경 파일 린트·최적화 빌드 통과.
- 실제 컴포넌트 격리 화면: 기본/다이닝 처리 완료 반영, 다이닝 영어 확인 상태·고객 취소 제거, 닫힘 후 GET 횟수 유지, 만료 세션의 조작 제거를 확인했다. 실제 모바일 DOM 390×844, 가로 넘침 0. 최종 운영 확인은 아래 실행 기록에 별도로 남긴다.


## 실제 운영 QA와 임시 권한 회수 완료 — 2026-10-22 KST

### 승인과 접근 범위

사용자는 기존 QA 메뉴판 두 개의 방문 2개·주문 4건·호출 2건 실행을 승인했고, QA 소유 계정 로그인 대신 현재 네이버 계정에 임시 검수 권한을 연결하도록 별도로 승인했다. 새 계정/자격증명/소유권/운영 대상은 만들거나 바꾸지 않았다.

부여 전 정확한 현재 계정 1개·이메일 확인 여부와 기존 두 QA 메뉴판의 이름/slug/소유자/QA 표시/활성 상태, 기존 회원 권한 부재를 대조했다. viewer 기본에 order.read/order.manage/order.cancel_unpaid/call.manage만 허용했다. 실제 권한 계산·운영 진입 15건과 원자적 부여/회수·불일치 차단·중복 방지·회수 재시도 격리 DB 18건을 통과했다. 운영에는 회원 권한 2개와 부여 감사 기록 2개만 추가했다. 결제·구독·메뉴/디자인 편집·공개·직원 관리·테이블/QR 편집은 허용하지 않았다.

Supabase 전체 사용자 목록 화면은 자동 승인 검토가 광범위한 계정 정보 노출 가능성을 이유로 거절했다. 그 화면을 사용하지 않고 이미 로그인된 CLI로 승인된 이메일 한 개만 조회하여 대상 계정을 확인했다. 비밀값/계정 UUID는 저장소와 브라우저에 전달하지 않았다.

### 실제 손님/직원 결과

| QA 메뉴판 | 현재 방문 신규 주문 | 검수 결과 | 신규 호출 |
| --- | --- | --- | --- |
| QA 베이직 페이지형 주문 | #5 / #6, 리얼 맛차 크림 라떼 ICE 각 1개·5,800원 | #5 접수/미결제 고객 취소, #6 조리 준비→조리 중→서빙 준비 고객 취소 제한 확인 후 직원 사유 취소 | #4 직원 호출, 확인→완료 |
| QA 오브 테이블 스마트호출 | #7 / #8, Aube signature 코스 각 1개·185,000원 | #7 접수/미결제 고객 취소, #8 조리 준비→조리 중→서빙 준비 고객 취소 제한 확인 후 직원 사유 취소 | #5 와인 문의, 확인→완료 |

기존 QR로 메뉴판당 방문 1개만 만들었다. 메뉴 URL 새로고침은 기존 방문을 유지했으며 QR을 재방문하거나 재발급하지 않았다. 고객 내역에는 현재 방문의 주문 2개만 표시됐고 이전 주문은 섞이지 않았다. 시각·수량·옵션·금액·테이블·결제 전 상태, 빈 장바구니에서 내역 보기, 직원 변경의 자동 반영을 확인했다. 실제 고객 DOM은 390×844, 가로 넘침 0이었다.

계획의 요청 메모는 현재 실제 장바구니에 입력란이 없어 남기지 않았다. 대신 생성 전후 ID 대조와 고유 주문 번호/ID로 정확한 네 건을 추적했다. 주문 UI나 제출 API를 우회해 메모를 주입하지 않았다. 직원 취소 두 건에는 승인된 사유 `QA 동선 검수 종료`, 고객 취소 두 건에는 `고객 요청`이 기록됐다.

종료 검증: 새 주문 4건은 cancelled/unpaid·수량 1, 결제완료 시각과 served 시각은 모두 null이다. 직원 취소 두 건에는 accepted/cooking/ready 시각이 있고 고객 취소 두 건에는 accepted 시각이 없다. 호출 2건은 acknowledged/completed 시각을 가진 completed다. 각 새 방문에 주문 2건·호출 1건이 연결됐다. 이력은 삭제하지 않았다.

### 호출 수정의 실제 배포 확인

[PR #303](https://github.com/designerhamco/tablescene-menu-site2/pull/303) 병합 `de005200fd51f58b48d14ba3a44aa557b261cdc2`. [Production 배포](https://vercel.com/designerhamcos-projects/tablescene-menu-site2/J14K2nnwe1pWirrio7xLFbSLqGJ5) Ready, 1분 19초, 운영 도메인과 같은 소스를 확인했다. 배포 후 기존 다이닝 방문에서 마지막 호출을 전송해 고객 화면의 직원 확인→처리 완료 표시와 확인 후 취소 제거를 실제 검증했다. 다른 요청 선택은 추가 전송하지 않았다.

### 보존과 회수

검수 전후 menu_sites 2행, 기존 주문 4행, menu_tables 2행, 기존 방문 16행, menu_items 38행, menu_categories 11행, menu_pages 4행의 전체 행 지문이 동일했다. 기존 호출 0건도 보존됐다. 총 8개 표 77개 기존 행이며, 추가는 승인된 주문 4·호출 2·방문 2뿐이다. 원래 소유권·설정·QR·고객 데이터·기존 계약·청구 실행 설정은 유지했다.

검수 종료 후 이번에 만든 두 회원 권한만 revoked로 회수하고 행과 감사 이력을 보존했다. 활성 임시 권한 0개·부여 감사 2개·회수 감사 2개를 확인했다. 같은 로그인 세션에서 다이닝 호출관리와 베이직 주문관리 직접 진입이 모두 404로 차단됐다. 재로그인이나 비밀번호 변경은 필요하지 않다.

비공개 로컬 증빙: `/private/tmp/qa-execution-before.json`, `qa-execution-after.json`, `qa-execution-final-validation.json`, `qa-access-grant-result.json`, `qa-access-revoke-result.json`, `qa-temporary-access-proposal.json`(REVOKED). 화면: `qa-basic-final-history.jpg`, `qa-dining-ready-history.jpg`, `qa-dining-final-history.jpg`, `qa-dining-live-call-acknowledged.jpg`, `qa-dining-live-call-completed.jpg`, `qa-temporary-access-revoked.jpg`, `qa-call-status-production-ready.jpg`. 계정/방문 토큰/비밀값은 커밋하지 않는다.

### 별도 남은 운영 확인

위 첫 검수에서 제외했던 수동 결제완료는 아래 별도 승인/실행으로 완료했다. 실카드 등록·실제 청구/취소/부분취소/환불과 실제 휴대폰 메일 앱 확인은 별도 사람 참여가 필요한 범위다. 수동 결제 표시 성공을 실결제 검증 완료로 해석하지 않는다. 승인되지 않은 매장/권한/자동 청구 범위를 확대하지 않는다.


## 외부 수동 결제완료 실제 QA 완료 — 2026-10-22 KST

### 승인·최소 권한

사용자는 검수 계획의 기존 베이직/다이닝 QA 메뉴판에서 방문 2개·주문 2건을 만들고 외부 결제완료를 확인한 뒤 권한을 회수하는 범위를 승인했다. 실제 카드 청구나 현금 수납을 실행하는 계획은 아니다. 다른 매장·새 호출·구독·운영 대상·소유권·메뉴/QR은 변경하지 않는다.

사전 검수 33건에서 실제 권한 계산과 원자적 부여/회수, 만료/소유자/이전 권한 불일치 차단, 반복 부여 차단·회수 재시도를 확인했다. 기존 회수된 두 회원 행을 재사용해 viewer 기본에 order.read/order.manage/order.cancel_unpaid/payment.manual만 한시 허용했다. 호출·테이블/QR·메뉴 편집·직원·공개·청구 권한은 허용하지 않았다.

### 실제 고객·직원 결과

| QA 메뉴판 | 신규 주문 | 외부 결제 표시 | 최종 상태 |
| --- | --- | --- | --- |
| QA 베이직 페이지형 주문 | #9 리얼 맛차 크림 라떼 ICE, 수량 1·5,800원 | 기존 카드 단말기(manual_card) | served/manual_paid |
| QA 오브 테이블 스마트호출 | #10 Aube signature 코스, 수량 1·185,000원 | 현금(manual_cash) | served/manual_paid |

각각 기존 테이블 QR로 방문 1개·주문 1건만 만들었다. 베이직 QR 이동은 최초 화면 대기 시간이 초과됐지만 실제 메뉴 전환과 방문 생성이 확인돼 QR을 재실행하지 않았다. 최종 추가 건수도 방문 2·주문 2·호출 0이다.

직원이 주문 접수 상태에서 결제완료를 기록하자 고객 화면이 결제 완료로 갱신되고 취소 버튼이 사라졌다. ‘결제된 주문의 취소는 직원에게 문의해 주세요’ 안내를 확인한 뒤 조리 준비→조리 중→서빙 준비→서빙 완료로 진행했다. 두 주문 모두 고객 화면에 서빙 완료/결제 완료가 표시됐다. 실제 모바일 DOM 390×844, 가로 넘침 0과 현재 방문 주문만 표시됨을 확인했다.

이 실행은 외부에서 받은 결제의 표시 경로를 검증한다. 실제 단말기 승인·현금 수납·PG 결제/환불은 실행하지 않았으며 해당 기능을 검수 완료로 처리하지 않는다.

### 보존·회수 증거

검수 전 존재하던 8개 표 85행의 전체 행 지문을 보존했다. 추가는 승인된 방문 2·주문 2뿐이며 호출 추가는 0이다. 메뉴·분류·페이지·테이블·QR·소유권·기존 주문/호출·계약/청구 설정을 유지했다. 새 주문은 수량 1·해당 결제 방법·served/manual_paid와 상태 시각을 확인했다.

임시 회원 행 두 개는 다시 revoked로 회수하고 이전 permission_overrides도 복원했다. 이번 부여 감사 2건·회수 감사 2건, 활성 임시 권한 0을 확인했다. 같은 로그인 세션의 베이직/다이닝 주문관리 재진입이 모두 404로 차단됐다. 검수 이력과 감사는 삭제하지 않았다. 새 DB 스키마/제품 코드 변경은 없다.

비공개 로컬 증빙: `/private/tmp/qa-manual-payment-before.json`, `qa-manual-payment-after.json`, `qa-manual-payment-final-validation.json`, `qa-manual-payment-grant-result.json`, `qa-manual-payment-revoke-result.json`, `qa-manual-payment-proposal.json`(REVOKED). 화면: `qa-manual-basic-paid-before-cooking.jpg`, `qa-manual-basic-served-paid.jpg`, `qa-manual-dining-paid-before-cooking.jpg`, `qa-manual-dining-served-paid.jpg`, `qa-manual-access-revoked.jpg`. 계정/방문 토큰/권한 SQL의 운영 식별자는 커밋하지 않는다.

### 후속 직접 입력 단계

로그인된 기본 베이직 신청 화면을 준비했다. 관찰 당시 최종 월 4,900원과 사업자 인증 후 진행 상태이며, 사업자/카드 입력·약관 동의·결제 제출·새 구독 생성은 하지 않았다. 실카드 결제와 환불은 사용자가 직접 참여하는 별도 단계다. 현재 미결제 신청 화면 준비를 카드 검수 완료로 해석하지 않는다.

가입/재설정 저장소 HTML에는 긴 가짜 링크를, 2026-09-01 기존 가입 수신본에는 인증 URL을 제거한 대체 링크를 사용해 로컬 브라우저에서 확인했다. 3종×320/390/430px 9조합 모두 가로 넘침 0이다. 새 메일 전송·실제 인증/재설정 링크 실행은 없고 임시 서버는 종료했다. 실제 휴대폰 메일 앱이 연결돼 있지 않아 앱별 최종 확인은 남는다. 증빙: `/private/tmp/qa-email-mobile-browser-preflight.json`, `qa-email-received-430.jpg`. 상세 메일 절차는 `docs/runbooks/supabase-auth-email-templates.md`.


## 사용자 직접 결제창·신규 메뉴판 검수 — 2026-10-22 KST

사용자가 직접 사업자 확인과 카드 입력/인증을 완료한 뒤 메뉴판 생성 성공을 알렸다. 해당 성공 화면에서 확인한 신규 메뉴판 한 건에 한해 고객 화면과 운영 기록을 읽기 대조했다. 계정·메뉴판·거래 식별자와 고객 문구는 비공개 로컬 증빙에만 남긴다.

- 메뉴판 생성 성공, 작성중(draft)/미공개, 소유자 편집 화면과 태블릿 미리보기의 실제 상품/가격 렌더링 확인. 저장·템플릿 교체·공개는 실행하지 않았다.
- business_basic_single_monthly, 월 4,900 KRW, active 구독, standard 이용권 범위, initial_design_id basic-first-column, 계약 버전 2026-10-21 확인.
- 같은 소유자/메뉴판의 구독 1·주문 1·결제 1·이용권 1이며 주문/결제 paid, 이용권 active다. 금액은 모두 4,900원, 이용권의 구독 연결도 일치한다. 다음 결제일/이용 기간 종료는 2026-11-22다.
- 사업자 검증은 verified다. 사업자 정보 원문과 카드/빌링키는 결과 문서나 로그에 출력하지 않았다.
- 해당 결제 한 건만 결제사 GET으로 대조했다. PAID, 총액/승인 4,900원, 취소 금액 0, KCP_V2, 채널 타입 TEST다. 앱 mock 응답이 아닌 결제사 테스트 채널 응답이다. LIVE 채널 청구/취소/환불 검수와 구분한다. 참고: [PortOne V2 채널 타입](https://developers.portone.io/api/rest-v2/payment)은 LIVE/TEST를 구분한다.

결제사 승인 시각 2026-10-22T05:03:39Z는 한국시간 14:03:39다. 앱 결제 생성 기록도 같은 14:03분대지만 마이페이지 결제내역은 오전 05:03으로 표시됐다. 서버 페이지의 Intl 날짜/시각 포맷 두 곳이 시간대를 생략해 발생했다. 둘 다 Asia/Seoul을 명시해 본문 결제일·결제 상세·구독/갱신·보관 날짜를 서버 지역과 무관하게 표시한다. 결제 원본 시각·갱신 시각·금액·계약·실행 설정은 변경하지 않는다. 단위 744건·타입·변경 파일 린트·최적화 빌드를 통과했다.

검수 중 운영 DB 쓰기·새 청구·취소·환불·임시 권한 부여는 0회다. 사용자가 만든 메뉴판과 계약을 그대로 유지한다. TEST→LIVE 채널 전환과 자동 청구 실행 확대는 이번 범위에 포함하지 않는다. 실제 휴대폰 메일 앱 확인도 잔여 항목으로 유지한다.

비공개 로컬 증빙: `/private/tmp/paid-menu-verification-20261022.json`, `paid-menu-provider-verification-20261022.json`, `paid-menu-read-target.json`, `paid-menu-history-before-kst-fix.jpg`, `paid-menu-unit.log`, `paid-menu-build.log`. 원문 고객/거래 식별자·카드/빌링키는 커밋하지 않는다.
