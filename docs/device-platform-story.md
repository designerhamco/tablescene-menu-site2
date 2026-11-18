# 아티메뉴 기기 바닥 스크롤 섹션

홈의 카페 hero 바로 다음에 있던 흰색 Showcase만 교체한다. 카페 hero 5개 장면, 서비스 페이지 Showcase, 고객 메뉴판 렌더러와 페이지 통합은 변경하지 않는다.

## 구도와 모션

사용자가 제공한 참고 이미지의 1200×1200 좌표를 기준으로 사용한다. 바닥은 제공한 00_floor_background_3600.png의 기하를 그대로 유지하고 2400×2400 WebP로 웹 최적화했다. 원본 파일은 수정하지 않았다.

모든 화면 크기에서 340svh 진행 구간을 사용한다. 장면은 공통 헤더 바로 아래에 고정되고 높이는 `100svh - --site-header-height`다. 스크롤 중에도 장면이 문서처럼 아래로 흘러가지 않는다. 빈 바닥에서 노트북 → 태블릿 → 아이폰 세 기기가 순서대로 나타나며, 마지막 등장과 머무는 구간이 끝난 뒤에만 다음 콘텐츠로 이동한다. 역방향 스크롤은 같은 진행값으로 되돌아간다.

제목·설명은 장면 내부의 상단 중앙에 함께 고정한다. 별도의 제목 행과 정사각형 문서 이미지로 분리하지 않는다. 공통 `--site-section-space`로 상단 여백, `site-stack-title`로 제목·설명 12px, `--site-page-intro-content-gap`으로 그림과의 읽기 여유를 확보한다. 첫 카페 hero와 두 번째 섹션 모두 기존 `type-section-title` 역할을 사용한다(모바일24 / 태블릿32 / PC36px 및 공통 와이드 보정). 첫 hero의 승인된 왼쪽 하단 위치는 유지한다.

PC·태블릿·모바일 모두 하나의 고정 구도를 사용한다. 스크롤에 따른 확대·축소·가로/세로 시점 이동과 기기의 위로 떠오르는 이동을 없앤다. 세 기기는 제자리에서 투명도만 바뀌며 나타난다. `deviceStageFrame`은 화면 크기와 제목 높이만 입력받고 스크롤 진행값은 받지 않는다. 화면 크기가 바뀌거나 글자 줄바꿈이 바뀔 때만 전체 구도를 다시 맞춘다.

PC는 제목 아래 남은 높이에 세 기기가 함께 들어오도록 이전보다 작게 표시한다. 모바일도 세 기기를 같은 화면 안에서 보여준다. 별도 메뉴 면과 중복 상단 태블릿·펜은 제거했다. 모든 기기는 제공된 원근 방향과 가로세로 비율을 유지한다.

타이틀 뒤의 흰색 덮개·backdrop blur와 기기 전체에 씌운 상단 마스크는 사용하지 않는다. 바닥 이미지 바깥 모서리/가장자리의 실제 RGB(240,240,241), `#f0f0f1`을 섹션 배경에 맞춘다. 이 값은 원화 배경 메타데이터이며 공통 UI 표면 토큰을 바꾸지 않는다. 바닥 배경만 독립 레이어로 분리해 좌우/외곽을 같은 밝은 회색으로 약하게 페이드한다. 기기와 실제 메뉴 화면에는 가리는 마스크나 흐림을 적용하지 않는다. 흐린 확대 배경도 사용하지 않는다.

독립 자동 재생 타이머나 새 인디케이터/재생 버튼을 추가하지 않는다. 기존 ‘더 많은 디자인 보기’ 목적지는 유지한다. 모션 감소에서는 긴 고정 진행 구간과 등장 효과 없이 완성 장면을 제목 아래에 정적으로 보여준다. 직접 검토 링크는 /#device-platform이다.

### 공통 바닥 원근

바닥의 긴 두 가장자리를 측정한 기울기 -0.4570715 / +0.4934842를 모든 바닥 면의 공통 축으로 사용한다. 화면 모서리만 개별 목표점에 맞추지 않고, 태블릿·휴대폰의 실제 외곽과 노트북 키보드/베이스 면을 이 축에 투영한다. 둥근 모서리는 직선 가장자리를 연장한 교점으로 측정한다. 화면은 같은 기기 레이어 안에 합성되어 테두리와 함께 움직인다.

노트북·태블릿·휴대폰과 접지 그림자는 같은 바닥 축을 따른다. 각도를 보정하려고 바닥이나 메뉴판 화면을 새로 생성하지 않는다.

## 실제 메뉴판 화면

전체 기기는 cafe_real_matcha_a / REAL MATCHA 하나로 통일한다. 공개 카탈로그의 실제 화면을 CUA 브라우저에서 캡처했고, PC·태블릿은 동일한 PC 캡처, 휴대폰은 같은 내용의 실제 모바일 반응형 캡처를 사용한다. 대표 사진도 같은 첫 번째 슬라이드로 맞췄다. 새 메뉴 UI를 이미지 생성으로 그리거나 고객 템플릿 코드를 바꾸지 않는다. 추가 섹션은 정적 캡처만 사용하므로 주문/호출/DB/API 쓰기가 없다.

캡처 원본: https://tablescene-menu-site2.vercel.app/templates/cafe_real_matcha_a/preview?view=actual&embedded=1&heroDemo=1&device=pc (1280×800), device=mobile (390×844). 캡처에는 사이트 헤더, 개발 도구, Vercel Toolbar가 없다.

## 파일과 복원 범위

최종 프로젝트 경로: public/assets/device-platform-v1/

| 파일 | 실제 크기 | 출처 |
| --- | --- | --- |
| floor.webp | 2400×2400 | 사용자 제공 바닥, 기하를 유지한 WebP 변환 |
| laptop.webp | 1254×1254, alpha | 사용자 노트북을 내장 image_gen으로 품질 복원 |
| tablet.webp | 1768×890, alpha | 정상 오른쪽 태블릿을 내장 image_gen으로 품질 복원, 한 태블릿에 사용 |
| phone.webp | 1721×914, alpha | 사용자 휴대폰을 내장 image_gen으로 품질 복원 |
| menu-desktop.webp | 1280×800 | 실제 공개 카탈로그 PC 캡처 |
| menu-mobile.webp | 390×844 | 같은 공개 카탈로그 모바일 캡처 |

상단·하단 태블릿 확대본의 검은 복원 조각은 사용하지 않는다. 정상적인 한 태블릿만 공통 바닥 축에 맞춰 사용한다. 원본 업스케일 파일을 고해상도 원본이라고 표시하지 않는다. 생성 PNG 원본은 Codex generated_images에 보존하며 소비 자산은 모두 프로젝트에 저장했다. 방식은 내장 image_gen이며 CLI/API 우회는 사용하지 않았다. 프로젝트 WebP는 alpha를 보존하는 포맷 변환이다.

화면의 네 모서리는 빈 화면의 픽셀 경계를 읽어 측정했다. lib/device-platform-story.ts가 실제 기기 바닥 면과 화면의 projective matrix, 공통 바닥 축, 등장 구간과 반응형 고정 구도를 소유한다. 각 화면은 같은 기기 레이어 안에 있어 등장 중에도 베젤과 내용이 따로 움직이지 않는다. 그림자는 바닥 좌표의 독립 SVG 면이다.

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

- 장면 등장/역방향과 모션 감소, 실제 기기 바닥 면의 네 모서리 투영, 공통 바닥 축과 원본 기기 비율, 세 기기의 동시 가시성과 긴 타이틀의 안전한 크기 조정을 단위 테스트로 검증한다.
- 기존 hero 기하/합성 경계와 공통 사이트 UI·타입·lint를 함께 확인한다.
- 실제 브라우저의 320/390/820/1440px에서 빈 바닥, 등장 중간, 세 기기 완성, 역방향, 구도의 동일 transform, 덮개/기기 마스크 제거와 넘침을 확인한다. 최종 배포와 실측 결과는 PR에 기록한다.
- 사용자가 구도를 검토할 수 있도록 Preview로 먼저 제공한다. 운영 반영은 검토 후 별도 진행한다.

