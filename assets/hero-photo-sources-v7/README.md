# 메인 히어로 업스케일 사진 —2026-11-19 현행

사용자가 기존 최종 사진4장을 Firefly Upscaler2x로 처리하여 전달했다. 네 JPG는 모두4344×1448(3:1)이며 전달 파일과 동일한 바이트로 보관한다.

| 파일 | 사용자 전달 파일 |
| --- | --- |
| venue.jpg | 01-venue Firefly Upscaler 2x 비율.jpg |
| counter.jpg | 02-counter-hand-v2 Firefly Upscaler 2x 비율.jpg |
| dining.jpg | 03-dining-server Firefly Upscaler 2x 비율.jpg |
| phone.jpg | re_04-phone-qr Firefly Upscaler 2x 비율.jpg |

입력 위치는 `/Users/hamco/Downloads/hero-upscale-sources/무제 폴더/`다. 정확한 전달 파일명과 SHA256은 `source-provenance.json`에 기록한다. 이전2172×724 소스는 v6에 보관하며 런타임에서 다시 합성하지 않는다.

에이전트는 사진 생성·접합·추가 업스케일을 하지 않는다. 배포 인코딩은 WebP95이고4344×1448 픽셀을 그대로 유지한다. SVG4608×1536은 논리 배치 좌표다. 확대 제안4배가 아니라 실제 전달된2배 파일임을 구분한다.

`scripts/measure-hero-screens.mjs`는 ROI를 실제 입력 해상도에 맞춰 환산하여 화면 모서리와 v7 HTML 전용 가림 마스크를 측정한다. `scripts/build-hero-surroundings.mjs`는 동일한 높이 기준 카메라와 반응형 외곽 프로필에 맞춘 `public/assets/hero-cafe-v8/` 자산을 만든다. 일반 화면의 외곽 프로필은 이전 v7과 동일하며 QR 사진은 최신 re_04로 교체하고 와이드·초와이드의 좌우 효과만 강화한다. 사진 자체에는 메뉴 화면이나 블러·페이드를 합치지 않는다.
