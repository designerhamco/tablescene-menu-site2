import Link from "next/link";
import { redirect } from "next/navigation";

import PricingPaymentClient from "@/app/pricing/PricingPaymentClient";
import SiteHeader from "@/components/layout/SiteHeader";
import { getPublicPortOneConfig } from "@/lib/portone";
import { templateCatalog } from "@/lib/templates";
import { createClient } from "@/lib/supabase/server";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/pricing");
  }

  const portOneConfig = getPublicPortOneConfig();
  const templates = templateCatalog
    .filter((template) => template.active)
    .map((template) => ({
      key: template.key,
      template_category: template.template_category,
      name: template.name,
      description: template.description,
      badge: template.badge,
      categoryLabels: template.categoryLabels,
    }));

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <Link href="/mypage" className="mb-6 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
                ← 마이페이지
              </Link>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Pricing</p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">메뉴판 생성권 구매</h1>
              <p className="mt-4 max-w-2xl break-keep text-base font-medium leading-relaxed text-zinc-500">
                메뉴판 신청과 결제는 신청 페이지에서 진행됩니다. 실제 메뉴판 생성 테스트는 `/apply/menu` 흐름으로 확인해주세요.
              </p>
            </div>
          </header>

          <PricingPaymentClient
            templates={templates}
            userEmail={user.email ?? null}
            userId={user.id}
            storeId={portOneConfig.storeId}
            channelKey={portOneConfig.channelKey}
          />
        </div>
      </main>
    </>
  );
}
