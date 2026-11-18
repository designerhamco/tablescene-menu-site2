# 아티메뉴 기기 바닥 스크롤 섹션

홈의 카페 hero 바로 다음에 있던 흰색 Showcase만 교체한다. 카페 hero 5개 장면, 서비스 페이지 Showcase, 고객 메뉴판 렌더러와 페이지 통합은 변경하지 않는다.

## 구도와 모션

사용자가 제공한 참고 이미지의 1200×1200 좌표를 기준으로 사용한다. 바닥은 제공한 00_floor_background_3600.png의 기하를 그대로 유지하고 2400×2400 WebP로 웹 최적화했다. 원본 파일은 수정하지 않았다.

제목과 설명은 이미지 위에 놓인다. PC에서는 정사각형 장면이 전체 화면 폭을 채우며 5% 확대되어 양쪽이 대칭으로 조금 잘린다. 왼쪽 제목·오른쪽 작은 이미지의 분할 구성은 사용하지 않는다. 큰 이미지는 문서 흐름으로 내려 읽으며, 기기가 보이는 구간에 맞춰 노트북 → 상단 태블릿 → 휴대폰 → 오른쪽 태블릿 → 앞쪽 메뉴 면이 순서대로 나타난다. 노트북 정면의 세워진 메뉴 면과 맨 아래 태블릿은 제거했다.

첫 진입은 빈 바닥이다. 직접 스크롤에 맞춰 기기와 접지 그림자가 나타나며 역방향 스크롤은 같은 진행값으로 되돌아간다. 독립 자동 재생 타이머나 새 인디케이터/재생 버튼을 추가하지 않는다. 기존 ‘더 많은 디자인 보기’ 목적지는 유지한다.

1024px 미만에서는 340svh 고정 구간 안에서 같은 바닥 좌표의 기기에 차례로 가까워졌다가 전체 구도로 복귀한다. 바닥은 이미지 영역을 채워 내부에 별도의 빈 띠가 생기지 않는다. 모션 감소에서는 완성 장면을 정적으로 보여주며 긴 고정 스크롤과 카메라 이동을 없앤다. 직접 검토 링크는 /#device-platform이다.

### 공통 바닥 원근

바닥의 긴 두 가장자리를 측정한 기울기 -0.4570715 / +0.4934842를 모든 바닥 면의 공통 축으로 사용한다. 화면 모서리만 개별 목표점에 맞추지 않고, 태블릿·휴대폰의 실제 외곽과 노트북 키보드/베이스 면을 이 축에 투영한다. 둥근 모서리는 직선 가장자리를 연장한 교점으로 측정한다. 화면은 같은 기기 레이어 안에 합성되어 테두리와 함께 움직인다.

상단·오른쪽 태블릿은 동일 원본과 동일 크기·방향의 바닥 면을 사용하고 위치만 다르다. 휴대폰·앞쪽 메뉴 면·그림자·펜도 같은 두 축을 따른다. 각도를 보정하려고 바닥이나 메뉴판 화면을 새로 생성하지 않는다.

## 실제 메뉴판 화면

전체 기기는 cafe_real_matcha_a / REAL MATCHA 하나로 통일한다. 공개 카탈로그의 실제 화면을 CUA 브라우저에서 캡처했고, PC·태블릿·앞쪽 메뉴 면은 동일한 PC 캡처, 휴대폰은 같은 내용의 실제 모바일 반응형 캡처를 사용한다. 대표 사진도 같은 첫 번째 슬라이드로 맞췄다. 새 메뉴 UI를 이미지 생성으로 그리거나 고객 템플릿 코드를 바꾸지 않는다. 추가 섹션은 정적 캡처만 사용하므로 주문/호출/DB/API 쓰기가 없다.

캡처 원본: https://tablescene-menu-site2.vercel.app/templates/cafe_real_matcha_a/preview?view=actual&embedded=1&heroDemo=1&device=pc (1280×800), device=mobile (390×844). 캡처에는 사이트 헤더, 개발 도구, Vercel Toolbar가 없다.

## 파일과 복원 범위

최종 프로젝트 경로: public/assets/device-platform-v1/

| 파일 | 실제 크기 | 출처 |
| --- | --- | --- |
| floor.webp | 2400×2400 | 사용자 제공 바닥, 기하를 유지한 WebP 변환 |
| laptop.webp | 1254×1254, alpha | 사용자 노트북을 내장 image_gen으로 품질 복원 |
| tablet.webp | 1768×890, alpha | 정상 오른쪽 태블릿을 내장 image_gen으로 품질 복원, 두 위치에 같은 크기와 방향으로 재사용 |
| phone.webp | 1721×914, alpha | 사용자 휴대폰을 내장 image_gen으로 품질 복원 |
| menu-desktop.webp | 1280×800 | 실제 공개 카탈로그 PC 캡처 |
| menu-mobile.webp | 390×844 | 같은 공개 카탈로그 모바일 캡처 |

상단·하단 태블릿 확대본의 검은 복원 조각은 사용하지 않는다. 정상적인 한 태블릿을 공통 바닥 축에 맞춰 두 위치에 재사용한다. 원본 업스케일 파일을 고해상도 원본이라고 표시하지 않는다. 생성 PNG 원본은 Codex generated_images에 보존하며 소비 자산은 모두 프로젝트에 저장했다. 방식은 내장 image_gen이며 CLI/API 우회는 사용하지 않았다. 프로젝트 WebP는 alpha를 보존하는 포맷 변환이다.

화면의 네 모서리는 빈 화면의 픽셀 경계를 읽어 측정했다. lib/device-platform-story.ts가 실제 기기 바닥 면과 화면의 projective matrix, 공통 바닥 축, 등장 구간과 카메라를 소유한다. 각 화면은 같은 기기 레이어 안에 있어 등장 중에도 베젤과 내용이 따로 움직이지 않는다. 그림자는 바닥 좌표의 독립 SVG 면이다.

## 최종 프롬프트 세트

### laptop

```text
Use case: precise-object-edit. Asset type: high-resolution transparent product mockup repair. Restore the supplied open silver laptop faithfully at 2048x2048 resolution. This is a QUALITY RESTORATION, not a redesign: preserve exactly its strongly oblique three-quarter camera angle, almost vertical screen, original screen's quadrilateral perspective, keyboard/base geometry, opening angle, silhouette proportions and original tight framing. It must still point diagonally down-right exactly as in the input, NOT turn front-on. Reconstruct crisp realistic keyboard keys and trackpad, clean thin black bezel, brushed silver aluminum and physically coherent edges, removing pixelation, jagged white cutout fringe and patchy reconstruction. Keep display completely blank pure off-white with no reflections or UI. Remove any brand lettering on bezel. One complete device only, no stand, accessories, floor, cast shadow or background. Genuinely transparent RGBA background; preserve fine antialiased edge alpha. No recentering that changes the pose or relative silhouette. No text or watermark.
```

### tablet

```text
Use case: precise-object-edit. Asset type: high-resolution transparent device repair. Faithfully restore the supplied black landscape tablet at 2400x1200 resolution. Keep its EXACT flat-on-table three-quarter/isometric view, original diagonal orientation, full original silhouette and screen quadrilateral, thin glossy black bezel, small round home button near the front-left edge and slim silver lower rim. This is a photographic quality restoration: sharp coherent edges and realistic glass/metal, remove upscaling artifacts, stairsteps and white cutout fringe. Do NOT change perspective, rotate it to a new angle, stand it upright, alter its proportions or add features. Keep screen a completely blank flat off-white with crisp unobstructed four inner corners; no reflections/UI/text. One entire tablet only. No floor, shadow, background, stylus or other objects. True transparent RGBA canvas, tight padding matching the input, no dark rectangle outside the tablet, no halos or checkerboard.
```

### phone

```text
Use case: precise-object-edit. Asset type: high-resolution transparent phone mockup restoration. Repair this exact black smartphone as a crisp photorealistic 2400x1274 cutout. Preserve its very oblique flat-on-table view, diagonal long axis down-right, full silhouette and original thick black bezels, speaker slit and home button placement. It is a portrait handset viewed in perspective, NOT a landscape handset. Keep all four display corners and the original perspective proportions. Replace pixelation/aliased cutout edges with clean detailed glass and metal. Keep screen entirely blank uniform off-white, no glare or UI, no generated text/logos. One complete handset only, same pose/framing as input, no angle changes, cropping, floor, cast shadow, accessories or additional devices. Genuinely transparent RGBA background with clean antialiased edges, no opaque black/white backdrop or fringe.
```

## 검증

- 장면 등장/역방향과 모션 감소, 실제 기기 바닥 면의 네 모서리 투영, 공통 바닥 축과 두 태블릿의 동일 형상, 전체 폭 확대와 카메라 바닥 경계를 단위 테스트로 검증한다.
- 기존 hero 기하/합성 경계와 공통 사이트 UI·타입·lint를 함께 확인한다.
- 실제 브라우저의 320/390/820/1440px에서 빈 바닥, 등장 중간, 전체 구도, 역방향, 제목·기기 경계와 넘침을 확인한다. 최종 배포와 실측 결과는 PR에 기록한다.
- 사용자가 구도를 검토할 수 있도록 Preview로 먼저 제공한다. 운영 반영은 검토 후 별도 진행한다.

