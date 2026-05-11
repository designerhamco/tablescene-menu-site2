import type { Metadata } from "next";
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

  return <MenuPageRenderer mode="preview" {...data} />;
}
