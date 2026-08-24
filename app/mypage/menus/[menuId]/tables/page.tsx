import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  listMenuTables,
  MenuTableManagementError,
} from "@/lib/server/menu-table-management-service";

import MenuTableManager from "./MenuTableManager";

export const metadata: Metadata = {
  title: "테이블 관리 | 아티메뉴",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MenuTableManagementPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  let data;

  try {
    data = await listMenuTables(menuId);
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      if (error.code === "AUTH_REQUIRED") redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${menuId}/tables`)}`);
      if (error.status === 404) notFound();
    }
    if (error instanceof MenuTableManagementError) {
      if (error.code === "INVALID_INPUT") notFound();
      if (error.code === "MENU_SITE_UNAVAILABLE") redirect("/mypage?tab=menus&message=table-management-locked");
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950 md:px-8 md:py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <Link href="/mypage?tab=menus" className="text-sm font-black text-emerald-700 hover:text-emerald-900">
            ← 내 메뉴판으로 돌아가기
          </Link>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{data.menuSite.name}</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">테이블 관리</h1>
          <p className="mt-3 max-w-3xl break-keep text-sm font-medium leading-relaxed text-zinc-500">
            일반 메뉴 QR과 별도로 실제 좌석의 테이블 token을 관리합니다. 비활성·보관·token 교체 시 기존 방문 세션은 서버에서 자동 종료됩니다.
          </p>
        </header>

        <MenuTableManager menuSiteId={data.menuSite.id} tables={data.tables} />
      </div>
    </main>
  );
}
