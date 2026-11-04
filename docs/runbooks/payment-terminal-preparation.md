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

매장 행 잠금과 revision 비교로 동시 생성과 덮어쓰기를 제어한다. 민감한 가맹 정보를 공개 메뉴판 응답으로 노출하지 않는다.

2026-11-03 사용자 승인 후 운영 프로젝트 `kfbekbapwsyeanobyjsv`에 이 SQL 한 건을 적용하고 마이그레이션 이력 `20261103093145`를 기록했다. 공식 DB 타입을 다시 생성하고 임시 RPC 타입 확장을 제거했다. 운영 카탈로그 조회로 RLS·FORCE RLS, 두 함수의 invoker·빈 검색 경로, anon/authenticated 접근 차단과 service-role 권한을 확인했다. 실제 매장 소유자에 대한 service-role 읽기는 빈 목록을 반환했고 준비정보 표는 0행이다. 검수용 준비정보 저장이나 실제 결제는 실행하지 않았다. 앱 코드의 GitHub 업로드와 배포는 이번 DB 승인 범위에 포함하지 않는다.

운영 적용 후 검사는 신규 표와 함수 권한 및 빈 목록 읽기만 수행한다. 실제 가맹정보·테스트 결제·기존 주문 상태는 검수 목적으로 변경하지 않는다.

적용 후 실제 로그인한 로컬 화면에서 준비정보 저장 버튼 활성화, 연결 확인·결제 테스트 버튼 비활성화를 확인했다. 전체 테스트 1,064건, 사이트 UI 110건, 격리 DB 31건, 격리 서버 16건과 TypeScript·ESLint 검사를 다시 통과했다. 운영 보안 진단에는 이번 표·함수 관련 지적이 없었다. 기존 다른 객체의 경고 22건은 이번 적용 범위에 포함하지 않았다.

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

## 2026-11-04 KSNET 회신 자료 검토

사용자가 전달한 개발 담당자 회신과 `20260914_KSCAT_v2.4.0_개발자용.zi`를 검토했다. 확장자는 `.zi`이지만 ZIP 형식이며, SHA-256은 `8727cc8b946b80666383b2368217b7824ab8d2c4de42795baf53cce02cc2661f`이다. 원본에는 샘플, 연동 모듈, 문서, Windows 설치 패키지의 압축 파일 4개가 있다. 업체 원본·바이너리·인증서 자료는 공개 저장소에 추가하지 않았다. 설치 파일이나 샘플 HTML은 실행하지 않고 문서·소스만 검토했다.

- `KSCAT 연동 Sample.zip`의 `WebServer(Jsonp)_일반/Approval/WEB_Approval_Example_20260803.html`은 브라우저에서 `http://127.0.0.1:27098`의 로컬 KSCAT에 `REQ`와 callback을 전달한다. 기본 경로는 **같은 Windows PC의 아티메뉴 브라우저 → KSCAT → 지원 장비**로 잡을 수 있다. 이 경로를 먼저 시험하므로 별도 아티메뉴 PC 연결 프로그램 개발을 선행할 필요는 없다는 판단이다. 최신 브라우저의 실물 검증을 마친 결론은 아니다.
- `KSCAT 연동 문서.zip`의 `KSCAT CAT단말기 연동 설정 가이드.pdf` 1~5쪽은 PC에서 KSCAT을 실행하고, CAT 포트와 단말기 펌웨어 방식을 맞춘 뒤 WebServer를 켜고 서비스를 시작하도록 안내한다. 웹 샘플 포트와 KSCAT의 **WEB 포트**를 맞춰야 한다. 예시의 일반 I/F 포트 `27015`와 WEB 포트 `27098`를 혼동하지 않는다. 리더기 방식과 CAT 단말기 방식의 설정·요청은 서로 구분해야 한다.
- `WEB 연동/KSCAT.WebApproval.v1.0.0.1.pdf`에는 승인 요청과 단말기번호·승인번호·거래고유번호 등의 응답 필드가 있다. `KSCAT.WebSub.v1.0.0.1.pdf`에는 최종·과거 거래 조회가 있다. 응답 수신만으로 아티메뉴 주문을 결제 완료로 바꾸지 않으며, 거래 검증·중복 방지·결과 유실 처리는 별도 구현한다.
- 설치 패키지는 Windows용이다. 이 자료로 Mac·iPad·iPhone 지원을 확인한 것은 아니다. 문서의 브라우저 시험 환경은 Windows 7 32/64bit여서 Windows 11, 최신 Chrome·Edge와 Surface ARM64 드라이버 지원은 추가 확인 대상이다. 샘플의 시험 TID가 모든 개발자에게 사용 허가된 계정을 의미하지 않는다.
- HTTPS 운영 웹에서 로컬 프로그램에 접속할 때는 최신 브라우저의 로컬/루프백 네트워크 권한과 실제 JSONP·CORS 동작을 검증한다. localhost 개발 화면에서 성공한 결과만으로 운영 웹의 연결 성공을 판단하지 않는다. 참고: [Chrome Local Network Access](https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access).
- 개발 담당자는 테스트 장비와 가맹 조건은 영업 문의 대상이라고 안내했다. 영업에는 KSCAT 웹 연동용 최저가 지원 장비·펌웨어·연결 케이블/드라이버, 개발용 구매·대여 조건, 시험 TID·카드 발급 경로, 실제 가맹 계약 전 시험 가능 여부를 확인한다. 추가 메일은 이번 자료 검토 과정에서 발송하지 않았다.

## 2026-11-04 Windows 연결 확인 구현

주문관리 → 결제 단말기 연결에서 KSNET을 선택하면 설치 순서와 `KSCAT 연결 확인`을 제공한다. WEB 포트는 기존 준비정보 필드에 보관하며, 프로그램 응답 상태는 현재 화면·기기에만 존재한다. 포트·업체·매장을 바꾸거나 화면을 나가면 확인 상태와 진행 중 요청을 해제한다. 다른 기기의 연결 상태나 계정 전체의 연결 완료로 표시하지 않는다. 매장 전환 시 기존 준비정보 입력 상태도 새 매장 기준으로 초기화한다.

실제 전송을 허용한 요청은 XLS `보조기능`의 2.17에 있는 버전 조회 **VR** 한 종류다. 요청은 `AP` + STX + `0004VR` + ETX + CR이며 장비 초기화·카드 읽기·승인·취소 요청을 전송하지 않는다. TID·사업자번호·주문·금액·카드 데이터도 보내지 않는다. Windows·보안 컨텍스트·네트워크 권한을 확인한 뒤 사용자 클릭으로 같은 기기의 `http://127.0.0.1:<WEB 포트>/`에 한 번만 POST한다. 응답에는 같은 callback, AP·VR 구분, 정상 코드와 유효한 버전 날짜가 있어야 한다. 시간 제한은 8초이며 자동 재전송하지 않는다.

CORS로 읽은 JSONP를 텍스트로 파싱한다. 실행문·중첩 객체·중복 키·과도한 응답·다른 callback은 거부하고 eval·외부 script·iframe 방식으로 우회하지 않는다. 응답 크기는 32KiB로 제한하고 UTF-8/EUC-KR 계열만 읽는다. 쿠키·인증정보·referrer는 보내지 않고 리디렉션도 거부한다. 제공 실행 파일의 정적 문자열에서 CORS 헤더 이름을 확인했지만 실제 응답 헤더·HTTP 동작을 Windows에서 검증한 결과는 아니다. 설치 버전이 CORS를 지원하지 않으면 명확히 실패시키고 업체의 공식 대안을 확인한다. VR의 WEB JSONP 키 역시 실제 프로그램 응답 예시를 업체에 추가 문의해야 한다.

`kscat-protocol.ts`에는 IC 리더기용 원화 일시불 승인·원거래 참조 취소 전문의 **오프라인 생성·결과 검사**도 추가했다. XLS 기준 신용 공급금액 필드는 0으로 두고 부가세·면세·봉사료는 서버 확정 값을 받도록 설계한다. 전자서명은 샘플의 무서명 강제를 복사하지 않고 KSCAT 설정을 따른다. 임의 금액·0 일련번호·다른 TID/일련번호/거래종류와 잘못된 승인 참조를 거부한다. 현재 브라우저에서 이 결제 전문을 전송하는 기능은 없다. 단독 CAT 장비용 CC 전문, 할부·부분취소·현금영수증은 아직 구현하지 않았다.

성공처럼 보이는 응답도 `verification_required`이며 주문·매출에 반영하지 않는다. 카드·WorkingKey·전체 원문은 반환하거나 저장하지 않는다. 실제 결제 활성화 전에는 영속 결제 요청·중복 방지·서버 확정 금액·신뢰할 수 있는 업체 결과 검증을 구현해야 한다.

검수: 신규 프로토콜·통신 테스트 16건을 포함해 전체 1,080건, 공통 UI 110건, 격리 서버 권한·저장 검사 16건과 TypeScript·ESLint·프로덕션 빌드가 통과했다. 실제 로그인된 로컬 화면의 320·390·820·1440·1920px에서 가로 넘침 0px, 안내16px·작업 박스20/24px·입력16px 및 와이드 배율을 확인했다. Mac에서 Windows 전용 안내, 잘못된 포트 안내, 포트 변경 시 상태 초기화를 확인했다. 정상·오류·시간 초과 응답은 격리 transport로 검사했다. Windows 실물 KSCAT, HTTPS 운영 도메인의 로컬 네트워크 권한, 카드 장비와 실제 승인·취소는 아직 검증하지 않았다.

개발 담당자에게 보낼 CORS·VR 응답·Windows ARM·서버 거래 검증 문의와 영업 창구 안내 요청은 Gmail 답장 초안으로 준비했다. 발송·가입·구매·운영 DB 변경·GitHub 업로드·배포는 이 구현에 포함하지 않는다. 장비 문의는 [KSNET 공식 문의하기](https://www.ksnet.co.kr/support/inquiry) 또는 공식 오프라인 고객센터를 통해 해당 영업 담당자에게 연결받는다.

### Surface에서 첫 프로그램 확인

1. 설정 → 시스템 → 정보에서 프로세서·시스템 종류·Windows 버전을 확인한다. ARM이면 설치와 드라이버 지원을 먼저 확인한다.
2. 받은 공식 패키지의 `Setup/KSCAT_Setup.msi`를 Windows에 설치하고 KSCAT에서 WebServer를 켠 뒤 서비스를 시작한다. 관리자 권한·드라이버 설정은 공식 안내를 따른다. 브라우저 보안 차단이나 인증서 경고를 해제해서 진행하지 않는다.
3. 아티메뉴 화면은 **그 Windows 기기에서** 연다. Mac의 `localhost:3100` 주소는 Surface에서 같은 서버를 가리키지 않는다. 현재 코드는 로컬 단계이므로 Surface에서 실행 가능한 개발 환경 또는 별도 승인된 HTTPS 배포가 준비돼야 한다. 이 경로 없이 Mac에서 프로그램 연결 성공을 확인했다고 안내하지 않는다.
4. KSNET 선택 → KSCAT에 표시된 WEB 포트 입력(기본27098) → `KSCAT 연결 확인`. 이 단계는 카드·사업자번호·TID 없이 프로그램 버전만 확인한다. 성공해도 단말기 사용 가능이나 결제 승인을 뜻하지 않는다.

## 다음 단계

1. NICE의 개발용 CATID·테스트 사업자정보·카드·리더기 조건, 최신 Swift 샘플, iOS 스킴 등록, 거래 조회·실적전송 자료를 확인한다.
2. KSNET은 받은 웹 샘플을 기준으로 요청·응답을 구현하고, Surface의 CPU·Windows 버전과 최신 브라우저 지원을 확인한다. 장비 확보 후 HTTPS 웹에서 로컬 KSCAT 연결을 검증한다. 기본 경로에서 해결되지 않는 구체적인 제약이 확인될 때 별도 PC 연결 프로그램 필요 여부를 재판단한다.
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
