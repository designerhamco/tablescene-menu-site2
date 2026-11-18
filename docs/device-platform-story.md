# 아티메뉴 정면 기기 스크롤 섹션

홈의 두 번째 소개 구간과 홈페이지 타이틀 등장 모션을 변경한다. 첫 카페 hero 5개 장면의 이미지/시연, 서비스 페이지, 실제 고객 메뉴판 렌더러 및 메인·서비스 페이지 통합은 변경하지 않는다. 디자인 검토용 Preview이며 Production 반영은 별도다.

## 현재 구도와 모션

흰색 공통 표면 위에 정면 PC 모니터를 뒤쪽 중앙에, 가로 태블릿과 세로 휴대폰을 앞쪽 좌우에 배치한다. PC에서는 전면 기기를 키워 모니터 화면의 아래 양 끝에 의도적으로 겹치며, 모바일의 기존 배치는 유지한다. 노트북·계단 바닥·추가 메뉴 면은 사용하지 않는다. 각 기기는 실제 원본 가로세로 비율과 정면 시점을 유지한다. 후속 사용자 요청으로 웜그레이 바닥은 제거하고 순백 배경 및 기기 밑면의 접지/확산 그림자만 유지한다.

175svh 구간 동안 장면은 공통 헤더 바로 아래 한 화면에 고정한다. 기존340svh보다 짧게 모니터 → 태블릿 → 휴대폰 순서로 투명도만 변한다. 줌·팬·기기 이동은 없다. 진행률48%에서 제목은 “웹 링크 하나로, 어디서든 자유롭게.”, 설명은 “화면이 크든 작든, 폴더블이든 걱정 없이 반응형 웹 기술로 자연스럽게 보여집니다.”로 전환된다. 역방향 스크롤도 같은 진행값을 따른다. 기기와 서비스 구간은 하나의 presentationSequence 안에 두며 검은 면이 올라오는 동안 기기/타이틀의 위치는 고정되어 완전히 가려진다. 모션 감소에서는 긴 고정 구간 없이 완성 장면을 보여준다.

중앙 타이틀은 type-section-title(모바일24 / 태블릿32 / PC36px 및 공통 와이드 보정), 제목·설명은 site-stack-title(12px), 내용 경계는 --site-page-intro-content-gap을 사용한다. PC 상단은 --site-page-heading-top으로 줄이고, 이미지 묶음의 하부 여유 공간을 확보해 상하 균형을 맞춘다. 모바일/태블릿의 --site-section-space와 기존 기기 배치는 유지한다. 타이틀 실제 높이와 공통 좌우 gutter를 측정해 기기 전체가 그 아래에 들어오도록 한다. PC/와이드에서는 원본 해상도 안의 최대1.25배까지 허용하고 뷰포트 가로/세로 여유 중 작은 값으로 제한한다. 스크롤 중 배치/크기는 바뀌지 않으며 ‘더 많은 디자인 보기’ 버튼은 제거했다.

홈의 일반 섹션 및 두 번째 구간 타이틀은 MarketingCopyReveal로 스크롤 진입에 따라 투명도와 작은 수직 등장만 적용한다. 기존 문서 흐름·타이포그래피·간격은 유지하며 역스크롤도 같은 진입값을 따른다. 첫 hero의 타이틀은 장면이 바뀔 때 같은 절제된 페이드/상향 등장으로 교체한다. 모션 감소 설정에서는 모든 문구가 즉시 보인다.

## 이어지는 서비스 프레임

기기 구간 바로 다음에 ServiceStackStory를 배치한다. 베이직(#101111) → 다이닝(#351c26) → 디스플레이(#101f35)의 불투명한 세 면이 뷰포트 위 끝에 sticky로 고정되고, 다음 면이 아래에서 올라와 앞면을 덮는다. 면색은 고정 헤더 뒤까지 채우며 실제 콘텐츠는 헤더 높이+공통 섹션 여백 아래에 둔다. 추가 타이머나 자동 스크롤 없이 실제 스크롤과 역스크롤을 그대로 따른다. 모션 감소 또는 높이650px 이하에서는 일반 문서 흐름으로 전환한다.

메인 페이지의 첫 hero 및 서비스 스택에 한해 헤더는 투명·흰 로고/메뉴를 사용한다. 서비스 스택 위 끝이 뷰포트 위 끝에 도달하면 투명으로 전환하고, 스택의 마지막 경계가 헤더 아래 끝을 지나면 기본 흰 헤더/진한 글자로 복원한다. 위로 돌아가는 경우도 같은 경계를 따른다. 기기 구간과 다른 페이지의 헤더는 기존 동작을 유지한다. 범위 판단은 lib/site-header-policy.ts, 관찰은 useHomeHeroHeader가 소유한다.

내부는 사용자 콘티 작업 전의 기본 틀이다. 서비스 소개/실제 메뉴판 이미지 아래에 기존 서비스 페이지의 기능 설명을 베이직8개·다이닝8개·디스플레이4개 그대로 넣는다. lib/marketing-service-features.ts가 제목/설명의 단일 원본이며 기존 서비스 페이지도 같은 데이터를 사용한다. 소개는 PC 좌우·태블릿/모바일 위아래, 기능 목록은 PC/태블릿2열·모바일1열이다. ServiceStackPanel은 실제 전체 높이를 관찰해 긴 본문을 끝까지 읽은 뒤 마지막 화면이 고정되고 다음 면이 덮도록 한다. 추가 CTA·장식 모션은 넣지 않는다. 공통 타이포그래피/간격 토큰과 기존 서비스 경로/GNB는 유지하며 페이지 통합은 아직 수행하지 않는다.

베이직은 기존 REAL MATCHA 캡처다. 다이닝은 공개 dining_aube_table_a/preview의 Signature Course, 디스플레이는 display_menu_a/preview의 전체 메뉴 페이지를 CUA에서 각각1280×800/1280×720으로 캡처했다. public/assets/service-stack-v1/에는 두 WebP만 저장한다. 생성 메뉴 UI나 가짜 문구는 사용하지 않으며 실제 고객 데이터·주문·호출/API 쓰기는 없다.

## 기기 메뉴판 캡처

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
