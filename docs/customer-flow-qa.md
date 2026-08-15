# MenuLink 전체 고객 흐름 QA

최종 갱신: 2026-08-15

## 목적

출시 전 전체 고객 흐름을 코드·route·계약 테스트로 다시 연결해 확인하고, 실제 계정·결제·Production write가 없으면 검증할 수 없는 항목을 명확히 분리한다.

초기 정적·route 감사에서는 Production DB/Auth/Storage, 실제 결제·환불·구독, 이메일 발송, 고객 데이터에 어떤 write도 수행하지 않았다. 이후 2026-08-07에는 사용자가 승인한 정확한 직원 초대 1건만 별도 Production E2E로 수행했다.

## 자동 검증 결과

다음 검증은 통과했다.

- `git diff --check`
- `npx tsc --noEmit --pretty false`
- `npm run lint`
- `npm run build`
- `npm test` — 28개 파일의 계약 테스트 142개 통과
- Order·Call·table session·권한 audit·구독 갱신·매출·앱 내·브라우저 도착 알림 계약 포함

`npm test`는 Node test runner에 `tsx` import hook을 연결해 확장자 없는 TypeScript import와 top-level await를 동일한 명령으로 처리한다. 해지 예약 구독이 billing key 존재 여부와 무관하게 재결제 경로보다 만료 경로를 우선하는 계약도 포함한다.

## 로컬 브라우저 route QA

최신 `tablescene-next` 개발 서버를 재시작한 뒤 다음을 읽기 전용으로 확인했다.

| 흐름 | 결과 |
| --- | --- |
| `/sign-up` | 회원가입과 이메일 계정 생성 화면 로드 |
| `/forgot-password` | 비밀번호 재설정 화면 로드 |
| `/pricing` | Basic·Display·Custom 요금제 화면 로드 |
| `/apply/order` | 현재 제품 소개 route인 `/services/order`로 정상 연결 |
| `/templates/cafe_design_a/preview` | 오브 커피 renderer와 메뉴 구역 로드 |
| `/templates/cafe_design_a/preview?orderCallQa=active` | 390×844에서 테이블·직원 호출·장바구니 헤더와 두 dialog 정상 로드 |
| `orderCallQa=call` / `order` / `no-session` | Call-only·Order-only 독립 노출과 세션 없음 action 비노출 확인 |
| `/templates/display_menu_a/preview?orderCallQa=active` | Display에서 공통 Order/Call header 전체 비노출 확인 |
| `/mypage/menus/[menuId]/preview?device=tablet` | orientation query가 없어도 가로 1180×820을 기본으로 표시하고 세로 전환 링크 제공 |
| `device=mobile` | 모바일 한 화면에서 직원 호출·메뉴별 담기·장바구니·지금 결제/후불 결제를 fixture로 표시하고 실제 호출·주문·결제 write 없음 |
| `/mypage?tab=menus` 비로그인 접근 | `/sign-in?next=/mypage`로 보호 |

브라우저에 남아 있던 `StaffCallDialog.tsx` missing 로그는 PR #28 병합 전 개발 서버의 과거 시각 로그였다. 서버를 최신 코드로 재시작한 뒤 해당 파일이 포함된 production build와 template route가 정상 로드됐다.

## 흐름별 판정

### 코드·route QA 완료

- 메뉴 편집·디자인·위젯·다국어: 활성 템플릿 저장 round-trip, locale, capability, preview/public 격리 QA 기록을 재확인했다.
- 미리보기·공개·일반 QR: 공통 renderer, 기기 프레임, 공개 route, QR 분리 계약이 구현·빌드돼 있다.
- table session·Order·Call의 보안 계약: hash-only token, HttpOnly session, service-role-only DB 접근, idempotency, rate limit, permission과 staff write audit 테스트가 통과했다.
- Order·Call 공개 config를 공통 gate로 결합해 유효 세션·Business Basic·template 지원·각 runtime allowlist가 모두 통과할 때만 기능별 action과 주문 catalog가 활성화된다. 로컬 QA fixture 4종과 Display 제외 화면에서 console warning/error 없이 확인했다.
- 주문관리·수동 결제·매출·앱 내 알림과 사용자 선택형 브라우저 알림의 default-off route가 production build에 포함됐다.

### Production 직원 초대 E2E 완료

2026-08-07 사용자 승인 아래 기존 Owner 계정, 기존 별도 직원 계정, 운영 가능한 기존 메뉴판을 사용해 다음을 확인했다. 화면 확인만을 위한 새 가짜 메뉴판·계정은 만들지 않았다.

- Production 직원 초대 feature gate와 이메일 발송 경로가 동작하고, 7일 만료 viewer 초대가 수신됐다.
- 초대 링크가 raw token을 URL에서 제거한 review route로 이동하고 로그인 계정 이메일 불일치를 수락 전에 차단했다.
- 초대받은 직원 계정으로 로그인한 뒤 수락 RPC가 성공하고 메뉴판 1개가 `직원 참여`·`조회자`로 표시됐다.
- viewer에게 Owner 전용 결제·구독·보관·삭제 동선이 표시되지 않고 사용 가능 기능은 미리보기만 노출됐다.
- 비공개 Display 메뉴판의 읽기 전용 미리보기가 PC 프레임에서 렌더됐고, 편집 route 직접 접근은 `menu-edit-forbidden`으로 마이페이지에 되돌아갔다.
- 직원 관리 route 직접 접근은 소유 메뉴판·직원 데이터·활성 mutation을 노출하지 않는 비활성 상태로 유지됐다.

### 사람 검증이 필요한 흐름

아래 항목은 코드 실패가 아니라 실제 외부 상태 변경 또는 실사용 계정이 필요한 최종 E2E다.

- 회원가입 이메일·비밀번호 재설정 이메일 실제 수신
- 실제 상품 구매와 PortOne 승인·실패·취소·환불
- 승인된 Order/Call 상품·site allowlist를 사용하는 실제 table QR 방문·주문·호출
- 실제 주문의 상태 변경·외부 결제 완료와 앱 내 새 도착 배너
- 실제 구독의 해지·보관·복구

이 항목을 확인하기 위해 Production에 가짜 직원·테이블·주문·결제 데이터를 만들지 않는다.

## 다음 안전 경계

- 외부 알림톡·문자·push는 채널과 가격 정책이 결정되기 전까지 구현하지 않는다.
- 선결제 PG는 provider, merchant onboarding, webhook, 취소·환불 정책이 확정돼야 진행한다.
- Production feature gate와 allowlist는 실제 상품 entitlement 결정 후 승인된 site부터 단계적으로 활성화한다.
