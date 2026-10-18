# PSD 합성 히어로 검수

## 레이어 8 수정본 v3 (2026-10-18)

- 사용자 원본: /private/tmp/artimenu-psd-hero/artimenu-hero-layered.psd (15:48:53, SHA-256 c213094b53d496a6d74f02134663ed68f71c7fb6da51fab9552ba2e40c6e84e3).
- Photoshop에서 전체 레이어를 복제한 뒤 추가된 회색 배경 레이어 9만 숨겼다. 레이어 8과 나머지 기기/화면/카운터는 추가 편집 없이 그대로 내보냈다. 사용자의 원본 PSD는 변경하지 않았다.
- 이전 v2와 밝은 회색 위에서 비교한 변경 픽셀은 140개이며 모두 모니터 오른쪽 위 [2700,450]–[2735,481] 안이다. 모니터 레이어 밖의 가시 픽셀 차이는 0이다.
- 로컬 보관: design/hero/artimenu-hero-layered-v3-source.psd (원본 보존), artimenu-hero-layered-v3.psd 및 .png (투명 출력 복사본).
- 정본 public/assets/artimenu-home-hero-psd-v3.png, 반응형 640/960/1536/2304/3344px 무손실 WebP를 사용한다. Hero 레이아웃과 4초 슬라이드는 유지한다.

v3 검수: 실제 viewport 320/390/768/992/1440/2560px 6/6 통과. 원본 해상도 6,293,408픽셀 전체 비교의 최대 채널 차이 1. 자동 슬라이드와 홈/다이닝 별칭의 새 자산 공유를 확인했다. TypeScript, ESLint, Production build, diff 검사 통과. 캡처: /private/tmp/artimenu-hero-psd-v3/qa/.

아래 v2와 최초 제작 기록은 이전 버전이다. 현재 자산은 v3다.

## 사용자 수정본 v2 (2026-10-18)

- 사용자가 Photoshop에서 열어 수정·저장한 /private/tmp/artimenu-psd-hero/artimenu-hero-layered.psd (15:39:25, SHA-256 8479cf8131ad917bb8cc9d5fab09ca103d9a6dc4b67036cf547ef1276b73b350)를 사용했다. Downloads의 이전 PSD와 구분했다.
- 화면이 이미 차콜인 수정본을 Photoshop에서 추가 편집 없이 PNG로 빠른 내보내기했다. 크기는 3344×1882, sRGB RGBA다. 사용자가 수정한 기기 레이어와 모서리, 투명도를 그대로 출력한다.
- 로컬 보관본: design/hero/artimenu-hero-layered-v2.psd 및 .png. 배포 정본: public/assets/artimenu-home-hero-psd-v2.png. 640/960/1536/2304/3344px 무손실 WebP를 같은 파일에서 생성한다. 이전 파일은 새 버전으로 교체해 캐시를 구분한다.
- 이전 정본과 비교하면 43,612픽셀이 달라졌다. 브라우저 도형이나 CSS 보정은 추가하지 않았다. Hero 형태·카피·4초 순환은 그대로 유지한다.

v2 검수 결과:

- 실제 viewport 320/390/768/992/1440/2560px 6/6 통과. 새 WebP 로드, 어두운 화면, SVG 덮개 없음, 네 장 선택, 가로 넘침/브라우저 예외 없음.
- 원본 3344×1882 전체 6,293,408픽셀 비교 통과. PSD 출력과 브라우저 표시의 최대 채널 차이는 1(알파 합성 반올림 범위)이다.
- 4초 순환, 진행 표시, 정지/재생, 키보드, 화면 밖/문서 비활성, 터치, 모션 감소 검수 통과. 홈/다이닝/디스플레이 내비게이션·별칭 6/6 통과.
- TypeScript, 변경 파일 ESLint, Production build, diff 검사 통과. 캡처와 로그: /private/tmp/artimenu-hero-psd-v2/qa/.

아래는 최초 PSD 적용 시의 제작·검수 기록이다. 현재 파일은 위 v2 자산을 사용한다.

2026-10-18. 사용자 제공 `모니터·태블릿·스마트폰 쇼케이스 Firefly Upscaler 2x 비율.psd`를 Photoshop 2026에서 직접 열고 복제했다. 원본 다운로드 파일은 변경하지 않았다.

## 제작과 보존

- PSD 8개 레이어 중 화면 도형 `사각형 1/2/3`의 색상만 `#23262b`로 변경했다. 화면 도형 위치·벡터 마스크·기기 스마트 오브젝트·카운터 레이어는 변경하지 않았다.
- 편집 전 빨간 화면 PNG와 변경 후 PNG는 모두 3344×1882다. 전 픽셀 비교에서 화면 도형 세 영역 밖의 RGB 변경은 0, 전체 알파 변경은 0이다. 변경 픽셀은 화면 도형 안의 1,129,531곳이다.
- 편집 PSD와 비교용 PNG는 로컬 `design/hero/`에 보관한다(기존 gitignore 적용). 사용자 PSD와 별도로 저장한 편집용 복사본이다. 배포 정본 PNG는 `public/assets/artimenu-home-hero-psd.png`다.
- 640/960/1536/2304/3344px 무손실 WebP는 같은 Photoshop PNG에서 크기별로 내보낸다. 브라우저는 완성 이미지 한 장을 렌더링하므로 화면/베젤 간 별도 정렬이 없다.
- 이전 `hero-screen-contours.ts`, SVG 화면과 앞뒤 마스크는 제거했다. 향후 화면별 이미지 삽입은 PSD의 해당 화면 도형/마스크를 사용한 뒤 재출력한다.

## 검사

`scripts/qa-home-hero-carousel.mjs`는 여섯 실제 viewport에서 한 장의 PSD 합성 이미지·SVG 덮개 없음·화면 색·이미지 로딩과 선택·가로 넘침/브라우저 예외를 확인한다. 원본 해상도에서는 브라우저 출력 전체 6,293,408픽셀을 정본 PNG와 비교한다(알파 합성 반올림을 고려한 채널 차이 2 이하). 기존 4장 자동 순환, 진행 표시, 정지/재생, 키보드, 터치, 모션 감소도 검사한다.

기존 히어로 비율/최대 폭/크롭/라운드, 소제목, 다른 슬라이드와 실제 고객 메뉴판은 변경하지 않았다.

## 최종 결과

- Production 빌드의 실제 320/390/768/992/1440/2560px 6/6과 원본 6,293,408픽셀 전체 비교 통과. Photoshop 정본과 브라우저 출력의 최대 채널 차이는 1이다.
- 4장 자동 순환·진행 표시·정지/복귀·키보드·터치·화면 밖/문서 비활성·모션 감소 검수 통과.
- 기존 디자인 시스템 6/6: 히어로 비율·최대 폭·라운드·제목·여백·헤더·갤러리 유지. 홈/다이닝/디스플레이 내비게이션과 별칭 검사 6/6.
- TypeScript·변경 파일 ESLint·Production build·`git diff --check` 통과.

로컬 검사/캡처: `/private/tmp/artimenu-psd-hero/qa/`.
