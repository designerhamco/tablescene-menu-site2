# 아티메뉴 프로젝트 안내 (ArtiMenu)

## 프로젝트 문서

먼저 [아티메뉴 프로젝트 문서 안내](docs/artimenu-project-guide.md)에서 문서별 역할과 현행/과거/검토 상태를 확인합니다.

- [서비스·요금·이용권 기준](docs/service-pricing-contract.md): 가격 원본, 서비스 구성과 기존 계약의 구분
- [약관·개인정보·동의 검토 현황](docs/legal-policy-review.md): 공개 원문 위치와 아직 확인이 필요한 사항

- [개발 작업 규칙](AGENTS.md): 모든 작업에서 따르는 공통 기준
- [템플릿 문서 안내](docs/template-docs-index.md): 기본/디자이너 구분, 리스트·앨범 등록표, 구조별 레이아웃, 보기옵션과 과거 기록 구분
- [미리보기 보기옵션](docs/template-preview-display-options.md): 기능·디자인 탭, 기본값, 임시 미리보기의 범위
- [템플릿 공통 규칙](docs/template-spacing-contract.md): 레이아웃·타이포그래피·언어·기기별 경계
- [스타터 번역·문구 수정 기준](docs/starter-translations-qa.md): 4개 언어 동시 수정, 미리보기·신규 구매 번역 동등성, 검수 방법
- [메뉴 템플릿 구조](docs/menu-template-architecture.md): 렌더러와 공통 모듈의 역할
- [공식 사이트 디자인 시스템](docs/site-design-system.md): 사이트 UI의 공통 구성 기준

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 개발 서버 실행

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 프레임워크 참고 자료

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 배포 참고 자료

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 인증 이메일의 비밀번호 재설정 경로

Password reset uses Supabase Auth `resetPasswordForEmail` and the `/reset-password` route.

Before testing in production, configure Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: `https://<production-domain>`
- Redirect URLs:
  - `http://localhost:3000/reset-password`
  - `https://<production-domain>/reset-password`
  - `https://*.vercel.app/reset-password` for Vercel preview testing

Set `NEXT_PUBLIC_SITE_URL` in Vercel to the production site origin so password reset emails use the correct `redirectTo` URL.

Production uses Supabase Auth with Resend custom SMTP. Keep the provider, sender,
redirect URLs, and delivery checks aligned with
[`docs/runbooks/supabase-auth-email-templates.md`](docs/runbooks/supabase-auth-email-templates.md).
