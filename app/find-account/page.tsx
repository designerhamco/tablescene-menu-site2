import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

const supportMailHref = "mailto:admin@dndcommerce.co.kr?subject=ArtiMenu 로그인 이메일 찾기 문의";

export default function FindAccountPage() {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-gutter site-auth-page bg-white text-zinc-950">
        <div className="site-auth-content">
          <div className="site-auth-form">
            <div className="site-auth-header">
              <h1 className="type-subsection-title">로그인 이메일을 잊으셨나요?</h1>
              <p className="mt-3 break-keep text-copy font-medium leading-relaxed text-zinc-500">
                ArtiMenu는 이메일 주소로 로그인합니다. 가입 시 사용한 이메일을 확인해주세요.
              </p>
            </div>

            <div className="site-section space-y-3 p-5 text-copy font-semibold leading-relaxed text-zinc-600">
              <p>다음 메일함을 먼저 확인해보세요.</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>결제 완료 메일을 받은 이메일</li>
                <li>ArtiMenu 가입 또는 메뉴판 생성 안내 메일을 받은 이메일</li>
                <li>자주 사용하는 업무용 이메일</li>
              </ul>
              <p className="break-keep pt-2 text-support font-medium text-zinc-400">
                개인정보 보호를 위해 이름이나 전화번호만으로 가입 이메일을 화면에 표시하지 않습니다.
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <Link href="/sign-in" className="site-button site-button-primary site-button-lg w-full">
                로그인으로 돌아가기
              </Link>
              <a
                href={supportMailHref}
                className="site-button site-button-secondary site-button-lg w-full"
              >
                고객지원 문의하기
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
