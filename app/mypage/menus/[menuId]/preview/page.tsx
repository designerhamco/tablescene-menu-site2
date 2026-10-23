import { buildSavedMenuPreview } from "@/lib/saved-menu-preview";
import { buildInteractivePreviewConfig } from "@/lib/preview-order-config";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import MenuPreviewDeviceFrame from "@/components/menu/MenuPreviewDeviceFrame";
import MenuPreviewGuide from "@/components/menu/MenuPreviewGuide";
import PreviewFullscreenControl from "@/components/menu/PreviewFullscreenControl";
import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { normalizeLocale } from "@/lib/locales";
import { getAuthorizedPreviewMenuPageData, type MenuPageData } from "@/lib/menu-page-data";
import { buildOnePageCallPreviewConfig } from "@/lib/one-page-call-preview";
import {
  buildMenuPreviewUrl,
  normalizeMenuPreviewDevice,
  getActualMenuPreviewDevice,
  normalizeMenuPreviewOrientation,
  shouldUseMenuPreviewDeviceFrame,
  type MenuPreviewQuery,
  type TemplatePreviewQuery,
} from "@/lib/menu-preview-devices";
import { MenuSiteAccessError, type MenuSiteMemberRole } from "@/lib/menu-site-permissions";
import { type MenuSiteAccessState } from "@/lib/server/menu-site-access-service";
import { createClient } from "@/lib/supabase/server";
import { normalizePcTabletLayoutMode, supportsPcTabletLayoutMode } from "@/lib/menu-layout-modes";
import { sortMenuPages } from "@/types/menu";
import { Badge } from "@/app/components/ui/badge";

type PageProps = {
  params: Promise<{ menuId: string }>;
  searchParams?: Promise<TemplatePreviewQuery>;
};

export const metadata: Metadata = {
  title: "메뉴판 미리보기 | ArtiMenu",
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
  editor: "편집자",
  order_staff: "운영 직원",
  viewer: "조회 전용",
};

function getDisplayPreviewInitialPageId(data: MenuPageData, requestedPageIndex: number | null) {
  if (data.menuSite.template_key !== "display_menu_a" || requestedPageIndex === null) return null;

  return sortMenuPages(data.pages.filter((page) => page.visible))[requestedPageIndex]?.id ?? null;
}

function StaffPreviewReadOnlyBanner({ role }: { role: MenuSiteMemberRole }) {
  return (
    <div className="fixed left-0 right-0 top-0 z-[1000] px-3 py-3">
      <div className="site-notice site-notice-info mx-auto max-w-3xl px-4 py-3 text-center backdrop-blur">
        {STAFF_ROLE_LABELS[role]} 권한으로 보는 읽기 전용 미리보기입니다. 배정된 메뉴판의 공개 화면만 확인할 수 있습니다.
      </div>
    </div>
  );
}

function LockedMenuPreview({ menuId, accessState }: { menuId: string; accessState: MenuSiteAccessState | null }) {
  const message = accessState?.message ?? "보관 기간이 종료되어 미리보기를 사용할 수 없습니다. 복구 가능 기간이 종료되었습니다.";

  return (
    <main className="site-gutter site-page-spacing-compact min-h-screen bg-white text-zinc-950">
      <section className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col justify-center">
        <Link href="/mypage?tab=menus&menuTab=deleted" className="mb-5 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
          ← 메뉴판 목록으로
        </Link>
        <div className="site-card p-6 sm:p-8">
          <Badge>미리보기 제한</Badge>
          <h1 className="type-subsection-title mt-6 text-zinc-950">이 메뉴판은 현재 미리보기할 수 없습니다.</h1>
          <p className="mt-4 break-keep text-base font-bold leading-relaxed text-zinc-600">{message}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            {accessState?.canConvertToBusiness ? (
              <Link href={`/mypage/menus/${menuId}/convert`} className="site-button site-button-ghost text-sm">
                구독을 시작하고 복구
              </Link>
            ) : null}
            <Link href="/mypage?tab=payments&billingTab=deleted" className="site-button site-button-outline text-sm">
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
      <div className="site-notice site-notice-warning mx-auto max-w-3xl px-4 py-3 text-center backdrop-blur">
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
  const isDetachedView = isActualView && getSearchParamValue(query.detached) === "1";
  const requestedDevice = getSearchParamValue(query.device);
  const orientation = normalizeMenuPreviewOrientation(getSearchParamValue(query.orientation));
  const previewQuery = Object.fromEntries(Object.entries(query).map(([key, value]) => [key, getSearchParamValue(value)])) as MenuPreviewQuery;

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

  const { accessContext, accessState, data: savedData } = preview;
  if (accessContext.isOwner && !accessState?.canOwnerPreview) {
    return <LockedMenuPreview menuId={menuId} accessState={accessState} />;
  }

  if (!savedData || !accessState) {
    redirect("/mypage?error=menu-preview-not-allowed");
  }

  const { data, design, options, designDefaults } = buildSavedMenuPreview(savedData, query);
  const usesDevicePreviewFrame = shouldUseMenuPreviewDeviceFrame(data.menuSite.template_key);
  const device = normalizeMenuPreviewDevice(requestedDevice, usesDevicePreviewFrame ? "tablet" : "pc");

  if (!isActualView && usesDevicePreviewFrame) {
    return (
      <MenuPreviewDeviceFrame
        device={device}
        orientation={orientation}
        menuId={menuId}
        menuTemplateKey={data.menuSite.template_key ?? undefined}
        menuDesignId={design?.id}
        previewDisplayOptions={options}
        previewDesignDefaults={designDefaults}
        query={previewQuery}
        supportsCallPreview={data.menuSite.template_key !== "display_menu_a"}
      />
    );
  }

  const previewOrderCallConfig = buildInteractivePreviewConfig(data, getSearchParamValue(query.callPreview) === "on", getSearchParamValue(query.orderPreview) === "on") ?? buildOnePageCallPreviewConfig({
    enabled: getSearchParamValue(query.callPreview) === "on", templateKey: data.menuSite.template_key,
    menuSiteId: data.menuSite.id, storeName: data.menuSite.restaurant_name || data.menuSite.business_name || data.menuSite.name,
  });

  return (
    <>
      {accessContext.isOwner ? (
        <OwnerPreviewReadOnlyBanner accessState={accessState} />
      ) : accessContext.memberRole ? (
        <StaffPreviewReadOnlyBanner role={accessContext.memberRole} />
      ) : null}
      <MenuPageRenderer
        mode="preview"
        previewDevice={isActualView ? getActualMenuPreviewDevice(requestedDevice) : undefined}
        previewLayoutMode={supportsPcTabletLayoutMode(data.menuSite.template_key) && getSearchParamValue(query.layoutMode) ? normalizePcTabletLayoutMode(getSearchParamValue(query.layoutMode), data.menuSite.template_key) : undefined}
        debugCafeA={debugCafeA}
        initialPreviewPageId={getDisplayPreviewInitialPageId(data, requestedPageIndex)}
        orderCallConfig={previewOrderCallConfig}
        {...data}
      />
      {!usesDevicePreviewFrame && !isActualView ? <MenuPreviewGuide variant="display" /> : null}
      {usesDevicePreviewFrame && !isEmbedded ? (
        <Link
          href={buildMenuPreviewUrl(menuId, previewQuery, { device, orientation })}
          className="site-button site-button-primary fixed bottom-4 right-4 z-[1000] backdrop-blur"
        >
          기기 프레임으로 돌아가기
        </Link>
      ) : null}
      {isDetachedView ? <PreviewFullscreenControl /> : null}
    </>
  );
}
