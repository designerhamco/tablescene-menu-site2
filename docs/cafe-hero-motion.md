# 아티메뉴 카페 hero 모션

2026-11-18 사용자 요청으로 홈 첫 hero를 사진 기반 웹 시퀀스로 교체했다. 2026-11-19 후속 요청의 메인·서비스 소개 통합은 [페이지 레이아웃 계약](site-page-layout-contract.md#메인서비스-소개-통합-2026-11-19-현행)을 따른다. 이 문서는 카페 hero의 시연·모션을 설명한다.

## 현행: 스크롤 전용 4개 장면 (2026-11-19)

자동 재생·대기 후 재개·자동 페이지 이동·점의 일시정지 기능은 제거했다. 오직 실제 스크롤 위치가 장면과 내부 UI 단계를 정한다. 입력을 멈추면 진행값도 그대로 유지되며 장면 이동은 제목 아래의4개 진행 막대로 제공한다. 위로 스크롤하면 같은 위치의 이전 상태로 복원한다.

홈 홍보 장면의 디바이스 화면은 직접 조작하는 메뉴판이 아니다. 변형된 iframe 바깥, 부모 문서의 스테이지에 투명한 입력 면을 두어 목업 위에서 시작한 세로 스와이프도 홈 페이지를 스크롤한다(`touch-action:pan-y pinch-zoom`). 클릭 가능한4개 진행 막대와 공통 헤더는 이 면보다 위에 유지한다. 이벤트 취소나 수동 터치→스크롤 변환을 추가하지 않으며 시연 스크립트는 기존 스크롤 진행값으로 내부 화면을 계속 조작한다. 실제 메뉴판·카탈로그 미리보기의 입력/스크롤 규칙은 변경하지 않는다.

- 매장:160svh. 세 가지 템플릿을 각각 한 번씩 보여주며 반복 순환하지 않는다(전환 두 번).
- 태블릿:506svh. 서사 좌표는46까지이며 초기 준비·메뉴 탐색(5–21)·할인 위치 복귀(21–27)의 기존 스크롤 속도와242svh를 유지한다. 확대28–36 뒤36–46은 확대 상태로110svh를 보여준다(이전44svh). 숫자는 재생 시간이 아닌 스크롤 서사 좌표다. 카운트 강조는 메뉴판 내부 화살표를 제거하고 외부 흰색 둥근 사각형 파장으로 바꾼다. 확대 완료 뒤36.5–45.5에서 세 번 퍼지며 사라지고 같은 스크롤 진행값으로 정/역방향을 따른다. `HeroSaleHighlight`는 사진·canvas·투영 메뉴 바깥의 stage에 놓고 실제 숫자 영역을 화면 좌표로 변환해 감싼다. 수평 사각형과2px 흰 선·12px 모서리·최대14px 퍼짐은 화면 기준이며 메뉴판의 원근·확대를 상속하지 않는다. 숫자 안쪽은 투명하고 흰 바탕에서 보이도록 옅은 어두운 그림자만 더한다. 실제 카메라 확대가 완료되기 전·로딩·다른 장면·모션 감소 상태에는 표시하지 않는다. 내부 viewport1280×800과 메뉴3열, 다이닝820×512는 유지한다. 추가 확대는 PC80%(1024px 이상), 기존 모바일/좁은 태블릿180%로 분리한다.
- 다이닝:280svh. 페이지 넘기기·와인 문의 선택·전송을 스크롤 단계에 맞춰 보여준다.
- QR 주문: 기존 네 번째/다섯 번째를 한 장면으로 합쳤다.660svh에 QR 강조(.4–5.8 위치) → 메뉴 탐색(9–20) → 상품 선택(28) → 장바구니 담기(35) → 장바구니 보기(42) → 예시 번호를 한 자리씩 입력(44–51) → 미리보기 주문(60) → 완료 화면(66)을 배치한다. 숫자는 재생 시간이 아닌 스크롤 위치의 서사 좌표다. 광고와 하단 위젯은 popupPreview=off/widgetsPreview=off로 제외하며 호출도 시연하지 않는다.

현재 hero는 스테이지를 포함1706svh다. 2026-11-19 모바일 브라우저 종료 제보 후, 첫 매장 장면의0–65%에서는 native iframe을0개로 유지한다. 65% 이후에만 다음 태블릿 앱 한 개를 비활성 상태로 준비하며, 태블릿 장면 진입 후 실제 스크롤 위치로 시연한다. 여러 장면의 앱을 동시에 미리 로딩하지 않는다. 다른 장면·hero 밖·숨긴 탭·모션 감소 상태에서는 전체 메뉴 앱을 올리지 않는다. 역방향으로 UI 단계가 바뀔 때만 같은 장면의 숨긴 새 프레임에서 이전 상태를 복원한다(평상시1개, 복원 중 최대2개). 준비 중에는 캡처를 표시하고 목표 단계에 도달한 native 화면만 보여준다. 비활성 사진 면은 visibility로 그래픽 합성에서 제외하고 영구 will-change 승격은 사용하지 않는다. 매장 화면은 디바이스마다 현재 템플릿 캡처1장만 유지하며 전환 중에만 이전 캡처를 남겨 기존0.6초 교차 페이드를 보존한다. 각 프레임의 heroSeek 값으로 별도 미리보기 장바구니를 사용하며 고객 데이터/renderer 코드는 변경하지 않는다. 이는 확인된 동시 로딩·그래픽 부하를 줄이는 수정이며 실제 아이폰 프로세스 종료 원인을 로그로 확정한 것은 아니다.

드래그는28px 원 안의18px 양방향 화살표만 사용한다. QR 주문의 클릭 전에는 최소6초 좌표의 구간에서 원형 파동을3회 보여준 뒤 실행한다. QR 강조·파동·입력 커서도 스크롤 진행값에 묶여 멈추거나 역스크롤할 때 같은 위치를 유지/복원한다. 전화번호는 합성 예시01000000000을 실제 input에 한 자리씩 채우고 입력 문구의 측정 폭 끝에 커서를 표시한다. 뒤로가기/주문내역 탭의 자동 focus-visible 테두리만 해당 시연 iframe 안에서 숨기며 실제 주문 UI의 키보드 포커스는 보존한다. 참고는 https://cuberto.com/blog/cuberto-mouse-follower/ 와 공식 https://github.com/Cuberto/mouse-follower 이며 라이브러리 설치/코드 복사는 하지 않았다.

## 장면별 진행 표시와 문구 — 2026-11-19

오른쪽 세로 점과 한 개의 긴 진행 바를 제거하고 제목·본문 아래에 공통 media ProgressBar4개를 나란히 둔다. 이전 장면은100%, 현재 장면은 실제 스크롤 진행값, 이후 장면은0%이며 역스크롤도 같은 기준으로 되감는다. 각 막대의 공통 아이콘 버튼 클릭 영역으로 장면 시작에 이동하며 좌우/상하 방향키와 Home/End를 지원한다. 막대는 제목 교체 모션 바깥에 두어 장면 전환 때 함께 사라지지 않는다. 타이포·여백·색과 진행 바 높이는 기존 공통 역할과 토큰을 사용한다.

사용자 후속 수정에 따라 소제목은 천장형 디스플레이·카운터 태블릿·테이블 태블릿·QR 모바일 메뉴판으로 구분한다. 제목과 본문은 기능 목록 대신 각 장면에서 메뉴판을 어디에 두고 손님에게 어떻게 보여주는지 설명한다. 천장 화면에 띄우기, 카운터/테이블에 거치하기, 앉은 손님에게 태블릿 건네기, QR을 찍어 손님 휴대폰으로 열기의 네 방식이다. 기존 카메라와 시연 순서·스크롤 길이는 유지한다.

## 현행: 노트북 기준 구도·와이드 노출 제한 (2026-11-19 후속 승인)

사용자 최종 지시는 확장 사진의 **가장자리만** 자연스럽게 블러·페이드하는 것이다. 네 사진 모두 같은 외곽 효과를 사용하며, 특정 인물/신체 좌표를 가리거나 중앙을 비우던 v3 마스크는 제거한다. 좌우는 넓고 부드럽게, 위아래는 얼굴 노출을 막는 얕은 보험으로 처리한다. 와이드의 좌우 흐린 영역은 넓어져도 되며 사진을 가로로 늘리지 않는다.

원본 사진 경계에 항상 걸리던6%/3% 페이드는 제거한다. 손·목업·메뉴는 선명하게 보존하고, 완성 사진의 실제 끝에만 효과를 둔다. 일반 노트북 화면 전체는 완전 선명층 안에 있어야 한다. 위치 프레임의 내부 가림/클리핑은 없다. 현행 v8은 사용자가 전달한 Firefly2x JPG 네 장(4344×1448, v7 소스)을 축소 없이 각각 한 장씩 사용하며, 예전 원본 사각형이나 손가락 사진을 다시 합성하지 않는다. 확정 사진에서 화면 모서리를 측정하고 빈 화면 마스크는 HTML 메뉴에만 적용한다. 높이 기준16:10 카메라, 모바일 마지막 QR 장면의 승인된 하향 이동, 시연·입력·메모리 제한은 유지한다. 네 장면은 같은 화면 조건의 외곽 프로필을 공유한다. 일반 화면은 이전 효과를 유지하고, 와이드·초와이드는 picture의 실제 너비·비율 조건으로 더 강한 좌우 효과를 선택한다. 이번 최종 시각 검수는 AI가 와이드, 사용자가 노트북·모바일을 담당한다. 상세 기준은 [히어로 사진과 외곽 처리](hero-background-extension.md)를 따른다.

## 이전 구현 기록: 자동 재생·5개 장면 (2026-11-18, 폐기)

1. 매장: 참고 사진의 우드·스테인리스·아이보리 타일·자연광을 살린 카페. 3대 TV와 카운터 태블릿의 실제 템플릿 캡처가 2.2초 간격으로 함께 바뀐다.
2. 카운터: 실제 베이직 태블릿 렌더러를 합성한다. 메뉴 스크롤 후 실제 기간 할인 카운트다운을 표시하고 스크롤 후반에 해당 영역으로 확대한다.
3. 다이닝: 손님이 든 태블릿에서 실제 커버와 메뉴 페이지를 넘긴다. 호출 버튼·와인 문의 선택·요청 전송을 각각 충분히 보여준다.
4. QR: QR 포인트 → 광고 두 번 넘기기 → 광고 닫기 → 메뉴 끝까지 탐색 → 상품 담기 → 장바구니 → 예시 번호 입력 → 후불 미리보기 주문으로 이어진다. 휴대폰 호출 시연은 제거한다.
5. 모바일: 같은 휴대폰 iframe의 주문 완료 화면을 가까이 보여주며 마무리한다. 메뉴/광고/장바구니를 새로 불러오지 않는다.

각 장면은 독립된 0–100% 타임라인을 사용한다. 제목 아래 공통 진행 바·카메라·실제 메뉴 시연이 이 진행값을 함께 사용한다. 자동 재생 중에는 현재 장면의 시간에 맞춰 페이지 스크롤도 이동하며 100%에 도달하면 다음 장면의 0%부터 시작한다. 직접 스크롤하면 해당 장면 안의 위치를 재생 시간으로 변환하고, 위로 되돌리면 진행 바와 화면도 함께 되돌린다. 각 장면은 실제 메뉴 미리보기가 준비된 후8/26/36/50/6초 동안 재생한다. 첫 장면의 기존80svh를 유지하고 나머지는220/280/480/80svh를 배정한다. heroProgressAt/heroSceneAt이 자동 진행·점 선택·수동 스크롤을 같은 가중 구간으로 변환한다. 스테이지를 포함한 전체 높이는1240svh다. 마지막 장면은 완료 상태로 머물며 일반 본문으로 자동 이동하지 않는다.

HeroLiveMenu는 고정된 세 카탈로그 iframe을 처음부터 준비한다. 실제 폰트·렌더러와 보이는 이미지의 로딩을 확인하고 대표 슬라이드/광고를 첫 장으로 맞춘다. 일반 재생에서는 정지 캡처 fallback을 사용하지 않으며 모션 감소에서만 원본 캡처를 쓴다. 화면 밖 lazy 이미지는 준비 조건에서 제외하고 load 이벤트를 놓쳐도 문서를 관찰해 준비한다. 두 태블릿 시연은 실제820×512 viewport를 사용한다. 원본 렌더러/고객 데이터는 변경하지 않는다.

드래그/스와이프는 손+양방향 화살표 이동 모션을 쓰고 클릭에만 원형 파동을 쓴다. 각 native 실행 전에 최소900ms 제스처를 보여주고 실행 뒤 최소1100ms 머물러 빠른 스크롤에서도 연속 클릭이 한 프레임에 몰리지 않게 한다. 태블릿의 메뉴 탐색은4–13초, 할인 확대는14–22초이며 마지막4초 읽는 시간을 둔다. 다이닝 호출은15–21초, 와인 문의22–27초, 전송28–36초에 머문다. QR은 광고 넘기기6–14초·닫기15–19초·메뉴 탐색19–29초·담기/장바구니31–42초·주문44–50초로 이어진다.

기존 하단 장면 버튼·별도 일시정지·소개 건너뛰기는 제거한다. 다른 점을 누르면 해당 장면으로 바로 이동하고, 현재 점을 누르면 일시정지/재생한다. 마지막 점은 완료 후 다시 재생할 수 있다. 점에 마우스를 올리거나 키보드 포커스를 두면 자동 진행을 잠시 멈춘다. 방향키 위/아래와 Home/End로 장면을 선택할 수 있다. 직접 휠·터치·스크롤 키 입력은 자동 스크롤을 즉시 취소하고 마지막 입력 2.2초 후 이동한 재생 위치에서 자동 재생을 이어간다. 일시정지는 현재 진행값을 유지하며, 정지 상태에서도 직접 스크롤로 탐색할 수 있다. 숨긴 탭/화면 밖/열린 모달에서는 자동 스크롤하지 않는다. OS reduced-motion에서는 자동 시연·자동 스크롤·물결·부드러운 카메라 이동 없이 원본 캡처와 직접 장면 선택으로 볼 수 있다.

모바일·좁은 태블릿 구도는 공통 gutter 안에 기기 전체가 들어오는 별도 카메라 배율과 실제 820×512 태블릿 미리보기를 사용한다. 모든 장면의 제목과 설명은 PC·태블릿·모바일 모두 왼쪽 하단에 둔다. 문구의 실제 높이를 관찰해 휴대폰 카메라의 상단 공간과 배율을 맞추고 하단 문구 공간을 확보한다. 모바일 문구 폭은 공통 고객지원 버튼의 자리도 피한다. 사용자 요청(2026-11-18 추가 수정)에 따라 첫 제목도 모든 장면과 같은 `type-section-title` 역할을 사용한다. 첫 장면은 의미상 h1, 나머지는 h2이며 기존 홈페이지용 큰 hero 역할 자체는 공통 스타일 시스템에 보존한다. 마지막 메뉴판 고르기 CTA는 제거한다.

## 오브테이블 초기 커버 표시 — 2026-11-19

오브테이블·메종 마레의 기존 스타일 값을 `DiningAubeTableA.css` 정적 스타일시트로 옮겨 첫 서버 화면부터 적용한다. CSS-in-JS가 초기화되기 전에 원본 커버 사진만 크게 노출되는 구간을 제거하며 커버 데이터·색·불투명도·레이아웃은 유지한다. 홈의 다이닝 대기 이미지는 현재 커버의 820×512 실제 캡처인 `screen-dining-v2.webp`를 사용한다. 사진만 담긴 이전 캡처는 더 이상 대기 화면에 쓰지 않는다.

## 화면 원본과 분리 경계

- `public/assets/hero-cafe-v1/screen-*.webp`는 기존 공개 카탈로그의 실제 렌더러를 CUA 브라우저로 캡처한 화면이다. 새 서비스 UI를 그리지 않는다.
- 실제 시연은 `/templates/{templateKey}/preview?view=actual&embedded=1&heroDemo=1`에만 연결한다. 베이직/다이닝/모바일 렌더러 소스와 고객 데이터는 변경하지 않는다.
- heroDemo는 이 카탈로그 미리보기의 주문 설정을 `previewOnly=true`로 고정하고 매 로드에 일회성 `hero-demo-UUID` 장바구니 범위를 부여한다. 일반 카탈로그 시험 장바구니와 고객 장바구니를 건드리지 않는다. 주문/호출은 기존 previewOnly 분기에서만 모의 처리한다. 예시 전화번호는 01000000000이다. DB·결제·실제 접수 API 쓰기는 없다.
- CSS projective matrix는 원본 1536×1024 사진의 네 화면 모서리에 실제 렌더러를 맞춘다. 화면 내용과 기기/손 사진의 이동은 함께 적용된다. 사람과 손 자체를 영상처럼 움직였다고 표현하지 않는다.
- 첫 장면 카운터의 작은 태블릿은 실제 화면 안쪽 네 모서리까지 합성 영역을 넓혔다. 휴대폰은 투영 사각형과 별개로 원본 사진의 둥근 화면 외곽선을 1536×1024 좌표의 곡선 마스크로 클리핑한다. QR 강조는 0.4초 대기 후 0.75초씩 두 번만 재생하고 사라진다.
- 카운터 사진의 손가락은 동일한 원본 사진에서 곡선 CSS 마스크로 앞쪽에 다시 합성한다. 화면을 가리는 배경 조각이 포함되지 않도록 손끝과 손톱 경계를 따른다. 별도 손 사진은 사용하지 않는다.
- 자동 내부 시연과 데이터 카운트다운은 분리한다. 일시정지는 제스처/자동 조작/템플릿 전환을 멈춘다. 실제 메뉴 렌더러 자체의 남은 시간은 시계 데이터로 계속 표시될 수 있다.

## 생성 자산과 최종 프롬프트 세트

도구: 기본 내장 `image_gen` 사용. 참고 사진은 분위기용이며 원본 사진을 그대로 게시하거나 워터마크를 지우지 않았다. 생성 원본 PNG는 Codex generated_images에 보존하고 프로젝트용 WebP 4개를 아래 경로에 저장했다. 최종 프롬프트 구성은 다음과 같다.

공통: `Use case: ads-marketing. ONE photorealistic landscape 3:2 commercial cafe photo, 1536x1024. Reddish-brown burl wood, terracotta shelving, brushed stainless counters, ivory narrow grid tile floors, chrome tubular furniture, cream upholstery, soft natural daylight. Warm neutral grading without yellow filter. No text, logos, watermarks or generated menu UI. Every device screen is blank pale gray with crisp unobstructed corners, to receive real HTML product UI later.`

- `venue.webp`: 참고 7번·8번 사진을 재료와 조명에만 사용. 새 매장, 사람 없음. 왼쪽 1/3은 문구를 얹을 조용한 실제 실내 공간. 오른쪽 카운터 위에 얇은 검정 16:9 TV 정확히 3대, 짧은 천장 폴과 벽 사이 여유. 앞쪽 은색 스탠드 위 가로 태블릿. 벽 매립 패널이나 비디오월 금지. 절제된 브런치 식기와 가구, 선명한 건축 사진 질감.
- `counter.webp`: 생성 venue를 같은 공간 참고로 사용. 카운터 태블릿을 크게 잡은 근접 사진. 오른쪽 중앙의 가로 검정 태블릿과 은색 스탠드, 거의 정면의 비어 있는 화면. 오른쪽 아래로 남색 소매의 여성 오른손, 검지는 오른쪽 아래 베젤 가까이에 두고 화면을 가리지 않음. 배경은 같은 선반·TV의 자연스러운 흐림, 얼굴 없음.
- `dining.webp`: 생성 venue를 공간 참고로 사용. 남성 손님의 왼쪽 뒤에서 테이블을 내려다봄. 쇄골 아래만, 얼굴·턱·반사상 없음. 차콜 니트, 손님 왼손이 가로 태블릿의 바깥 베젤을 잡고 하단을 우드 테이블에 가볍게 지지. 오른손은 옆에 쉬고 화면을 가리지 않음. 검정 셔츠/앞치마 직원의 물러나는 손은 오른쪽 위 끝에만 표시. 같은 카페와 브런치 소품, 빈 화면 네 모서리 보존.
- `phone.webp`: 생성 venue/dining을 공간 참고로 사용. 남색 긴소매 여성의 어깨 뒤에서 내려다보되 쇄골 아래만. 왼손이 검정 세로 휴대폰을 들고 전면 화면이 손님과 카메라 쪽을 향함. 후면 렌즈는 보이지 않음. 화면 모서리와 기기 전체를 보존하고 손가락은 바깥에만. 테이블 위 폰 너머 왼쪽 위에 글자 없는 QR 스티커. 오른손은 옆에 쉬며 휴대폰을 뒤집거나 셀카 자세로 만들지 않음.

## 검증 기록

- `lib/hero-cafe-motion.test.ts`: 스크롤 경계/역방향, 모든 기기의 projective 모서리 일치, 퇴화 기하 거부, 실제 카탈로그·일회성 previewOnly 범위, 첫 장면의3종 비순환 전환, 클릭 전 대기·반복 파동, 전화번호 한 자리씩 정/역입력 확인.
- 공통 사이트 UI 검사와 TypeScript/변경 파일 ESLint, 실제 브라우저의 PC·태블릿·모바일 시연을 검증한다. 검수 결과와 검토 배포는 PR에 기록한다.

## 2026-11-18 테이블 가장자리 교정

내장 `image_gen` 편집으로 QR 뒤쪽으로 둥글게 부풀었던 테이블의 먼 가장자리만 직선 원근으로 교정했다. 최종 프로젝트 자산은 `public/assets/hero-cafe-v1/phone-v2.webp`이며 기존 `phone.webp`와 생성 원본 PNG를 보존한다. 휴대폰·손·카메라 구도를 유지한 편집본에 맞춰 화면 투영과 곡선 마스크를 다시 맞췄다.

최종 프롬프트(내장 도구, 편집 대상은 기존 `phone.webp`):

```text
Use case: precise-object-edit. Edit target: the attached cafe phone photograph. Make ONE extremely local correction only: the far/back edge of the reddish burl-wood rectangular tabletop currently has an unnatural rounded bulge behind the QR sticker (near x=620..840,y=235..300 in the 1536x1024 input). Straighten this far tabletop edge into a single physically straight perspective line, running from the visible far-left edge near the coffee cup (approximately x=275,y=260), behind the phone, toward the far-right visible edge near x=1536,y=400. Remove only the bulging wedge of tabletop above that straight line, reconstructing the cafe chair/background in that narrow region naturally. Keep the QR sticker in its exact current position on the table, flat and fully on the tabletop. Absolutely preserve camera position, image composition, crop and 1536x1024 aspect/resolution. Preserve the phone and its blank pale-gray screen pixel geometry, every bezel edge, rounded screen corner and device location; preserve both hands and fingers, the QR sticker and QR pattern, cup, food, all remaining wood grain, colors and lighting. Do not add any screen UI or text, new objects, symbols, logos, watermarks. Keep this same photograph, not a new scene. Return the full edited photograph with only that tabletop edge repaired.
```

## 2026-11-18 진행 표시·투명 헤더·사진 추가 보정

- 오른쪽은 6px 흰색 점과 선택 명도만 표시한다. 공통 compact 32px 클릭 영역을 사용하고 점 중심 간격은 32px이다. 공통 버튼의 클릭/키보드/정지·재생 기능은 보존한다. 제목 설명 아래 공통 `ProgressBar appearance="media"`는 현재 장면의 재생 진행률을 표시한다.
- 홈에서만 사진이 헤더 뒤를 채우며 5개 장면 전체의 실제 아래 경계에서 투명 헤더가 기존 흰색으로 바뀐다. 본문·다른 경로·다이닝의 기존 헤더는 독립적이다.
- 모바일 첫 장면에도 사진 상단 14% 구간의 페이드를 적용해 흐린 배경과 선명한 사진 사이 수평 절단선을 없앤다.
- 모바일 QR 장면은 스티커와 휴대폰이 함께 보이는 overview 배율을 사용하고 다음 모바일 장면에서 다시 가까워진다.
- QR 스티커를 테이블 안쪽으로 옮기고 먼 가장자리를 다시 직선으로 교정했다. 새 최종 자산은 `public/assets/hero-cafe-v1/phone-v3.webp`, 도구는 내장 `image_gen` 편집이다. 앞선 원본과 v2는 보존한다.

최종 추가 편집 프롬프트:

```text
Use case: precise-object-edit. EDIT the supplied 1536x1024 cafe photograph; keep this exact image, camera/crop, lighting, people, phone and environment. Make only two targeted edits. (1) Move the same QR sticker slightly inward onto the tabletop, approximately 25 pixels LEFT and 60 pixels DOWN toward the viewer: its current center is about (715,345), the new center should be about (690,405). Keep its size and natural flat perspective; do not duplicate it. Reconstruct the small old sticker location with matching continuous burl wood. Leave a comfortable visible tabletop margin between the sticker and the far edge; keep it clear of the fingers. (2) The FAR/BACK edge of the rectangular tabletop must be an absolutely ruler-straight perspective line. It is still subtly bowed in the input. Precisely align every visible segment to one mathematical line from (300,270) to (1535,407). Continue the same collinear edge behind the phone/foreground occlusions. No convex bulge, sag, concave dip, local wobble, rounded corner near QR, lens distortion or curved seam. The room stays above that line and burl tabletop below; naturally reconstruct only the narrow strip needed. Preserve cup/plate/food/vase and all hands even where they occlude that edge. Do not add a drawn guide line or contrasting stroke. CRITICAL invariants: keep the phone silhouette, rounded pale-gray BLANK screen, all four screen boundaries, both hands and exact device position pixel-aligned to the input because HTML will be projected on it. Keep everything outside these two small edit regions unchanged. Do not invent UI, text, logos, watermarks, extra stickers or objects. Full image, same 1536x1024 framing.
```

## 2026-11-18 장면별 재생 진행과 작은 점 보정

사용자 정정에 따라 전체 hero를 합친 게이지는 사용하지 않는다. 각 장면의 0–100% 재생값을 0.1% 단위로 표시한다. `heroSceneAt`은 전체 스크롤 위치를 현재 장면·진행률·해당 장면의 재생 밀리초로 변환한다. 자동 재생, 바, 카메라와 실제 미리보기 시연은 같은 장면 시계를 따른다. 점 선택은 선택한 장면의 0%에서 시작하고 마지막 장면은 100%에서 머문다. 자동 재생 중의 스크롤 이벤트를 수동 탐색으로 다시 해석하지 않는다.

수동 스크롤은 장면 안의 재생 위치를 바꾸고, 마지막 입력 2.2초 후 그 위치부터 이어간다. 역방향 탐색은 제스처가 멈춘 뒤 일회성 미리보기를 다시 준비하여 해당 시점까지의 페이지·팝업·장바구니 상태를 순서대로 복원한다. 메뉴 시연의 독립 타이머는 제거하며 실제 UI 반영을 위해 한 tick에 한 동작만 적용한다. 실제 할인 카운트다운의 시계 데이터는 이 시연 타임라인과 별도다.

점은 8px에서 6px로 줄이고 공통 compact 클릭 영역을 적용해 중심 간격을 44px에서 32px로 좁혔다. 검토 배포 툴바를 피하려고 두었던 추가 오른쪽 16px 여백을 제거했다. Vercel Toolbar는 사이트 UI가 아니며 운영 사이트 일반 방문자 화면을 별도로 확인한다.
