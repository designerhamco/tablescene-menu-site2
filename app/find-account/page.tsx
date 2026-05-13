import Link from "next/link";

import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

const supportMailHref = "mailto:admin@dndcommerce.co.kr?subject=TableScene 로그인 이메일 찾기 문의";

export default function FindAccountPage() {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-950 px-6 py-24 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-white/10 bg-white p-8 text-zinc-950 shadow-2xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-zinc-400">Account Help</p>
            <h1 className="break-keep text-3xl font-bold tracking-tight">로그인 이메일을 잊으셨나요?</h1>
            <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
              TableScene은 이메일 주소로 로그인합니다. 가입 시 사용한 이메일을 확인해주세요.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-5 text-sm font-semibold leading-relaxed text-zinc-600">
            <p>다음 메일함을 먼저 확인해보세요.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>결제 완료 메일을 받은 이메일</li>
              <li>TableScene 가입 또는 메뉴판 생성 안내 메일을 받은 이메일</li>
              <li>자주 사용하는 업무용 이메일</li>
            </ul>
            <p className="break-keep pt-2 text-xs font-bold text-zinc-400">
              개인정보 보호를 위해 이름이나 전화번호만으로 가입 이메일을 화면에 표시하지 않습니다.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <Link href="/sign-in" className="rounded-2xl bg-zinc-950 px-5 py-4 text-center text-base font-bold text-white transition-transform hover:scale-[1.01]">
              로그인으로 돌아가기
            </Link>
            <a
              href={supportMailHref}
              className="rounded-2xl border border-zinc-200 px-5 py-4 text-center text-base font-bold text-zinc-950 transition-colors hover:bg-zinc-50"
            >
              고객지원 문의하기
            </a>
          </div>
        </div>
      </div>
      </main>
    </>
  );
}
