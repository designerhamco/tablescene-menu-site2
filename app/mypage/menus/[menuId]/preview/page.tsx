import type { Metadata } from "next";
import { redirect } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { normalizeLocale } from "@/lib/locales";
import { getOwnerPreviewMenuPageData, type MenuPageData } from "@/lib/menu-page-data";
import { getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import { createClient } from "@/lib/supabase/server";
import { sortMenuPages } from "@/types/menu";

type PageProps = {
  params: Promise<{ menuId: string }>;
  searchParams?: Promise<{ lang?: string | string[]; page?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "메뉴판 미리보기 | MenuLink",
  robots: {
    index: false,
    follow: false,
  },
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPreviewPageIndex(value: string | string[] | undefined) {
  const pageValue = getSearchParamValue(value);
  if (!pageValue) return null;

  const pageIndex = Number.parseInt(pageValue, 10);
  return Number.isFinite(pageIndex) && pageIndex >= 1 ? pageIndex - 1 : null;
}

function getDisplayOwnerPreviewInitialPageId(data: MenuPageData, requestedPageIndex: number | null) {
  if (data.menuSite.template_key !== "display_menu_a" || requestedPageIndex === null) return null;

  return sortMenuPages(data.pages.filter((page) => page.visible))[requestedPageIndex]?.id ?? null;
}

export default async function MenuPreviewPage({ params, searchParams }: PageProps) {
  const { menuId } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = normalizeLocale(getSearchParamValue(query.lang));
  const requestedPageIndex = getPreviewPageIndex(query.page);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/mypage/menus/${menuId}/preview`);
  }

  const accessState = await getMenuSiteAccessStateForMenuSite({ menuSiteId: menuId, userId: user.id });
  if (!accessState?.canPreview) {
    redirect("/mypage?error=menu-preview-not-allowed");
  }

  const data = await getOwnerPreviewMenuPageData(menuId, user.id, { locale });

  if (!data) {
    redirect("/mypage?error=menu-preview-not-allowed");
  }

  return (
    <MenuPageRenderer
      mode="preview"
      initialPreviewPageId={getDisplayOwnerPreviewInitialPageId(data, requestedPageIndex)}
      {...data}
    />
  );
}
