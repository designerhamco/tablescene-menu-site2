import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { normalizeLocale } from "@/lib/locales";
import { getPublicMenuDataBySlug } from "@/lib/menu-page-data";
import { getMenuSiteAccessStateBySlug } from "@/lib/server/menu-site-access-service";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const accessState = await getMenuSiteAccessStateBySlug(slug);

  if (!accessState?.canViewPublic) {
    return {
      title: "비공개 메뉴판 | MenuLink",
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

function PublicMenuUnavailable() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-16 text-zinc-900">
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
        <p className="text-sm font-semibold text-amber-700">공개 중지됨</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">이 메뉴판은 현재 비공개 상태입니다.</h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">
          체험 기간이 종료되어 공개가 중지되었습니다. 관리자는 마이페이지에서 사업자 플랜으로 전환해 복구할 수 있습니다.
        </p>
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
    return <PublicMenuUnavailable />;
  }

  const query = searchParams ? await searchParams : {};
  const locale = normalizeLocale(getSearchParamValue(query.lang));
  const data = await getPublicMenuDataBySlug(slug, { locale });

  if (!data) {
    notFound();
  }

  return <MenuPageRenderer mode="public" {...data} />;
}
