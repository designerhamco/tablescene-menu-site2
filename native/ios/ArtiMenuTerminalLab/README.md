# 아티메뉴 NICE 단말기 개발용 앱

iPhone·iPad에서 NICE AppPOS 요청 형식과 앱 복귀 처리를 준비하는 iOS17 이상 개발용 프로젝트다. 아티메뉴 운영 주문·매출 서버와 연결하지 않는다. 기본 빌드에서는 AppPOS 설치 여부 확인과 요청 미리보기만 가능하며, 실제 결제 요청은 실행되지 않는다.

## 준비와 빌드

1. 전체 Xcode가 설치된 Mac에서 `ArtiMenuTerminalLab.xcodeproj`를 연다. Command Line Tools만으로는 SwiftUI 앱·시뮬레이터·XCTest를 빌드할 수 없다.
2. `ArtiMenuTerminalLab` 스킴을 선택한다. 실기기 설치 시 본인의 개발 Team과 사용 가능한 Bundle Identifier를 설정한다. 고객용 App Store 등록과는 별도인 개발 단계다.
3. 시뮬레이터에서는 UI·요청 미리보기를 먼저 검수한다. 실제 리더기·업체 앱 검증은 업체가 지원하는 실기기에서 진행한다.
4. 공식 업체 앱과 계정·펌웨어·리더기 조건, iOS 스킴 등록을 확인한다. 개발계 AppPOS는 NICE의 TestFlight 등록 절차를 확인한다.

기본 프로젝트에 `ARTIMENU_VENDOR_TESTING` 플래그는 없다. 업체가 개발 테스트용 사용을 승인한 계정·리더기를 확보한 후에만 Debug의 Active Compilation Conditions에 이 플래그를 추가한다. 앱의 계정 확인 스위치도 사용자가 명시적으로 켜야 한다. Release는 이 플래그를 넣어도 결제 실행을 허용하지 않는다. 이는 고객용 앱의 운영 결제 활성화 기능이 아니다.

실사용 계정으로 외부 앱을 호출하면 실제 결제가 발생할 수 있다. 테스트용 가맹정보·카드 사용 조건을 업체와 확정한 뒤 사람이 최종 확인 버튼을 눌러야 한다. 이 프로젝트는 테스트 카드정보·실가맹정보를 포함하지 않는다. 코드의 `TEST000001`과 `0000000000`은 형식 검사 전용 가짜 값이며 업체에 보내지 않는다.

## 처리 범위

- `apppos://pay` 요청: gubun0100, amount, CATID, 사업자번호, 10자리 요청 일련번호, 일시불, 앱 복귀 주소.
- 개발용 복귀 스킴: `artimenu-terminal-lab://result`. 업체 측 등록이 완료되었다는 의미는 아니다.
- 요청별 임의 state와 oid를 확인하고 다른 요청·금액·거래종류, 중복 항목, 임의 주소와 fragment를 거부한다.
- 전달 이후 입력·재전송을 잠근다. 앱이 종료되어 진행 중 요청을 잃었거나 결과가 유실되면 새 결제를 보내기 전에 업체 거래 조회로 확인한다.
- 콜백 결과는 `업체 거래 확인 필요`로 표시한다. 주문 결제 상태를 변경하지 않으며, 신뢰할 수 있는 서버 검증은 별도 후속 작업이다. 요청·계정 정보는 메모리에만 둔다.
- 현재 프로젝트에는 고객 로그인·웹뷰·서버 결제 원장·실시간 실적전송·취소 화면이 없다. 첫 승인 요청·복귀 처리 검증용이며 범용 계산대 앱이 아니다.

## Core 검사

전체 Xcode가 있다면 `Core`에서 `swift test`로 XCTest를 실행한다. Command Line Tools 환경에서는 아래 독립 실행 검사로 같은 경계값과 콜백 처리의 핵심을 확인할 수 있다.

```sh
swift run --package-path Core TerminalCoreChecks
```

격리 환경에서는 캐시 경로를 별도로 지정할 수 있다. 저장소 루트 기준으로 실행한 실제 명령:

```sh
CLANG_MODULE_CACHE_PATH=/private/tmp/artimenu-terminal-clang-cache \
SWIFTPM_MODULECACHE_OVERRIDE=/private/tmp/artimenu-terminal-swift-cache \
swift run --disable-sandbox \
  --package-path native/ios/ArtiMenuTerminalLab/Core \
  --scratch-path /private/tmp/artimenu-terminal-core-build \
  --cache-path /private/tmp/artimenu-terminal-spm-cache \
  --config-path /private/tmp/artimenu-terminal-spm-config \
  --security-path /private/tmp/artimenu-terminal-spm-security \
  --manifest-cache local TerminalCoreChecks
```

이 명령은 외부 패키지를 내려받지 않고 이 저장소의 Core와 검사 코드만 빌드한다. SwiftPM의 중첩 sandbox-exec 실행이 제한되는 개발 환경에서만 `--disable-sandbox`를 사용한다. 운영 앱의 보안 설정을 바꾸는 옵션이 아니다.

2026-11-03: Swift6.1.2·macOS arm64에서 Core 빌드와 독립 검사18건 통과. Info.plist와 Xcode 프로젝트 plist 문법 통과. 전체 Xcode가 없어 SwiftUI 앱·실기기 설치·XCTest·시뮬레이터 빌드는 미검증이다.

## 출처

- [NICE 요청 규격](https://apppos.nicevan.co.kr/dev/api_request.html)
- [NICE 응답 규격](https://apppos.nicevan.co.kr/dev/api_response.html)
- [앱 스킴 등록·결과 유실 처리](https://apppos.nicevan.co.kr/dev/etc_warning.html)
- [공식 개발계 앱 안내](https://apppos.nicevan.co.kr/dev/download_devapp.html)
