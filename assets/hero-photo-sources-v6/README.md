# 메인 히어로 확정 사진 —2026-11-19

네 파일 모두2172×724(3:1). 사진 자체는 재보정·접합하지 않는다.

- `counter.jpg`: 사용자가 전달한 `/Users/hamco/Downloads/바꾼여자손2.jpg`의 동일한 복사본. SHA256 `94860c7bd2f74114a0f3edd898dc5c998001765a94e866db17d82865102b744e`.
- `dining.jpg`: 사용자가 전달한 `/Users/hamco/Downloads/서버있는접합.jpg`의 동일한 복사본. SHA256 `218ae3f687a7c0ee826bf6c9c23775c6f897e1e6e18aa659d343e81465c7e569`.
- `venue.png`: 기존 생성 결과 `exec-41ebc69a-72ba-44cd-84e8-143c9533e035.png`. 사용자가 복도·창·카운터·테이블의 기준으로 지정한 최초3:1 매장 전경. 이후 변형 전경으로 바꾸지 않는다.
- `phone.webp`: 기존 생성 결과 `exec-bf26a6a2-c0af-4342-aecb-8fa1948b0341.png`를 lossless WebP로 보관한 최신 QR 사진. 직선 복도·목재 문으로 교정된 버전이다.

위 생성 결과의 보관 위치는 `/Users/hamco/.codex/generated_images/01a167c6-74e7-7aa0-98f0-8f24c070c3f5/`다. 이번 작업에서는 추가 이미지 생성이나 Photoshop 편집을 하지 않았다. 사용자가 나머지 두 사진은 그대로 사용하도록 승인했다.

출력용 WebP 인코딩과 공유 외곽 효과는 `scripts/build-hero-surroundings.mjs`에서 적용한다. 실제 화면 모서리와 HTML 전용 마스크는 `scripts/measure-hero-screens.mjs`로 재현한다. 사진을 변경하면 화면 좌표도 다시 측정해야 한다. 출력 출처·해시는 `public/assets/hero-cafe-v6/provenance.json` 참조.
