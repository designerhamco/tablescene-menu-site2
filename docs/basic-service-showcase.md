# 아티메뉴 메인 베이직 기능 갤러리 — 2026-11-19 (현행)

## 레이아웃과 범위

베이직 검정 프레임은 제목·설명의 2열 도입과 바로 아래 가로 썸네일 갤러리를 사용한다. 모바일은 제목·설명을 위아래로 배치한다. 공통1600px 콘텐츠 컨테이너, 의미 타이포와 간격 토큰을 유지한다. PC는 약3.25개, 태블릿2.2개, 모바일은1개와 다음 카드 일부를 보여주어 가로 탐색을 드러낸다. 썸네일은 PC·태블릿16:10, 모바일4:3이다. 본문을 카드 외곽 박스로 감싸지 않고 미디어에만 공통 이미지 모서리를 적용한다.

`ServiceFeatureGallery`가 재사용 가능한 레이아웃·탐색·재생을 소유한다. `BasicServiceStory`는 기존 대표 상품·상품 이미지·가격 옵션·기간 할인·콘텐츠 위젯·광고·직원 호출·테이블 주문의8개 문구를 전달한다. 실제 주문·호출 연결과 선결제 준비 상태에 관한 기존 문구를 보존한다. 장식 소제목 `01 / ARTIMENU BASIC`과 기존의 긴 장면별 스크롤·태블릿 도입은 렌더하지 않는다. 다이닝·디스플레이 프레임의 구성·배경·헤더 전환은 이번에 변경하지 않는다.

## 탐색·모션·재생

공통 사이트 화살표와 media Button을 사용해 이전·다음 묶음으로 이동한다. 양 끝에서는 해당 버튼을 비활성화한다. 네이티브 가로 스크롤·터치 스와이프와 스냅을 지원하고, 목록 포커스에서 좌우/Home/End 키를 처리한다. 글자와 목록의 진입은 공통 `MarketingCopyReveal`의 스크롤 모션을 사용한다. 모션 감소 설정은 CSS에서 즉시 표시해 초기 SSR/클라이언트 상태 차이로 콘텐츠가 투명하게 남지 않도록 한다.

확대 팝업은 사용하지 않는다. 썸네일 전체가 공통 `MediaPlayback`의 단일 버튼이며 재생·일시 정지 상태를 접근성 이름과 aria-pressed로 전달한다. 처음에는 정지 화면을 보여주며 누른 미디어 하나만 재생한다. 다른 미디어 재생, 화살표 이동, 완전히 화면 밖으로 벗어남, 다음 프레임에 가려짐, 비활성 탭에서는 재생을 멈춘다. 스와이프는 버튼과 같은 영역에서 자연스럽게 동작한다. 모션 감소 환경에서도 자동 재생하지 않으며 코드 예시의 큰 이동은 정지하고 기간할인 카운트처럼 직접 시작한 정보 갱신은 유지한다.

현재8개 미디어는 기존 사진을 사용하는 교체 가능한 코드 예시(`ServiceFeatureDemo`)다. 실제 고객 메뉴판을 변경하거나 주문·호출 요청을 보내지 않는다. 확정된 짧은 MP4는 각 기능의 `media.poster`, `media.mp4`, 선택적인 `media.webm`에 연결한다. video는 muted·playsInline·preload=none을 사용하고 자동 재생하지 않는다. 종료·실패·정지 시 재생 상태를 정리하며 실패한 미디어에는 상태 안내를 표시한다. GIF와 별도의 자동 재생 또는 확대 기능은 추가하지 않는다.

## 검수

`FEATURE_GALLERY_QA_BASE=<server> node scripts/qa-service-feature-gallery.mjs`에서 PC·태블릿·모바일, 넓은 화면, 짧은 화면과 모션 감소 상태를 확인한다.8개 유지, 양끝 탐색, 키보드·스와이프, 단일 재생과 이탈/프레임 덮임 정지, 기간할인 카운트, 미디어 실패, 가로 넘침과 공통 콘텐츠 경계를 검증한다.

---

## 이전 제작 기록 (아래 스크롤 구성은 현행 갤러리로 대체됨)

# 아티메뉴 메인 베이직 프레임 목업 — 2026-11-19

## 현행 구성

베이직 프레임은 상단 중앙의 제목·본문과 하단 목업으로 시작한다. 후속 사용자 수정에 따라 장식 소제목 `01 / ARTIMENU BASIC`은 제거한다. 새 장면에도 이 소제목을 복원하지 않는다. 공통1600px 컨테이너·타이포·여백을 사용하며 다이닝/디스플레이의 기존 구성과 프레임 덮임/헤더 전환은 유지한다.

## 현행 스크롤 소개

`BasicServiceStory`는 한 화면에 고정된 채 실제 스크롤 위치로만 진행/역진행한다. 도입에서 제목과 태블릿이 순서대로 나타나고 완성된 목업을 잠시 보여준 뒤, 대표 상품 영역부터 테이블 주문까지8개 기능이 같은 좌표에서 교체된다. 각 기능은 기능명 제목과 기존 본문만 사용하고, PC/태블릿은 왼쪽 문구·오른쪽 소개 예시, 모바일은 위 문구·아래 예시로 배치한다. 오른쪽 예시는 기존 MarketingVisual이며 추후 제공될 이미지로 교체할 수 있다. 이전 하단8개 기능 목록은 중복 렌더하지 않는다.

도입 탐색 길이는160svh, 기능별120svh이며 짧은 교차 페이드 사이에는 완전히 보이는 구간을 둔다. 타이머로 장면을 진행하지 않으므로 멈춤/역스크롤은 같은 위치를 복원한다. 기존 뒤쪽 템플릿의 장식용 자동 슬라이드는 도입에서만 재생한다. 동작 줄이기 또는 높이650px 이하에서는 각 내용을 자연스러운 문서 흐름으로 모두 보여준다.

모바일 목업 너비/비율은 기존140cqw/150cqh를 유지한다. PC/태블릿만118cqw/186cqh로 확대하고, 배경·손 가장자리 페이드와 공통 컨테이너를 보존한다. 화면은 계속 비워둔다.

`BasicTemplateShowcase`는 별도 광원 → 오른쪽에서 왼쪽으로 흐르는 템플릿 → 투명한 태블릿/손 순으로 겹친다. 손과 태블릿 윤곽의 역광은 자산에 보존하고, 배경의 부드러운 광원은 CSS radial-gradient로 분리한다. 팔 끝의 반투명 알파와 장면 양끝/하단 페이드로 배경에 연결한다. 화면은 불투명한 빈 화면으로 유지한다. 실제 메뉴판 iframe·마스크·입력 면은 추가하지 않는다.

템플릿은 기존 공개 정적 캡처인 REAL MATCHA·ROSY ORANGE·LOOP BAGEL·SUNDAY ROASTERS·MOCHA FOREST를 사용한다. 같은 목록 두 개가100초 주기로 절반 너비만큼 이동해 반복된다. 화면 밖에서는 IntersectionObserver로 정지하고, prefers-reduced-motion에서는 정지 이미지를 보여준다. 장식용 슬라이드는 접근성 트리에서 제외하며 의미 있는 태블릿 대체 텍스트만 제공한다.

## 자산과 생성 방식

- 승인한 조명/구도 시안: `exec-4f692692-1cc2-4860-89b0-d1f15f6214ab.png`.
- 내장 image_gen의 투명 배경 편집으로 분리한 결과: `exec-6e3ecbfd-5813-45cc-857d-3fe92c6ca995.png`.
- 최종 프로젝트 자산: `public/assets/basic-showcase-v1/tablet-hands-cutout.png`,1536×1024 RGBA PNG. 배경 모서리와 빈 영역의 알파는0이며 화면 중심은253이다. PNG 확장자만으로 투명성을 가정하지 않고 실제 채널을 확인했다.
- 기존 승인 시안과 생성 원본은 덮어쓰지 않는다. API/CLI 이미지 생성이나 고객 메뉴판 변경은 하지 않았다.

## 최종 투명 분리 프롬프트

```text
Use case: background-extraction. Edit ONLY the supplied approved landscape tablet-in-two-hands mockup into a genuine RGBA transparent foreground asset for a layered website. Preserve the exact 1536x1024 canvas, all subject positions, scale, tablet clockwise tilt and perspective, blank off-white display, dark bezel, two hands, grips, natural skin details, shadow exposure and bright warm rim light. Do not regenerate or change the device, hands, anatomy, pose, display or cropping. Remove ALL of the charcoal studio background and broad background glow to real transparent alpha, including the open spaces between forearms and tablet. Keep the warm light that actually grazes the foreground device and skin. Retain the complete blank tablet screen as opaque off-white. Preserve dark foreground surfaces as foreground, not holes. Both forearm ends should fade with a broad smooth semitransparent alpha transition toward the lower-left and lower-right image edges; their dark endings must not leave an opaque black matte. Carefully antialias the silhouette without black/white fringes or a hard cutout. The entire background, all empty corners and all empty space must be fully transparent, not painted black or a checkerboard. No new objects, text, shadows, glows behind the subject, background, labels, branding or watermark. Output one same-size high-quality transparent PNG cutout.
```
