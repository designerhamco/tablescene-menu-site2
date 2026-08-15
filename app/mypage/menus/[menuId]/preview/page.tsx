import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import MenuPreviewDeviceFrame from "@/components/menu/MenuPreviewDeviceFrame";
import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { normalizeLocale } from "@/lib/locales";
import { getAuthorizedPreviewMenuPageData, type MenuPageData } from "@/lib/menu-page-data";
import { buildMenuPreviewOrderCallConfig } from "@/lib/menu-preview-experience";
import {
  buildMenuPreviewUrl,
  normalizeMenuPreviewDevice,
  normalizeMenuPreviewExperience,
  normalizeMenuPreviewOrientation,
  type MenuPreviewQuery,
} from "@/lib/menu-preview-devices";
import { MenuSiteAccessError, type MenuSiteMemberRole } from "@/lib/menu-site-permissions";
import { type MenuSiteAccessState } from "@/lib/server/menu-site-access-service";
import { createClient } from "@/lib/supabase/server";
import { sortMenuPages } from "@/types/menu";

type PageProps = {
  params: Promise<{ menuId: string }>;
  searchParams?: Promise<{
    debugCafeA?: string | string[];
    device?: string | string[];
    embedded?: string | string[];
    experience?: string | string[];
    lang?: string | string[];
    orientation?: string | string[];
    page?: string | string[];
    view?: string | string[];
  }>;
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

const STAFF_ROLE_LABELS: Record<MenuSiteMemberRole, string> = {
  manager: "매니저",
  editor: "에디터",
  order_staff: "주문 직원",
  viewer: "조회자",
};

function getDisplayPreviewInitialPageId(data: MenuPageData, requestedPageIndex: number | null) {
  if (data.menuSite.template_key !== "display_menu_a" || requestedPageIndex === null) return null;

  return sortMenuPages(data.pages.filter((page) => page.visible))[requestedPageIndex]?.id ?? null;
}

function StaffPreviewReadOnlyBanner({ role }: { role: MenuSiteMemberRole }) {
  return (
    <div className="fixed left-0 right-0 top-0 z-[1000] px-3 py-3">
      <div className="mx-auto max-w-3xl rounded-2xl border border-sky-200 bg-white/95 px-4 py-3 text-center text-sm font-bold leading-relaxed text-sky-900 shadow-lg backdrop-blur">
        {STAFF_ROLE_LABELS[role]} 권한으로 보는 읽기 전용 미리보기입니다. 배정된 메뉴판의 공개 화면만 확인할 수 있습니다.
      </div>
    </div>
  );
}

function LockedMenuPreview({ menuId, accessState }: { menuId: string; accessState: MenuSiteAccessState | null }) {
  const message = accessState?.message ?? "보관 기간이 종료되어 미리보기를 사용할 수 없습니다. 복구 가능 기간이 종료되었습니다.";

  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
      <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col justify-center">
        <Link href="/mypage?tab=menus&menuTab=deleted" className="mb-5 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
          ← 메뉴판 목록으로
        </Link>
        <div className="rounded-3xl border border-amber-100 bg-white p-8 shadow-sm">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">미리보기 제한</span>
          <h1 className="mt-6 break-keep text-3xl font-black tracking-tight text-zinc-950">이 메뉴판은 현재 미리보기할 수 없습니다.</h1>
          <p className="mt-4 break-keep text-base font-bold leading-relaxed text-zinc-600">{message}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {accessState?.canConvertToBusiness ? (
              <Link href={`/mypage/menus/${menuId}/convert`} className="rounded-full bg-amber-700 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-amber-800">
                사업자 플랜으로 전환하고 복구
              </Link>
            ) : null}
            <Link href="/mypage?tab=payments&billingTab=deleted" className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-100">
              구독/결제 상태 확인
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function OwnerPreviewReadOnlyBanner({ accessState }: { accessState: MenuSiteAccessState }) {
  const shouldShowExpiredPreviewBanner =
    accessState.lifecycleState === "expired_holding" ||
    accessState.lifecycleState === "payment_issue" ||
    accessState.lifecycleState === "pending_delete";

  if (!shouldShowExpiredPreviewBanner) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[1000] px-3 py-3">
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-white/95 px-4 py-3 text-center text-sm font-bold leading-relaxed text-amber-900 shadow-lg backdrop-blur">
        보관 중 미리보기입니다. 현재 메뉴판은 손님에게 공개되지 않으며, 편집과 QR 다운로드가 제한됩니다. 보관 기간 안에 재구독하면 기존 공개 링크와 QR을 다시 사용할 수 있습니다.
      </div>
    </div>
  );
}

export default async function MenuPreviewPage({ params, searchParams }: PageProps) {
  const { menuId } = await params;
  const query = searchParams ? await searchParams : {};
  const debugCafeA = process.env.NODE_ENV !== "production" && getSearchParamValue(query.debugCafeA) === "1";
  const locale = normalizeLocale(getSearchParamValue(query.lang));
  const requestedPageIndex = getPreviewPageIndex(query.page);
  const isActualView = getSearchParamValue(query.view) === "actual";
  const isEmbedded = isActualView && getSearchParamValue(query.embedded) === "1";
  const device = normalizeMenuPreviewDevice(getSearchParamValue(query.device));
  const orientation = normalizeMenuPreviewOrientation(getSearchParamValue(query.orientation));
  const experience = normalizeMenuPreviewExperience(getSearchParamValue(query.experience));
  const previewQuery: MenuPreviewQuery = {
    debugCafeA: getSearchParamValue(query.debugCafeA),
    lang: getSearchParamValue(query.lang),
    page: getSearchParamValue(query.page),
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/mypage/menus/${menuId}/preview`);
  }

  let preview: Awaited<ReturnType<typeof getAuthorizedPreviewMenuPageData>>;
  try {
    preview = await getAuthorizedPreviewMenuPageData(menuId, { locale });
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      redirect("/mypage?error=menu-preview-not-allowed");
    }

    throw error;
  }

  const { accessContext, accessState, data } = preview;
  if (accessContext.isOwner && !accessState?.canOwnerPreview) {
    return <LockedMenuPreview menuId={menuId} accessState={accessState} />;
  }

  if (!data || !accessState) {
    redirect("/mypage?error=menu-preview-not-allowed");
  }

  if (!isActualView) {
    return (
      <MenuPreviewDeviceFrame
        device={device}
        experience={experience}
        orientation={orientation}
        menuId={menuId}
        query={previewQuery}
      />
    );
  }

  const previewOrderCallConfig = device === "mobile"
    ? buildMenuPreviewOrderCallConfig({
        experience,
        menuSiteId: data.menuSite.id,
        storeName: data.menuSite.restaurant_name || data.menuSite.business_name || data.menuSite.name,
      })
    : undefined;

  return (
    <>
      {accessContext.isOwner ? (
        <OwnerPreviewReadOnlyBanner accessState={accessState} />
      ) : accessContext.memberRole ? (
        <StaffPreviewReadOnlyBanner role={accessContext.memberRole} />
      ) : null}
      <MenuPageRenderer
        mode="preview"
        debugCafeA={debugCafeA}
        initialPreviewPageId={getDisplayPreviewInitialPageId(data, requestedPageIndex)}
        orderCallConfig={previewOrderCallConfig}
        {...data}
      />
      {!isEmbedded ? (
        <Link
          href={buildMenuPreviewUrl(menuId, previewQuery, { device, orientation, experience })}
          className="fixed bottom-4 right-4 z-[1000] rounded-full border border-white/30 bg-zinc-950/90 px-4 py-2.5 text-sm font-black text-white shadow-lg backdrop-blur transition-colors hover:bg-zinc-800"
        >
          기기 프레임으로 돌아가기
        </Link>
      ) : null}
    </>
  );
}
