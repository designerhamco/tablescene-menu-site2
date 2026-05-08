import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { getOwnerPreviewMenuPageData } from "@/lib/menu-page-data";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ menuId: string }>;
};

export const metadata: Metadata = {
  title: "메뉴판 미리보기 | Table Scene",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MenuPreviewPage({ params }: PageProps) {
  const { menuId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/mypage/menus/${menuId}/preview`);
  }

  const data = await getOwnerPreviewMenuPageData(menuId, user.id);

  if (!data) {
    redirect("/mypage?error=menu-preview-not-allowed");
  }

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="sticky top-0 z-[60] border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Owner Preview</p>
            <p className="mt-1 text-sm font-bold text-zinc-800">{data.menuSite.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/mypage/menus/${menuId}/edit`}
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-800"
            >
              편집으로 돌아가기
            </Link>
            <Link
              href="/mypage"
              className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              마이페이지
            </Link>
          </div>
        </div>
      </div>
      <MenuPageRenderer mode="preview" {...data} />
    </main>
  );
}
