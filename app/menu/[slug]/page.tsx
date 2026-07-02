import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { normalizeLocale } from "@/lib/locales";
import { getPublicMenuDataBySlug } from "@/lib/menu-page-data";
import { getMenuSiteAccessStateBySlug, type MenuSiteAccessState } from "@/lib/server/menu-site-access-service";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const accessState = await getMenuSiteAccessStateBySlug(slug);

  if (!accessState?.canViewPublic) {
    const isActiveDraft = accessState?.entitlementStatus === "active" && accessState.menuSiteStatus === "draft";

    return {
      title: isActiveDraft ? "아직 공개되지 않은 메뉴판 | MenuLink" : "비공개 메뉴판 | MenuLink",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const data = await getPublicMenuDataBySlug(slug);

  if (!data) {
    return {
      title: "공개되지 않은 메뉴판 | MenuLink",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${data.menuSite.business_name || data.menuSite.name} 메뉴판`;
  const description = data.menuSite.description || `${data.menuSite.name}의 MenuLink 디지털 메뉴판입니다.`;

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
  const data = await getPublicMenuDataBySlug(slug, { locale });

  if (!data) {
    notFound();
  }

  return <MenuPageRenderer mode="public" {...data} />;
}
