import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MenuTemplateRenderer, { type PublicMenuTemplateProps } from "@/components/menu-templates/MenuTemplateRenderer";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type MenuSite = Pick<
  Database["public"]["Tables"]["menu_sites"]["Row"],
  | "id"
  | "name"
  | "slug"
  | "template_key"
  | "description"
  | "logo_url"
  | "cover_image_url"
  | "brand_color"
  | "business_name"
  | "business_address"
  | "business_phone"
>;

type MenuCategory = Pick<
  Database["public"]["Tables"]["menu_categories"]["Row"],
  "id" | "name" | "description" | "sort_order"
>;

type MenuItem = Pick<
  Database["public"]["Tables"]["menu_items"]["Row"],
  | "id"
  | "category_id"
  | "name"
  | "description"
  | "price"
  | "image_url"
  | "badge"
  | "is_best"
  | "is_sold_out"
  | "sort_order"
>;

type MenuEvent = Pick<
  Database["public"]["Tables"]["menu_events"]["Row"],
  "id" | "title" | "description" | "image_url" | "sort_order"
>;

type MenuChef = Pick<
  Database["public"]["Tables"]["menu_chefs"]["Row"],
  "id" | "name" | "role" | "bio" | "image_url" | "sort_order"
>;

type MenuSocialLink = Pick<
  Database["public"]["Tables"]["menu_social_links"]["Row"],
  "id" | "label" | "url" | "sort_order"
>;

async function getPublicMenu(slug: string): Promise<PublicMenuTemplateProps | null> {
  const supabase = await createClient();

  const { data: site, error: siteError } = await supabase
    .from("menu_sites")
    .select(
      "id, name, slug, template_key, description, logo_url, cover_image_url, brand_color, business_name, business_address, business_phone"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (siteError || !site) {
    return null;
  }

  const menuSite = site as MenuSite;

  const [
    { data: categoriesData, error: categoriesError },
    { data: itemsData, error: itemsError },
    { data: eventsData },
    { data: chefsData },
    { data: socialLinksData },
  ] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, description, sort_order")
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id, category_id, name, description, price, image_url, badge, is_best, is_sold_out, sort_order")
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("menu_events")
      .select("id, title, description, image_url, sort_order")
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("menu_chefs")
      .select("id, name, role, bio, image_url, sort_order")
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("menu_social_links")
      .select("id, label, url, sort_order")
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (categoriesError || itemsError) {
    return null;
  }

  return {
    menuSite,
    categories: (categoriesData ?? []) as MenuCategory[],
    items: (itemsData ?? []) as MenuItem[],
    events: (eventsData ?? []) as MenuEvent[],
    chefs: (chefsData ?? []) as MenuChef[],
    socialLinks: (socialLinksData ?? []) as MenuSocialLink[],
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicMenu(slug);

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

export default async function PublicMenuPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getPublicMenu(slug);

  if (!data) {
    notFound();
  }

  return <MenuTemplateRenderer {...data} />;
}
