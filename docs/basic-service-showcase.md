# 아티메뉴 메인 베이직 프레임 목업 — 2026-11-19

## 현행 구성

베이직 프레임의 첫 도입만 기존 좌우 구성에서 상단 중앙 제목과 하단 목업으로 바꾼다. 기존 소제목·제목·본문과 기능 설명 목록, 다이닝/디스플레이 프레임은 유지한다. 공통1600px 컨테이너·타이포·여백을 사용하며 프레임의 기존 sticky/덮임/헤더 전환은 변경하지 않는다.

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
