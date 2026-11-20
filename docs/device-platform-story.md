# 아티메뉴 홈 기기 전환 섹션

## 현행 구도와 스크롤

홈의 두 번째 섹션은 **PC 모니터 → 가로 태블릿 → 90° 돌아간 세로 태블릿 → 모바일** 순서로 화면 중앙에서 기기 한 대를 전환한다. 2026-11-20 승인 시안이 이전 세 기기·배경 썸네일 구도를 대체한다. 세로 스크롤로 양방향 진행한다. 하단 진행 막대와 기기 이름을 제거한 구도를 사용한다. 동작 줄이기 설정에서는 일반 문서 흐름에 PC 정지 화면을 표시한다.

같은 멜로크레마 메뉴의 실제 기기별 정지 캡처를 사용한다. 태블릿은 회전 중에 크기를 일정하게 유지한다. 두 화면이 페이드되는 동안 새 세로 레이아웃이 나타난다. 로컬 WebP를 사용하며 캡처에 블러를 적용하지 않는다. 실제 고객 메뉴판·데이터·주문·호출은 이 섹션의 범위 밖이다.

제목과 본문은 `type-section-title`, `type-body-lg`, `site-stack-title`을 사용한다. 영역의 콘텐츠는 기존 메인 최대 너비와 공통 gutter를 따른다. 헤더 아래에서 고정되는 단계와 상단 히어로 Skip의 `#device-platform` 앵커를 유지한다. 마지막 기기 장면이 끝나면 헤더는 투명 배경과 기존 진한 글자를 쓰고, 베이직 프레임이 상단에 닿으면 흰 글자로 전환한다. 서비스 프레임은 [마케팅 페이지 디자인 규칙](marketing-page-design-rules.md)을 따른다.

## 캡처와 검증

| 기기 | 로컬 파일 |
| --- | --- |
| PC | `device-template-scroll-v1/crema-monitor.webp` |
| 가로 태블릿 | `device-template-scroll-v1/crema-tablet.webp` |
| 세로 태블릿 | `device-template-scroll-v1/crema-tablet-portrait.webp` |
| 모바일 | `device-screen-correction-v1/crema-phone.webp` |

세로 태블릿은 공개 멜로크레마 템플릿 실제 보기(`cafe_sunday_line_a/preview?view=actual&embedded=1&heroDemo=1&device=tablet&orientation=portrait`)의 820×1180 캡처다. 받침대는 기존 1374×1145 정면 모니터 사진(`device-platform-v2/monitor.webp`)의 아래쪽을 사용한다. 기기 테두리는 같은 레이어에서 크기·모서리·회전 상태를 보간한다.

`lib/device-platform-story.ts`가 전환과 크기 계산을 담당한다. `scripts/qa-device-platform.mjs`로 네 단계와 중간 회전, 역스크롤, 하단 진행 UI 제거, 동작 줄이기, 화면 경계와 헤더 전환을 PC·태블릿·모바일에서 확인한다.

## 기존 이미지 제작 기록

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

### 생성 프롬프트

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
