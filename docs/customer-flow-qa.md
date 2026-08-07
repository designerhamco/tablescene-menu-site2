# MenuLink 전체 고객 흐름 QA

최종 갱신: 2026-08-07

## 목적

출시 전 전체 고객 흐름을 코드·route·계약 테스트로 다시 연결해 확인하고, 실제 계정·결제·Production write가 없으면 검증할 수 없는 항목을 명확히 분리한다.

이번 감사에서는 Production DB/Auth/Storage, 실제 결제·환불·구독, 이메일 발송, 고객 데이터에 어떤 write도 수행하지 않았다.

## 자동 검증 결과

다음 검증은 통과했다.

- `git diff --check`
- `npx tsc --noEmit --pretty false`
- `npm run lint`
- `npm run build`
- Order·Call·table session·권한 audit·매출·앱 내 도착 알림 계약 테스트 42개 통과
- `npm test --if-present` — 프로젝트에 `test` script가 없어 실행 항목 없음

Node의 기본 TypeScript strip runner로 `lib/*.test.ts` 전체를 한 번에 실행하면 일부 기존 파일의 확장자 없는 ESM import를 해석하지 못한다. 이는 TypeScript·Next production build 실패가 아니며, 실행 가능한 서버 계약 테스트 묶음은 별도 명시해 42개 모두 통과시켰다.

## 로컬 브라우저 route QA

최신 `tablescene-next` 개발 서버를 재시작한 뒤 다음을 읽기 전용으로 확인했다.

| 흐름 | 결과 |
| --- | --- |
| `/sign-up` | 회원가입과 이메일 계정 생성 화면 로드 |
| `/forgot-password` | 비밀번호 재설정 화면 로드 |
| `/pricing` | Basic·Display·Custom 요금제 화면 로드 |
| `/apply/order` | 현재 제품 소개 route인 `/services/order`로 정상 연결 |
| `/templates/cafe_design_a/preview` | 오브 커피 renderer와 메뉴 구역 로드 |
| `/mypage?tab=menus` 비로그인 접근 | `/sign-in?next=/mypage`로 보호 |

브라우저에 남아 있던 `StaffCallDialog.tsx` missing 로그는 PR #28 병합 전 개발 서버의 과거 시각 로그였다. 서버를 최신 코드로 재시작한 뒤 해당 파일이 포함된 production build와 template route가 정상 로드됐다.

## 흐름별 판정

### 코드·route QA 완료

- 메뉴 편집·디자인·위젯·다국어: 활성 템플릿 저장 round-trip, locale, capability, preview/public 격리 QA 기록을 재확인했다.
- 미리보기·공개·일반 QR: 공통 renderer, 기기 프레임, 공개 route, QR 분리 계약이 구현·빌드돼 있다.
- table session·Order·Call의 보안 계약: hash-only token, HttpOnly session, service-role-only DB 접근, idempotency, rate limit, permission과 staff write audit 테스트가 통과했다.
- 주문관리·수동 결제·매출·앱 내 알림의 default-off route가 production build에 포함됐다.

### 사람 검증이 필요한 흐름

아래 항목은 코드 실패가 아니라 실제 외부 상태 변경 또는 실사용 계정이 필요한 최종 E2E다.

- 회원가입 이메일·비밀번호 재설정 이메일 실제 수신
- 실제 상품 구매와 PortOne 승인·실패·취소·환불
- 실제 Owner가 보낸 직원 초대 이메일과 별도 직원 계정 수락·역할별 화면
- 승인된 Order/Call 상품·site allowlist를 사용하는 실제 table QR 방문·주문·호출
- 실제 주문의 상태 변경·외부 결제 완료와 앱 내 새 도착 배너
- 실제 구독의 해지·보관·복구

이 항목을 확인하기 위해 Production에 가짜 직원·테이블·주문·결제 데이터를 만들지 않는다.

## 다음 안전 경계

- 외부 알림톡·문자·push는 채널과 가격 정책이 결정되기 전까지 구현하지 않는다.
- 선결제 PG는 provider, merchant onboarding, webhook, 취소·환불 정책이 확정돼야 진행한다.
- Production feature gate와 allowlist는 실제 상품 entitlement 결정 후 승인된 site부터 단계적으로 활성화한다.
