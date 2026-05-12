import type { Metadata } from "next";
import { redirect } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { normalizeLocale } from "@/lib/locales";
import { getOwnerPreviewMenuPageData } from "@/lib/menu-page-data";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ menuId: string }>;
  searchParams?: Promise<{ lang?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "메뉴판 미리보기 | Table Scene",
  robots: {
    index: false,
    follow: false,
  },
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MenuPreviewPage({ params, searchParams }: PageProps) {
  const { menuId } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = normalizeLocale(getSearchParamValue(query.lang));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/mypage/menus/${menuId}/preview`);
  }

  const data = await getOwnerPreviewMenuPageData(menuId, user.id, { locale });

  if (!data) {
    redirect("/mypage?error=menu-preview-not-allowed");
  }

  return <MenuPageRenderer mode="preview" {...data} />;
}
