# 결제 단말기 연결 준비와 테스트

2026-11-03. 첫 단계는 NICE AppPOS의 iPhone·iPad 연동과 KSNET KSCAT의 Windows 웹 연동 준비다. 업체 회신, 테스트 계정과 실물 리더기 검증 전에는 어느 방식도 실제 결제를 활성화하지 않는다.

## 현재 구현

- 주문관리의 `결제 단말기 연결` 탭: `/mypage/menus/<menuId>/orders/settings?tab=payments`.
- 사장님만 업체별 준비정보를 조회·저장한다. 저장은 연결 성공이나 실사용 활성화를 의미하지 않는다. 일반 직원의 탭은 권한 설명을 표시하고 직접 접근도 차단한다.
- 사용 예정 장비의 실제 모델, 사업자번호, 업체가 발급한 단말기 번호를 받는다. KSNET은 업체가 웹 연동용으로 안내한 프로그램 포트도 받는다. API 비밀키, 카드정보, 임의 URL, 실행 명령, 활성화 플래그는 받지 않는다.
- 설치·업체 안내는 공식 페이지로 연결한다. 문의용 복사는 사업자·단말기 번호의 뒤 네 자리를 제외하고 가린다. 입력 확인은 형식 검사이며 통신 성공을 표시하지 않는다.
- DB가 아직 준비되지 않았거나 정보를 불러오지 못하면 저장을 차단하고 설명한다. 입력값을 브라우저 영구 저장소에 보관하거나 메뉴판 공개 settings에 섞지 않는다.
- 공통 결제 모델은 요청·매장·주문·단말기·업체·금액을 함께 비교한다. 결과 유실은 `unknown`, 앱 콜백은 `verification_required`로 남긴다. 승인 후 늦게 도착한 타임아웃으로 상태를 되돌리지 않는다.
- 이 모델은 순수 상태 전이 코드다. 운영 결제 요청 저장소, 영속 중복 방지, 서버 금액 확정, 업체 거래 조회·실적전송 어댑터와 주문 결제 반영은 후속 단계다. 현재 주문·매출·PortOne 서비스 이용료 결제에는 연결하지 않는다.

## 준비정보 저장용 SQL

파일: `supabase/migrations/20261103093145_payment_terminal_preparation.sql`.

비공개 `private.menu_payment_terminal_preparations` 표 하나와 공개 스키마의 service-role 전용 invoker RPC 두 개를 추가한다. 공개 RPC는 `list_payment_terminal_preparations`, `save_payment_terminal_preparation`이며 내부 SQL에서 매장 소유자를 다시 확인한다. `anon`·`authenticated`·`PUBLIC` 실행권한이 없고, 표에는 RLS와 FORCE RLS를 적용한다. 검색 경로는 비우고 객체명을 완전히 지정한다.

기존 메뉴판·주문·호출·매출 표는 변경하지 않는다. 새 준비정보의 기본키는 매장·연결방식이다. 같은 방식의 여러 단말기 등록과 장비 페어링은 실제 업체 연동 단계에서 확장해야 한다. 이 단계에서는 ‘사용할 계산대’ 등록을 요구하지 않는다.

매장 행 잠금과 revision 비교로 동시 생성과 덮어쓰기를 제어한다. 민감한 가맹 정보를 공개 메뉴판 응답으로 노출하지 않는다. 운영에 적용하려면 별도 승인이 필요하다. 적용 전에는 파일 검토와 격리 DB 테스트까지만 진행한다. 적용 후 공식 DB 타입을 다시 생성하고 임시 RPC 타입 확장 부분을 정식 생성 타입으로 옮긴다.

운영 적용 후 검사는 신규 표와 함수 권한 및 빈 목록 읽기만 수행한다. 실제 가맹정보·테스트 결제·기존 주문 상태는 검수 목적으로 변경하지 않는다.

## iOS 개발용 앱

`native/ios/ArtiMenuTerminalLab/ArtiMenuTerminalLab.xcodeproj`와 그 안의 README를 따른다. 기본 빌드는 요청 미리보기와 앱 설치 여부 확인만 제공한다. 외부 결제 실행 조건은 기본으로 꺼져 있으며 Release에서는 켤 수 없다. 업체의 개발용 계정·장비 확인을 마친 후 개발자만 별도 Debug 빌드에서 활성화한다.

콜백의 state·요청번호·거래종류·금액을 검사하지만 콜백을 업체 승인 인증으로 취급하지 않는다. NICE가 안내한 일반 SHA-256 hash 역시 비밀키 기반 인증이 아니다. 실제 서버 반영 전에는 업체가 제공하는 신뢰할 수 있는 거래조회·실적전송 검증이 필요하다.

## 검수 명령

```sh
node --import ./scripts/register-test-css.mjs --import tsx --test lib/payment-terminal-preparation.test.ts lib/terminal-payment-attempt.test.ts
PGLITE_TEST_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node scripts/qa-payment-terminal-preparation-db.mjs
node scripts/qa-payment-terminal-preparation-service.mjs
npm run check:site-ui
npm test
npx tsc --noEmit
ARTIMENU_BUILD_DIR=.next-payment-terminal-build npm run build
```

PGlite 검사에는 프로젝트와 분리해 설치한 `@electric-sql/pglite`를 사용할 수 있다. 운영 DB 연결 문자열을 검사 스크립트에 전달하지 않는다.

2026-11-03 검수: 전체 TypeScript 테스트 1,064건, 사이트 UI 110건, 격리 PostgreSQL 31건, 격리 서버 권한·저장 처리16건 통과. 320·390·820·1440·1920px의 실제 로그인된 로컬 화면에서 가로 넘침 0px와 안내16px·작업 박스20/24px 안쪽 여백을 확인했다. Swift Core는 Command Line Tools에서 빌드하고 독립 검사18건을 실행했다. 전체 Xcode가 없어 iOS 앱 및 XCTest·시뮬레이터 빌드는 아직 검증하지 않았다.

## 다음 단계

1. NICE의 개발용 CATID·테스트 사업자정보·카드·리더기 조건, 최신 Swift 샘플, iOS 스킴 등록, 거래 조회·실적전송 자료를 확인한다.
2. KSNET의 웹 연동 샘플과 최신 브라우저 지원·보안 조건, Windows x64/ARM64 지원을 확인한다. 별도 자체 PC 프로그램 필요 여부는 이 자료로 판단한다.
3. 업체가 지원하는 테스트 장비·계정을 확보한 뒤 실기기로 승인·결과 유실·거래 조회·취소를 검증한다. 장비 구매 가격에 가맹·약정 조건이 있는지도 확인한다.
4. 업체 인증을 통과한 서버 결과 처리, 영속 결제 시도·원장·중복 방지와 주문 금액 재확정을 구현한 다음 실제 주문에 연결한다. 그 전에는 고객 화면의 연결·결제 테스트 버튼을 활성화하지 않는다.
5. iOS 앱 고객 배포와 App Store 심사는 실물 검증 후 진행한다. 현재 앱은 고객용 스토어 제출본이 아니다.

## 공식 규격

- [NICE AppPOS 요청](https://apppos.nicevan.co.kr/dev/api_request.html)
- [NICE AppPOS 응답](https://apppos.nicevan.co.kr/dev/api_response.html)
- [NICE 결과 유실·실적전송·iOS 등록 안내](https://apppos.nicevan.co.kr/dev/etc_warning.html)
- [NICE 개발계 앱](https://apppos.nicevan.co.kr/dev/download_devapp.html)
- [KSNET KSCAT 자료 안내](https://www.ksnet.co.kr/support/resource/7482e95f-45b2-42ca-b057-cc12e88114e1)
- [Supabase 함수 권한](https://supabase.com/docs/guides/database/functions)
