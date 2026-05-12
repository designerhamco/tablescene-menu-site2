import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { normalizeLocale } from "@/lib/locales";
import { getPublicMenuDataBySlug } from "@/lib/menu-page-data";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicMenuDataBySlug(slug);

  if (!data) {
    return {
      title: "공개되지 않은 메뉴판 | Table Scene",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${data.menuSite.business_name || data.menuSite.name} 메뉴판`;
  const description = data.menuSite.description || `${data.menuSite.name}의 Table Scene 디지털 메뉴판입니다.`;

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

export default async function PublicMenuPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = normalizeLocale(getSearchParamValue(query.lang));
  const data = await getPublicMenuDataBySlug(slug, { locale });

  if (!data) {
    notFound();
  }

  return <MenuPageRenderer mode="public" {...data} />;
}
