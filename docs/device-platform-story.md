# 아티메뉴 기기·템플릿 이미지 스크롤 섹션

홈의 두 번째 소개 구간과 홈페이지 타이틀 등장 모션을 설명한다. 카페 hero는 현재4개 장면이며 [별도 문서](cafe-hero-motion.md)를 따른다. 기기/서비스 프레임은 운영 배포되었고, 2026-11-19 후속 요청으로 서비스 소개 주소를 메인 프레임 앵커로 통합한다. 현재 탐색 기준은 [메인·서비스 소개 통합](site-page-layout-contract.md#메인서비스-소개-통합-2026-11-19-현행)이며 실제 고객 메뉴판 렌더러는 독립적이다.

## 현재 구도와 모션

2026-11-19 사용자가 승인한 grounded 시안을 적용한다. 기존 정면 PC 모니터·가로 태블릿·세로 휴대폰의 **물리적 하단이 모니터 받침대와 같은 바닥에 닿도록** 배치하고, 접지/확산 그림자도 그 바닥에 맞춘다. 화면 중심 높이를 맞춰 작은 기기를 띄우지 않는다. 기기 원본 비율·정면 시점·화면 네 모서리는 유지한다. 순백 배경을 유지하며 노트북·액세서리·계단 바닥은 추가하지 않는다.

세 기기는 처음부터 함께 보이며,350svh 구간의 실제 스크롤에 맞춰 REAL MATCHA → MELLOW → MELLO CREMA → ROSY ORANGE의 정지 캡처가 세 화면에서 동시에 바뀐다. 자동 재생·타이머가 없고 역스크롤도 같은 위치를 따른다. 기존48%의 제목/설명 전환과 앞뒤 hero·서비스 덮임 흐름은 유지한다. 두 문구의 최대 높이를 미리 측정해 문구 교체로 기기 배치가 움직이지 않게 한다. 모션 감소에서는 긴 고정 구간 없이 첫 캡처의 완성 장면을 일반 흐름으로 보여준다. 이전250svh 순차 기기 등장 방식은 이 승인으로 대체한다.

뒤의 썸네일은 같은 템플릿의 태블릿 캡처를 사용한다. 가운데는 멀고 작게, 양옆은 가깝고 크게 보이는 오목한 곡선 위에서 스크롤에 따라 이동한다. 썸네일 내용에만 은은한 블러·매트한 종이 질감·얇은 가장자리를 적용한다. 앞의 기기 사진과 메뉴판 캡처에는 이 효과를 적용하지 않는다. 모든 화면/썸네일은 로컬 WebP이며 실제 메뉴판·iframe·주문/호출·고객 데이터 요청은 사용하지 않는다. 캡처 안의 카운트다운도 정지 이미지다.

후속 PC 구도 조정(2026-11-19):1024px 이상에서만 썸네일 기준 너비를236→290px로 키운다. 이어진 사용자 피드백에 따라 뒤 썸네일의 곡선 중심선을 모니터 화면의 세로 중앙 높이까지 내린다. 실제 화면에는 전체 아트워크 배율을 적용한다.1024px 미만의 썸네일 크기와 모든 기기의 크기·하단·그림자·전환 시점은 유지한다.

후속 기기 간격 조정(2026-11-19): 태블릿과 휴대폰을 각각 중앙 모니터 쪽으로 아트워크 너비의 3%(1024px 미만은 2%) 당긴다. 휴대폰과 모니터가 떨어져 보인다는 추가 피드백에 따라 휴대폰은 최소 자기 너비의 18%가 모니터 오른쪽과 겹치도록 더 당기며, 이미 더 겹치는 좁은 화면의 위치는 유지한다. 기존 fit 배율 계산 후 가로 위치만 옮겨 기기 크기·하단·그림자 크기와 스크롤 전환을 유지한다.

중앙 타이틀·설명은 최신 공통 type-section-title/type-body-lg와 site-stack-title, --site-page-intro-content-gap을 따른다. 별도 서체·크기·간격 예외를 만들지 않는다. 실제 문구와 공통 gutter 아래에 전체 아트워크를 균일 배율로 맞추고, 원본 사진의1.25배를 넘지 않는다. 스크롤 중 기기 배치·크기·바닥은 고정되며 화면 이미지와 뒤 썸네일만 바뀐다.

홈의 일반 섹션 및 두 번째 구간 타이틀은 MarketingCopyReveal로 스크롤 진입에 따라 투명도와 작은 수직 등장만 적용한다. 기존 문서 흐름·타이포그래피·간격은 유지하며 역스크롤도 같은 진입값을 따른다. 첫 hero의 타이틀은 장면이 바뀔 때 같은 절제된 페이드/상향 등장으로 교체한다. 모션 감소 설정에서는 모든 문구가 즉시 보인다.

## 이어지는 서비스 프레임

기기 구간 바로 다음에 ServiceStackStory를 배치한다. 베이직(#101111) → 다이닝(#351c26) → 디스플레이(#101f35)의 불투명한 세 면이 뷰포트 위 끝에 sticky로 고정되고, 다음 면이 아래에서 올라와 앞면을 덮는다. 면색은 고정 헤더 뒤까지 채우며 실제 콘텐츠는 헤더 높이+공통 섹션 여백 아래에 둔다. 추가 타이머나 자동 스크롤 없이 실제 스크롤과 역스크롤을 그대로 따른다. 모션 감소 또는 높이650px 이하에서는 일반 문서 흐름으로 전환한다.

메인 페이지의 첫 hero 및 서비스 스택에 한해 헤더는 투명·흰 로고/메뉴를 사용한다. 서비스 스택 위 끝이 뷰포트 위 끝에 도달하면 투명으로 전환하고, 스택의 마지막 경계가 헤더 아래 끝을 지나면 기본 흰 헤더/진한 글자로 복원한다. 위로 돌아가는 경우도 같은 경계를 따른다. 기기 구간과 다른 페이지의 헤더는 기존 동작을 유지한다. 범위 판단은 lib/site-header-policy.ts, 관찰은 useHomeHeroHeader가 소유한다.

내부는 사용자 콘티 작업 전의 기본 틀이다. 서비스 소개/실제 메뉴판 이미지 아래에 기존 서비스 페이지의 기능 설명을 베이직8개·다이닝8개·디스플레이4개 그대로 넣는다. lib/marketing-service-features.ts가 제목/설명의 단일 원본이며 기존 서비스 페이지도 같은 데이터를 사용한다. 소개는 PC 좌우·태블릿/모바일 위아래, 기능 목록은 PC/태블릿2열·모바일1열이다. ServiceStackPanel은 실제 전체 높이를 관찰해 긴 본문을 끝까지 읽은 뒤 마지막 화면이 고정되고 다음 면이 덮도록 한다. 추가 CTA·장식 모션은 넣지 않는다. 공통 타이포그래피/간격 토큰과 기존 서비스 경로/GNB는 유지하며 페이지 통합은 아직 수행하지 않는다.

베이직은 기존 REAL MATCHA 캡처다. 다이닝은 공개 dining_aube_table_a/preview의 Signature Course, 디스플레이는 display_menu_a/preview의 전체 메뉴 페이지를 CUA에서 각각1280×800/1280×720으로 캡처했다. public/assets/service-stack-v1/에는 두 WebP만 저장한다. 생성 메뉴 UI나 가짜 문구는 사용하지 않으며 실제 고객 데이터·주문·호출/API 쓰기는 없다.

## 기기 메뉴판 캡처

REAL MATCHA는 기존 공개 카탈로그의 실제 캡처를 재사용한다. 추가 세 디자인도 공개 카탈로그의 실제 PC1280×722·태블릿1024×697·모바일390×746 화면을 캡처했으며, 메뉴 UI나 글자는 생성하지 않았다. 실제 고객 콘텐츠·렌더러 코드는 변경하지 않는다. 휴대폰 노치와 기본 여유 공간은 기기 사진에 남기고 실제 웹 캡처만 그 사이에 넣는다.

추가 파일은 public/assets/device-template-scroll-v1/의 mellow/crema/rosy × monitor/tablet/phone9개다. 승인 시안에 사용한 WebP를 그대로 복사한다. PC 이미지는1000×564, 태블릿800×545, 모바일360×689이며 화면 투영 기준은 원래 캡처 뷰포트 크기를 유지한다. 촬영 시각은2026-11-19T09:32:53Z다. 원본 주소는 아래 REAL MATCHA 주소의 템플릿 키를 각각 cafe_mocha_forest_a / cafe_sunday_line_a / cafe_round_focus_a로 바꾸고 device=pc/tablet/mobile을 사용한다.

캡처 원본: https://tablescene-menu-site2.vercel.app/templates/cafe_real_matcha_a/preview?view=actual&embedded=1&heroDemo=1&device=pc (tablet/mobile는 device만 변경). 브라우저/사이트 헤더·Vercel Toolbar가 없는 메뉴 캡처다. 주문·호출·DB/API 쓰기는 없다.

## 에셋과 생성 방식

저장 경로: public/assets/device-platform-v2/

| 파일 | 크기 | 출처 |
| --- | --- | --- |
| monitor.webp | 1374×1145, alpha | 첨부 참고의 뒤쪽 모니터를 내장 image_gen으로 분리·복원 |
| tablet.webp | 1448×1086, alpha | 참고의 왼쪽 가로 태블릿을 내장 image_gen으로 분리·복원 |
| phone.webp | 887×1774, alpha | 참고의 가운데 휴대폰을 내장 image_gen으로 분리·복원 |
| menu-monitor.webp | 1280×722 | 실제 공개 카탈로그 PC 캡처 |
| menu-tablet.webp | 1024×697 | 같은 카탈로그 태블릿 캡처 |
| menu-phone.webp | 390×746 | 같은 카탈로그 모바일 캡처 |

참고/편집 소스는 사용자가 첨부한 fa56724e0001ea7ddd781564cd2fda5f.jpg다. 기본 내장 image_gen을 사용했고 CLI/API 우회는 사용하지 않았다. 생성 PNG 원본은 Codex generated_images에 보존하고 프로젝트 소비용 WebP는 alpha를 보존해 변환했다. 이전 바닥 구도의 미사용 v1 자산은 소비 경로에서 정리했다.

lib/device-platform-story.ts가 기기 alpha 경계·화면 네 모서리·정지 캡처 목록·공통 바닥·반응형 아트워크 fit·곡선 경로·동시 전환을 소유한다. 기기 사진 자체는 왜곡하지 않으며 화면만 원래 픽셀 좌표에 맞춘다. CSS3D는 뒤의 종이 썸네일에만 적용한다.

## 최종 프롬프트

### monitor

```text
Use case: precise-object-edit / background-extraction. Asset type: photorealistic transparent desktop monitor cutout for a website. Image 1 is the reference/edit source: isolate ONLY the large silver desktop monitor at the back, NOT the laptop. Reconstruct its complete unoccluded device, preserving the straight-on front view, perfectly level 16:9 display, very thin black bezels, brushed silver central support and slim rectangular silver foot. Restore the lower-right bezel hidden by the laptop. The full display and stand must be visible. Replace all website content with a completely uniform pure-white blank screen; no UI, text or reflections across the screen. Clean, sharp premium product photography with soft neutral studio light from upper left, subtle realistic metal highlights. Center one monitor filling a roughly 1536x1280 canvas with small transparent padding. No other devices, keyboard, laptop, accessories, wall, tabletop, scenery, logos, writing, watermark or cast floor shadow. The camera is at screen center: no isometric angle, no yaw, no tilted horizontal edges. Actual transparent RGBA background with fine antialiased cutout edges, not white or checkerboard.
```

### tablet

```text
Use case: precise-object-edit / background-extraction. Asset type: photorealistic transparent tablet cutout for a website. Image 1 is the reference/edit source: isolate ONLY the small black LANDSCAPE tablet at the lower left. Restore it sharply at high resolution, preserving its straight-on front view, level horizontal display, rounded slim black frame and realistic glass/metal edge. One complete tablet, upright resting on its bottom edge, the entire device visible without cropping. Replace all website content with a uniform pure-white blank display, no UI, text, glare or reflections on the display. Soft neutral studio lighting from upper left, matching the monitor in the source but without the warm wall color cast. Center the device with small transparent padding on an approximately 1600x1200 canvas. No monitor, laptop, phone, accessories, people, floor, wall, background, logos, writing, watermark or cast floor shadow. No perspective skew, no isometric view, no tilted edges. Actual transparent RGBA background with crisp antialiased edge alpha, not white or checkerboard.
```

### phone

```text
Use case: precise-object-edit / background-extraction. Asset type: photorealistic transparent smartphone cutout for a website. Image 1 is the reference/edit source: isolate ONLY the small black PORTRAIT phone near the bottom center, between the monitor and laptop. Reconstruct a sharp complete modern black phone in the same straight-on frontal upright view, preserving its slim rounded frame and small top screen notch. The camera is centered exactly in front: vertical sides parallel and no isometric tilt. Keep the full device visible. The display is completely uniform pure white, with the original small black top notch retained; no UI, wallpaper, writing, status icons or display glare. Soft neutral studio lighting from upper left and realistic glass/metal edge highlights. Center one phone with small transparent padding on an approximately 1024x2048 canvas. No other devices, hand, stand, cable, room, floor, wall, logos, text, watermark or cast floor shadow. Actual transparent RGBA background with clean antialiased edges, not white or checkerboard.
```

## 검증

- scripts/qa-device-platform.mjs로 네 템플릿의 세 화면 동시 전환·역방향·모션 감소·정지 이미지 전용 경계를 확인한다.
- 실제 캡처 비율·화면 네 모서리·원본 기기 비율, 세 기기의 동시 가시성과 승인된 전후 배치·겹침을 테스트한다.
- ESLint·TypeScript·공통 사이트 UI·첫 hero 회귀 검사와 diff 검사를 수행한다.
- PC·태블릿·모바일에서 실제 기기 하단·접지 그림자의 공통 바닥, 고정 transform, 곡선의 원근·블러·종이 질감, 문구 교체와 다음 서비스 진입 시 안정성, 가로 넘침을 실제 브라우저에서 확인한다.
