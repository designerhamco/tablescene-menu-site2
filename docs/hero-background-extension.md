# 아티메뉴 메인 카페 히어로 배경 확장

2026-11-19 승인된 공식 사이트 메인 첫 사진 시퀀스의 현행 구도 규칙이다. 고객 메뉴판 렌더러, 일반 페이지, 서비스 프레임과 푸터는 대상이 아니다.

## 원본·좌표 보존

기존 `public/assets/hero-cafe-v1/`의 네 사진과 1536×1024 기준 화면 투영·휴대폰 모서리·손가락 가림·QR 강조 좌표를 유지한다. 새 배경은 그 아래 별도 이미지로 합성한다. 생성 모델이 기존 기기나 소품을 다시 그린 결과를 원본 위에 덮지 않는다. 원본 영역 밖의 연결과 얇은 사진 가장자리 블렌딩에만 생성 배경을 사용한다.

생성 입력은 3072×2048 가이드다. 기존 원본을 크기 변경 없이 `(768,512)`에 배치하고 바깥을 마젠타 편집 영역으로 표시했다. 최종 생성 결과는1536×1024이므로 기준 좌표의 `scale(2)`·`translate(-768,-512)`로 맞춘다. 처음 제작한 자유 확장 후보는 원본 크기/위치가 달라 소품 이중상이 보여 제외했다.

아주 좁고 긴 창에서는 바깥 배경 레이어만 중심 기준으로 필요한 만큼 더 확장해 화면 끝을 채운다. 원본 사진·기기·메뉴 투영의 카메라 배율은 바꾸지 않는다. 연결 검수는 생성 파일만이 아니라 원본·UI를 합친 실제 브라우저 화면을 기준으로 한다.

## 화면별 구도

- 장면은 기존100svh를 유지한다. 사진 확장으로 섹션 높이·스크롤 타임라인을 늘리지 않는다.
- 노트북과 일반16:9 화면은 기존 기본 배율을 유지한다.
- 그보다 넓은 창은 기본 배율을 같은 높이의16:9 창과 같게 제한하고 새로 확보한 좌우 공간을 보여준다. 생성 배경의 실제 범위 안에서 기존 오른쪽 초점을 유지한다. QR 장면의 기기 아래쪽은 제목 영역 앞에서 끝나도록 배치한다.
- 1024px 미만은 기존 목업 크기·초점·휴대폰 제목 회피를 유지한다. 새 상하 배경을 보여주며, 전체 캔버스에 걸었던 큰 페이드 대신 원본 사진 가장자리만 얇게 연결한다. 헤더·제목의 기존 대비 음영은 유지한다.
- 기간 할인·전화 화면의 추가 확대 비율과 최신 메뉴 탐색 구간, 실제 메뉴판 시연·복원·미리 로딩 제한·스와이프 입력 면은 기존 계약을 유지한다.

구현은 `lib/hero-background-layout.ts`, `HomeHeroMotion.tsx`와 해당 CSS Module이다. `scripts/qa-hero-backgrounds.mjs`는 장면별 실제 배경 커버, 원본/기기 배율, 이미지 로드, 가로 넘침, 확대·역방향 이동·모바일 스와이프를 확인한다.

## 최종 저장 자산과 제작 방식

내장 **image_gen** 편집 도구를 사용했다. API/CLI나 외부 이미지 서비스를 사용하지 않았다. 생성 PNG 원본을 보존하고 아래 WebP 파일을 프로젝트에 저장했다. 원래 v1 사진은 변경하지 않았다.

| 장면 | 보호한 기존 원본 | 최종 프로젝트 자산 | 선택한 생성 PNG |
|---|---|---|---|
| 매장 | `hero-cafe-v1/venue.webp` | `public/assets/hero-cafe-v2/venue-expanded.webp` | `exec-d03c0d3d-2f88-408a-ae26-ac3a6578058d.png` |
| 태블릿 | `hero-cafe-v1/counter.webp` | `public/assets/hero-cafe-v2/counter-expanded.webp` | `exec-48a68aa5-9520-4066-b759-6fd545208944.png` |
| 다이닝 | `hero-cafe-v1/dining.webp` | `public/assets/hero-cafe-v2/dining-expanded.webp` | `exec-ecdbb9b7-067f-41d8-9193-a5b2a92f886f.png` |
| QR | `hero-cafe-v1/phone-v3.webp` | `public/assets/hero-cafe-v2/phone-expanded.webp` | `exec-d0260aec-e152-4c39-846b-0d9d48d67c43.png` |

## 최종 생성 프롬프트

태블릿 입력은 위 마젠타 가이드이며 프롬프트는 다음과 같다.

```text
Precise photographic OUTPAINTING of this prepared canvas. The bright MAGENTA area is an edit mask, NOT part of the scene. Replace ONLY magenta pixels with a seamless continuation of the warm café interior, ceiling/walls above and stone counter/sleeve below and room at sides. The center photograph occupying x=25%..75%, y=25%..75% is LOCKED: retain its exact pixel positions, dimensions, shapes, colors, focus and viewpoint. DO NOT move, resize, reframe, recenter, zoom or redraw that center rectangle. The black tablet and touching hand must remain at exactly the supplied coordinates, with its blank pale-gray screen unchanged. Continue straight architectural lines and existing countertop edges exactly across the old rectangular borders. No new devices, hands, people, props or text. No magenta remains. Output one fully filled seamless 3:2 expanded café photograph, same 3072x2048 canvas bounds as input, with the original photo still in the exact middle rectangle. Do not crop the canvas.
```

나머지 세 장면은 각 원본으로 만든 같은 가이드와 아래 프롬프트를 사용했다. `{SCENE}`만 다음 표의 문장으로 대체한다.

```text
Precise photographic OUTPAINTING of this prepared canvas. Bright MAGENTA marks the editable area and must disappear. Replace ONLY magenta with a seamless continuation of the existing café photo. The central rectangle x=25%..75%,y=25%..75% is LOCKED: preserve its exact positions, dimensions, perspective, lighting, colors, depth of field and all objects. Do not zoom, move, resize, redraw or reframe that center rectangle. Continue walls/ceiling above, existing floor/table/counter below and interior at sides. All existing architectural and tabletop lines must continue straight across the old borders, with matched texture and light. {SCENE} The output is one fully filled continuous expanded 3:2 café photograph, same 3072×2048 bounds as input, with the center rectangle still at exactly x=25%..75%,y=25%..75%. No text, watermark, border, magenta residue or visible seam. Do not crop the canvas.
```

| 장면 | `{SCENE}` |
|---|---|
| 매장 | Preserve all three blank suspended televisions and the small blank tablet. Extend the café room without adding screens or people. |
| 다이닝 | Preserve the black tablet with blank gray screen, existing customer's two hands/forearms and existing server at right. Continue the existing server naturally above the old top edge as necessary, with a normal human neck/head outside the central area; no headless cut torso or extra people. |
| QR | Preserve the black portrait phone with blank gray screen, both hands, sleeves, QR card and its exact placement. Continue the tabletop and existing sleeves naturally; no duplicated cup, plate, vase, hands or QR stickers. |
