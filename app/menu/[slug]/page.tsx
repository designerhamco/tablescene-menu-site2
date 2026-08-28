import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import {
  buildPublicOrderCallEntryConfig,
  getPublicOrderCallCapabilityState,
} from "@/components/public-menu/order-call/types";
import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import { normalizeLocale } from "@/lib/locales";
import { getPublicMenuDataBySlug, type MenuPageData } from "@/lib/menu-page-data";
import { isPostpayOrderRuntimeEnabledForSite } from "@/lib/postpay-order-runtime";
import { listStaffCallItems } from "@/lib/server/call-item-service";
import {
  createPostpayCartScope,
  getPostpayOrderCatalog,
} from "@/lib/server/postpay-order-catalog-service";
import { getMenuSiteAccessStateBySlug, type MenuSiteAccessState } from "@/lib/server/menu-site-access-service";
import { resolveTableVisitSession } from "@/lib/server/table-visit-session-service";
import { TABLE_VISIT_SESSION_COOKIE } from "@/lib/table-qr-session-tokens";
import { sortMenuPages } from "@/types/menu";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string | string[]; page?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const accessState = await getMenuSiteAccessStateBySlug(slug);

  if (!accessState?.canViewPublic) {
    const isActiveDraft = accessState?.entitlementStatus === "active" && accessState.menuSiteStatus === "draft";

    return {
      title: isActiveDraft ? "아직 공개되지 않은 메뉴판 | ArtiMenu" : "비공개 메뉴판 | ArtiMenu",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const data = await getPublicMenuDataBySlug(slug);

  if (!data) {
    return {
      title: "공개되지 않은 메뉴판 | ArtiMenu",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${data.menuSite.business_name || data.menuSite.name} 메뉴판`;
  const description = data.menuSite.description || `${data.menuSite.name}의 ArtiMenu 디지털 메뉴판입니다.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: data.menuSite.cover_image_url ? [data.menuSite.cover_image_url] : undefined,
    },
  };
}

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDisplayPageIndex(value: string | string[] | undefined) {
  const pageValue = getSearchParamValue(value);
  if (!pageValue) return null;

  const pageIndex = Number.parseInt(pageValue, 10);
  return Number.isFinite(pageIndex) && pageIndex >= 1 ? pageIndex - 1 : null;
}

function getDisplayInitialPageId(data: MenuPageData, requestedPageIndex: number | null) {
  if (data.menuSite.template_key !== "display_menu_a" || requestedPageIndex === null) return null;

  return sortMenuPages(data.pages.filter((page) => page.visible))[requestedPageIndex]?.id ?? null;
}

function getUnavailableCopy(accessState: MenuSiteAccessState) {
  if (accessState.entitlementStatus === "active" && accessState.menuSiteStatus === "draft") {
    return {
      eyebrow: "공개 준비 중",
      title: "이 메뉴판은 아직 공개되지 않았습니다.",
      message: "매장 관리자가 공개 상태로 전환하면 메뉴판을 볼 수 있습니다.",
    };
  }

  return {
    eyebrow: "공개 중지됨",
    title: "이 메뉴판은 현재 비공개 상태입니다.",
    message: "서비스 이용 기간이 종료되었거나 결제 확인이 필요해 공개가 중지되었습니다. 관리자는 마이페이지에서 재구독 또는 결제 정상화로 복구할 수 있습니다.",
  };
}

function PublicMenuUnavailable({ accessState }: { accessState: MenuSiteAccessState }) {
  const copy = getUnavailableCopy(accessState);

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-zinc-900">
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
        <p className="text-sm font-semibold text-amber-700">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">{copy.title}</h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">{copy.message}</p>
      </section>
    </main>
  );
}

export default async function PublicMenuPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const accessState = await getMenuSiteAccessStateBySlug(slug);

  if (!accessState) {
    notFound();
  }

  if (!accessState.canViewPublic) {
    return <PublicMenuUnavailable accessState={accessState} />;
  }

  const query = searchParams ? await searchParams : {};
  const locale = normalizeLocale(getSearchParamValue(query.lang));
  const requestedPageIndex = getDisplayPageIndex(query.page);
  const data = await getPublicMenuDataBySlug(slug, { locale });

  if (!data) {
    notFound();
  }

  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const tableSession = await resolveTableVisitSession({
    expectedMenuSiteId: data.menuSite.id,
    sessionToken: cookieStore.get(TABLE_VISIT_SESSION_COOKIE)?.value,
    userAgent: headerStore.get("user-agent"),
  });
  const storeName = data.menuSite.restaurant_name || data.menuSite.business_name || data.menuSite.name;
  const capabilityState = getPublicOrderCallCapabilityState({
    templateKey: data.menuSite.template_key,
    planType: accessState.planType,
    hasValidTableSession: Boolean(tableSession),
    postpayOrderRuntimeEnabled: isPostpayOrderRuntimeEnabledForSite(data.menuSite.id),
    callRuntimeEnabled: isCallRuntimeEnabledForSite(data.menuSite.id),
  });
  const [orderCatalog, callItems] = await Promise.all([
    capabilityState.orderEnabled ? getPostpayOrderCatalog(data.menuSite.id) : [],
    capabilityState.callEnabled
      ? listStaffCallItems({ menuSiteId: data.menuSite.id })
      : [],
  ]);
  const orderCallConfig = buildPublicOrderCallEntryConfig({
    capabilityState,
    menuSiteId: data.menuSite.id,
    storeName,
    tableSession,
    cartScope: tableSession ? createPostpayCartScope(tableSession.id) : undefined,
    orderCatalog,
    callItems,
  });

  return (
    <MenuPageRenderer
      mode="public"
      initialPreviewPageId={getDisplayInitialPageId(data, requestedPageIndex)}
      orderCallConfig={orderCallConfig}
      {...data}
    />
  );
}
