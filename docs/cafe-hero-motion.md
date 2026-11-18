# 아티메뉴 카페 hero 모션

2026-11-18 사용자 요청. 홈 첫 hero만 사진 기반 웹 시퀀스로 교체한다. 메인·베이직·다이닝·디스플레이의 페이지 통합은 hero 검토와 수정이 끝난 다음 작업이며 이번 변경에 포함하지 않는다.

## 장면과 진행

1. 매장: 참고 사진의 우드·스테인리스·아이보리 타일·자연광을 살린 카페. 3대 TV와 카운터 태블릿의 실제 템플릿 캡처가 2.2초 간격으로 함께 바뀐다.
2. 카운터: 실제 베이직 태블릿 렌더러를 합성한다. 메뉴 스크롤 후 실제 기간 할인 카운트다운을 표시하고 스크롤 후반에 해당 영역으로 확대한다.
3. 다이닝: 손님이 든 태블릿에서 실제 커버와 메뉴 페이지를 넘긴다. 이어 기존 호출 UI에서 주문 요청을 선택하고 미리보기로 접수한다.
4. QR: 같은 휴대폰/테이블 사진에서 QR 스티커를 물결로 강조한다. 실제 광고 팝업을 닫는 지점을 표시한다.
5. 모바일: 가까워진 휴대폰에서 광고 닫기, 메뉴 스크롤, 상품 담기, 장바구니, 예시 번호를 이용한 후불 미리보기 주문, 호출 시연이 이어진다. 별도 CTA 없이 마지막 장면에서 마무리한다.

큰 장면 전환·카메라는 페이지 스크롤에 연결한다. 화면 전체에 hero가 보일 때 오른쪽 세로 점의 원형 진행 링이 채워지면 다음 장면으로 부드럽게 스크롤한다. 각 장면은 실제 메뉴 미리보기가 준비된 후 8/12/15/5/30초 동안 재생한다. 마지막 장면은 완료 상태로 머물며 처음이나 일반 본문으로 자동 이동하지 않는다.

기존 하단 장면 버튼·별도 일시정지·소개 건너뛰기는 제거한다. 다른 점을 누르면 해당 장면으로 바로 이동하고, 현재 점을 누르면 일시정지/재생한다. 마지막 점은 완료 후 다시 재생할 수 있다. 점에 마우스를 올리거나 키보드 포커스를 두면 자동 진행을 잠시 멈춘다. 방향키 위/아래와 Home/End로 장면을 선택할 수 있다. 직접 휠·터치·스크롤 키 입력은 자동 스크롤을 즉시 취소하고 마지막 입력 2.2초 후 현재 장면의 진행 링을 다시 시작한다. 숨긴 탭/화면 밖/열린 모달에서는 자동 스크롤하지 않는다. OS reduced-motion에서는 자동 시연·자동 스크롤·물결·부드러운 카메라 이동 없이 원본 캡처와 직접 장면 선택으로 볼 수 있다.

모바일·좁은 태블릿 구도는 공통 gutter 안에 기기 전체가 들어오는 별도 카메라 배율과 실제 820×512 태블릿 미리보기를 사용한다. 모든 장면의 제목과 설명은 PC·태블릿·모바일 모두 왼쪽 하단에 둔다. 문구의 실제 높이를 관찰해 휴대폰 카메라의 상단 공간과 배율을 맞추고 하단 문구 공간을 확보한다. 모바일 문구 폭은 공통 고객지원 버튼의 자리도 피한다. 사용자 요청(2026-11-18 추가 수정)에 따라 첫 제목도 모든 장면과 같은 `type-section-title` 역할을 사용한다. 첫 장면은 의미상 h1, 나머지는 h2이며 기존 홈페이지용 큰 hero 역할 자체는 공통 스타일 시스템에 보존한다. 마지막 메뉴판 고르기 CTA는 제거한다.

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

- `lib/hero-cafe-motion.test.ts`: 스크롤 경계/역방향, 모든 기기의 projective 모서리 일치, 퇴화 기하 거부, 실제 카탈로그·일회성 previewOnly 범위, 장면 타이머의 종료/누적 상한/백그라운드 복귀 확인.
- 공통 사이트 UI 검사와 TypeScript/변경 파일 ESLint, 실제 브라우저의 PC·태블릿·모바일 시연을 검증한다. 검수 결과와 검토 배포는 PR에 기록한다.

## 2026-11-18 테이블 가장자리 교정

내장 `image_gen` 편집으로 QR 뒤쪽으로 둥글게 부풀었던 테이블의 먼 가장자리만 직선 원근으로 교정했다. 최종 프로젝트 자산은 `public/assets/hero-cafe-v1/phone-v2.webp`이며 기존 `phone.webp`와 생성 원본 PNG를 보존한다. 휴대폰·손·카메라 구도를 유지한 편집본에 맞춰 화면 투영과 곡선 마스크를 다시 맞췄다.

최종 프롬프트(내장 도구, 편집 대상은 기존 `phone.webp`):

```text
Use case: precise-object-edit. Edit target: the attached cafe phone photograph. Make ONE extremely local correction only: the far/back edge of the reddish burl-wood rectangular tabletop currently has an unnatural rounded bulge behind the QR sticker (near x=620..840,y=235..300 in the 1536x1024 input). Straighten this far tabletop edge into a single physically straight perspective line, running from the visible far-left edge near the coffee cup (approximately x=275,y=260), behind the phone, toward the far-right visible edge near x=1536,y=400. Remove only the bulging wedge of tabletop above that straight line, reconstructing the cafe chair/background in that narrow region naturally. Keep the QR sticker in its exact current position on the table, flat and fully on the tabletop. Absolutely preserve camera position, image composition, crop and 1536x1024 aspect/resolution. Preserve the phone and its blank pale-gray screen pixel geometry, every bezel edge, rounded screen corner and device location; preserve both hands and fingers, the QR sticker and QR pattern, cup, food, all remaining wood grain, colors and lighting. Do not add any screen UI or text, new objects, symbols, logos, watermarks. Keep this same photograph, not a new scene. Return the full edited photograph with only that tabletop edge repaired.
```
