# 아티메뉴 메인 히어로 구도와 배경 노출

2026-11-19 후속 사용자 요청을 반영한 현행 기준이다. 같은 날 먼저 적용한 **선명한 생성 배경 확장·16:9 상한 정책을 대체**한다. 공식 사이트 메인 첫 사진 시퀀스만 대상이며 고객 메뉴판 렌더러·다른 섹션·헤더/푸터는 변경하지 않는다.

## 화면 점유율과 위치

- 장면은 기존100svh다. 원래 노트북1440×900(16:10)의 구도를 기준으로 삼는다.
- PC 가로 화면의 선명한 중앙 프레임은 `min(창 너비, 창 높이 × 1.6)`이며 창 중앙에 놓는다. 원래1536×1024 사진·기기·UI는 이 프레임 안에서 기존 노트북 카메라 계산을 사용한다.
- 따라서16:10 이상 가로 화면에서는 **기기 높이 ÷ 창 높이**, **기기 중심의 화면 중앙 기준 가로 거리 ÷ 창 높이**, **기기의 세로 위치 ÷ 창 높이**가 같다. 16:9·21:9·32:9에서도 노트북과 같은 높이 기준 구도다. 화면 가로·세로 점유율을 동시에 고정하면 기기를 찌그러뜨리거나 와이드에서 과하게 키워야 하므로 그렇게 하지 않는다.
- 중앙 프레임은 넘치는 내용을 자르고 양옆8%를 페이드한다. 프레임 바깥에는 인물 없는 원래 매장 사진의48px 블러·낮춘 불투명도만 보여준다. 와이드 빈 공간을 선명한 사진으로 펼치거나 새로운 사람·신체를 보여주지 않는다.
- 1024px 미만은 별도 기존 카메라·폭 제한·태블릿 축소·휴대폰 제목 회피를 유지한다. 선명한 원래 사진 가장자리만 상하8%·좌우4% 페이드로 인물 없는 매장 사진의 블러 배경과 연결한다. 상하 여유는 이 흐린 배경으로 보완하며 신체를 연장하지 않는다. 모바일 폭에 들어오는 기기 크기 제한이 높이 비례보다 우선한다.
- 기간 할인·전화 화면의 추가 확대 비율과 최신 메뉴 탐색 구간, 실제 메뉴판 시연·복원·준비 프레임 제한·스와이프 입력 면은 유지한다.

## 인물·생성 사진 노출 제한

확장본에서 손목/소매가 끊기거나, 팔이 비정상적으로 길어지고, 원래 사진 밖 얼굴·상체가 추가 노출되는 문제가 확인됐다. **생성 확장본4장은 사용하지 않는다.** `hero-cafe-v2/*-expanded.webp`를 공개 자산에서 제거하고 모든 화면/로딩 경로에서도 제외한다. 와이드뿐 아니라 모바일에서도 이 확장본을 다시 사용하면 안 된다. 손목 연결을 늘린 중간 수정본도 팔이 길어 보여 폐기했으며 프로젝트에 저장하지 않았다.

원래 사진의 정상적인 손·목업·일부 인물 구도는 유지하되 주변을 더 보여주기 위한 인물 생성은 금지한다. 배경에 인물이 있더라도 중앙 구도 바깥에서는 블러/페이드로 가려 선명하게 드러나지 않도록 한다. 검수는 생성 파일 단독이 아니라 실제 합성 화면에서 해야 한다.

## 모니터 브라켓·자산

첫 매장 사진 `hero-cafe-v1/venue.webp`의3대 TV는 이미 상부 천장 구조물에 드롭 브라켓으로 매달려 있다. 태블릿 장면의 배경 모니터는 벽면 부착형처럼 보여 별도 형제 자산으로 수정했다.

- 최종 저장 자산: `public/assets/hero-cafe-v1/counter-ceiling.webp`.
- 내장 **image_gen** 편집 모드 사용. CLI/API·외부 서비스를 사용하지 않았다.
- 입력: `public/assets/hero-cafe-v1/counter.webp`.
- 선택한 생성 PNG: `exec-60a03cdf-a548-4d70-8dff-edf602658b83.png`.
- 생성 PNG를 동일1536×1024 WebP로 인코딩했다. 기존 원본은 보존한다.
- 수정 대상은 상단 배경의 천장 드롭 폴·플레이트·브라켓과3대 화면이다. 전경 기기·손·메뉴 투영·손가락 가림 좌표를 유지한다. 원본 좌표1536×1024, 휴대폰 모서리·QR 강조·메뉴 화면 좌표는 바꾸지 않는다.

최종 편집 프롬프트:

```text
Use case: precise-object-edit. Edit only the out-of-focus background in the TOP 220 PIXELS of this existing 1536x1024 cafe photo. Replace the cropped wall-mounted menu boards with THREE landscape monitors suspended on slim black CEILING DROP POLES with visible round ceiling attachment plates and rear brackets. Make all three monitors fit into the existing background upper-right band, with slightly smaller blank pale-gray rectangles and narrow gaps, above the foreground tablet. Leave the background as softly out of focus as the original. The rest of the photograph is LOCKED. In particular preserve the foreground tablet's exact outer bounds, black bezel and blank gray screen with its screen corners (758,291),(1374,288),(1339,704),(707,690), stand, touching hand, wrist and navy cuff/sleeve exactly as they are; do not extend the sleeve, add anatomy, add a body or face, change any hand, resize, crop, zoom or reframe anything. No scene expansion or outpainting. Keep the exact 1536x1024 composition, original colors and soft photographic lighting. Only new ceiling support hardware and three background screen rectangles in the top band may change.
```

## 검증

`lib/hero-background-layout.ts`가 프레임·카메라 규칙을 소유한다. 테스트는 노트북부터32:9까지 화면 모서리의 높이 기준 위치/크기가 같은지 확인한다. `scripts/qa-hero-backgrounds.mjs`는 실제 DOM의 기기 크기/위치, 중앙 잘림·페이드·블러, 확장본 요청0건, 이미지 로드, 가로 넘침, 확대·역방향 이동·모바일 스와이프를 검증한다. 텍스트·진행 막대·타임라인과 고객 렌더러 규칙은 독립적으로 유지한다.
