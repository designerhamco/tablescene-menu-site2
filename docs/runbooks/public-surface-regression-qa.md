# 공개 화면 회귀 QA

최종 갱신: 2026-09-16

## 실행

로컬 개발 서버는 기본 주소를 사용한다.

```bash
npm run qa:public-surfaces
```

Production처럼 다른 배포를 검사할 때만 기준 주소를 지정한다.

```bash
PUBLIC_SURFACE_QA_BASE_URL=https://tablescene-menu-site2.vercel.app npm run qa:public-surfaces
```

## 범위

- 공개 홈·만들기·요금·고객센터·약관·개인정보·로그인·회원가입·비밀번호 재설정
- 판매 중인 Dining 단일페이지 4종, 멀티페이지 2종, Display 1종
- PC `1440×900`, 모바일 `390×844`; Display는 실제 매장 화면 용도에 맞춰 PC만 검사
- HTTP 오류, 빈 본문, 2px 초과 가로 넘침, 깨진 가시 이미지, console error, page error, 같은 도메인 요청 실패
- axe-core의 WCAG 2.0·2.1 A/AA 규칙 중 `critical`·`serious` 접근성 위반
- Next.js가 화면 전환·prefetch 중 정상 취소한 `_rsc` 요청의 `net::ERR_ABORTED`는 실패에서 제외

이 검사는 공개 route만 읽으며 로그인, 폼 제출, 결제, Production 데이터 write를 수행하지 않는다.

## 2026-09-16 Production 기준선

`https://tablescene-menu-site2.vercel.app`의 31개 화면 조합을 검사했다.

- 성공: 31
- 실패: 0
- HTTP 4xx/5xx: 0
- 가로 넘침: 0
- 깨진 이미지: 0
- console/page error: 0
- 유효한 같은 도메인 요청 실패: 0

첫 실행에서 8개 화면이 Next.js RSC prefetch의 정상 `ERR_ABORTED`를 요청 실패로 오인했다. 실제 화면·응답·이미지·콘솔에는 문제가 없었으며, 정상 취소만 정확히 제외한 뒤 같은 Production 검사를 다시 통과했다.

## 2026-09-16 접근성 기준선 보강

동일한 31개 화면에 axe-core WCAG A/AA 검사를 추가했다. 최초 검사에서 19개 화면에 낮은 명암 대비가 확인됐으며 모두 `color-contrast` 유형이었다. 공개 상품·FAQ·약관·인증 화면의 보조 문구, 홈페이지 미니 미리보기, Footer 저작권, Display 배지 기본 팔레트를 위치별로 보정했다.

보정 후 로컬 31개 화면에서 심각도 `critical`·`serious` 접근성 위반은 0건이다. Production 기준선은 이 변경의 배포가 완료된 뒤 동일 명령으로 다시 확인한다.
