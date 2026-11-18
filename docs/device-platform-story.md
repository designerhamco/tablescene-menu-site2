# 아티메뉴 정면 기기 스크롤 섹션

홈의 두 번째 소개 구간만 변경한다. 첫 카페 hero 5개 장면, 서비스 페이지, 실제 고객 메뉴판 렌더러 및 메인·서비스 페이지 통합은 변경하지 않는다. 디자인 검토용 Preview이며 Production 반영은 별도다.

## 현재 구도와 모션

흰색 공통 표면 위에 정면 PC 모니터를 뒤쪽 중앙에, 가로 태블릿과 세로 휴대폰을 앞쪽 좌우에 배치한다. 노트북·계단 바닥·추가 메뉴 면은 사용하지 않는다. 각 기기는 실제 원본 가로세로 비율과 정면 시점을 유지한다. 태블릿·휴대폰이 모니터의 메뉴 화면을 가리지 않고 받침대 앞에 놓이며, 기기 밑면에 접지/확산 그림자를 따로 합성한다.

340svh 구간 동안 장면은 공통 헤더 바로 아래 한 화면에 고정한다. 빈 장면에서 모니터 → 태블릿 → 휴대폰 순서로 투명도만 변한다. 줌·팬·기기 이동과 타이틀 뒤의 가림·블러는 없다. 역방향 스크롤은 같은 진행값으로 되돌아간다. 마지막 등장과 머무는 구간을 지난 뒤 다음 콘텐츠로 이동한다. 모션 감소에서는 긴 고정 구간과 등장 효과 없이 완성 장면을 보여준다.

중앙 타이틀은 type-section-title(모바일24 / 태블릿32 / PC36px 및 공통 와이드 보정), 상단은 --site-section-space, 제목·설명은 site-stack-title(12px), 내용 경계는 --site-page-intro-content-gap을 사용한다. 타이틀 실제 높이와 공통 좌우 gutter를 측정해 기기 전체가 그 아래에 들어오도록 한다. 1024px 미만에서는 모니터를 상대적으로 크게 보여주는 별도 고정 배치를 사용하며, 스크롤 중 배치/크기는 바뀌지 않는다. 기존 ‘더 많은 디자인 보기’ 목적지는 유지한다.

## 실제 메뉴판

모든 기기는 실제 공개 카탈로그 cafe_real_matcha_a / REAL MATCHA다. 생성 도구는 기기 외형만 만들며 메뉴 UI나 글자는 생성하지 않는다. 첫 번째 대표 슬라이드를 선택해 CUA 브라우저에서 각 화면 비율로 캡처했다. 모니터1280×722, 태블릿1024×697, 휴대폰390×746이며 반응형 렌더러의 실제 배치를 그대로 사용한다. 휴대폰의 노치와 위·아래 기본 여유 공간은 사진에 남기고 실제 웹 화면은 그 사이에 넣는다.

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

lib/device-platform-story.ts가 기기 원본의 몸체 alpha 경계, 실제 화면 네 모서리, 캡처 크기, 두 반응형 배치와 등장 구간을 소유한다. 기기 사진 자체에는 원근 변형을 주지 않으며 실제 화면만 픽셀 좌표에 맞춘다. 동일 source 레이어 안에서 사진과 화면이 함께 균일 배율로 그려진다.

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

- 세 종류만 사용하고 순차 등장·역방향·모션 감소를 확인한다.
- 실제 캡처 비율과 화면 네 모서리 일치, 원근 왜곡 없는 화면, 원본 기기 비율, 모든 기기의 동시 가시성, 전면 기기의 모니터 메뉴 비가림을 테스트한다.
- ESLint·TypeScript·공통 사이트 UI·첫 hero 회귀 검사와 diff 검사를 수행한다.
- PC·태블릿·모바일에서 빈 장면/등장/완성/역방향, 동일 transform, 흰 배경·정면 실루엣·그림자와 가로 넘침을 실제 브라우저에서 확인한다.
