import Link from "next/link";
import { redirect } from "next/navigation";

import ApplyOrderForm from "@/components/apply/ApplyOrderForm";
import { getPublicPortOneConfig } from "@/lib/portone";
import { createClient } from "@/lib/supabase/server";
import { templateCatalog } from "@/lib/templates";

export default async function ApplyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/apply");
  }

  const portOneConfig = getPublicPortOneConfig();

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-24 text-zinc-950">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
          <div>
            <Link href="/" className="mb-6 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
              TABLE SCENE
            </Link>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Menu Site Order</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">메뉴판 생성 신청</h1>
            <p className="mt-4 max-w-2xl break-keep text-base font-medium leading-relaxed text-zinc-500">
              템플릿과 메뉴판 정보를 입력한 뒤 결제가 완료되면, 서버 검증 후 메뉴판이 자동으로 생성됩니다.
            </p>
          </div>

          <Link
            href="/mypage"
            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-950 hover:text-white"
          >
            마이페이지
          </Link>
        </header>

        <ApplyOrderForm
          templates={templateCatalog.filter((template) => template.active)}
          userEmail={user.email ?? ""}
          userId={user.id}
          storeId={portOneConfig.storeId}
          channelKey={portOneConfig.channelKey}
          mockEnabled={portOneConfig.mockEnabled}
        />
      </div>
    </main>
  );
}
