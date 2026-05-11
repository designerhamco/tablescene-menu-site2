import Link from "next/link";
import { redirect } from "next/navigation";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import {
  resetBadgeStylesAction,
  resetTypographySettingsAction,
  updateAboutAction,
  updateBadgeStylesAction,
  updateIntroAction,
  updateMenuCoverAction,
  updateMenuSiteAction,
  updatePageSettingsAction,
  updatePublishSettingsAction,
  updateTypographySettingsAction,
} from "@/app/mypage/menus/actions";
import SiteHeader from "@/components/layout/SiteHeader";
import MenuEditorNavigation from "@/components/mypage/menu-editor/MenuEditorNavigation";
import ImageUploadField from "@/components/mypage/menu-editor/ImageUploadField";
import MenuManagementSection from "@/components/mypage/menu-editor/MenuManagementSection";
import MenuEditorScrollRestoration from "@/components/mypage/menu-editor/MenuEditorScrollRestoration";
import SwitchField from "@/components/mypage/menu-editor/SwitchField";
import {
  ChefsSection as InteractiveChefsSection,
  EventsSection as InteractiveEventsSection,
  SocialLinksSection as InteractiveSocialLinksSection,
} from "@/components/mypage/menu-editor/OptionalContentSections";
import { MENU_FIELD_LIMITS } from "@/lib/menu-limits";
import {
  MENU_EDITOR_CAPABILITIES,
  getMenuEditorServiceType,
  isMenuEditorTabEnabled,
} from "@/lib/menu-editor-capabilities";
import { MENU_EDITOR_TABS, isMenuEditorTabKey, pageSettingKeys, pageSettingLabels } from "@/lib/menu-editor";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { RESTAURANT_TYPE_OPTIONS } from "@/lib/restaurant-types";
import { createClient } from "@/lib/supabase/server";
import type { Database, MenuSiteStatus } from "@/lib/supabase/types";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import {
  BADGE_STYLE_KEYS,
  BADGE_STYLE_LABELS,
  getCustomBadgeStyles,
  getDefaultBadgeStyles,
  mergeBadgeStyles,
} from "@/lib/template-badge-styles";
import { getTemplateDisplayName } from "@/lib/templates";
import {
  ENGLISH_FONT_OPTIONS,
  FONT_SIZE_SCALE_OPTIONS,
  KOREAN_FONT_OPTIONS,
  getCustomTypographySettings,
  getDefaultTypographyPreset,
  mergeTypographySettings,
} from "@/lib/template-typography-presets";
import { formatMenuPrice, mergePageSettings } from "@/types/menu";

type MenuSite = Pick<
  Database["public"]["Tables"]["menu_sites"]["Row"],
  | "id"
  | "user_id"
  | "name"
  | "slug"
  | "template_key"
  | "template_category"
  | "status"
  | "published_at"
  | "restaurant_name"
  | "restaurant_category"
  | "restaurant_type"
  | "restaurant_address"
  | "restaurant_phone"
  | "intro_title"
  | "intro_description"
  | "brand_description"
  | "menu_cover_label"
  | "menu_cover_title"
  | "menu_cover_description"
  | "about_description"
  | "opening_hours"
  | "map_url"
  | "logo_url"
  | "cover_image_url"
  | "settings"
  | "page_settings"
>;
type MenuCategory = Pick<
  Database["public"]["Tables"]["menu_categories"]["Row"],
  "id" | "menu_page_id" | "name" | "description" | "description_visible" | "section_key" | "sort_order" | "visible"
>;
type MenuPage = Pick<
  Database["public"]["Tables"]["menu_pages"]["Row"],
  "id" | "title" | "description" | "description_visible" | "legacy_section_key" | "visible" | "sort_order" | "created_at"
>;
type MenuItem = Pick<
  Database["public"]["Tables"]["menu_items"]["Row"],
  | "id"
  | "category_id"
  | "name"
  | "set_name"
  | "description"
  | "price"
  | "price_label"
  | "price_visible"
  | "portion_label"
  | "portion_visible"
  | "image_url"
  | "badge_label"
  | "badge_type"
  | "recommended"
  | "origin_info"
  | "is_best"
  | "is_sold_out"
  | "traits_visible"
  | "visible"
  | "sort_order"
>;
type MenuItemTrait = Database["public"]["Tables"]["menu_item_traits"]["Row"];
type MenuItemPriceOption = Database["public"]["Tables"]["menu_item_price_options"]["Row"];
type MenuChef = Database["public"]["Tables"]["menu_chefs"]["Row"];
type MenuEvent = Database["public"]["Tables"]["menu_events"]["Row"];
type MenuSocialLink = Database["public"]["Tables"]["menu_social_links"]["Row"];
type MenuSiteOrder = Pick<Database["public"]["Tables"]["orders"]["Row"], "product_key">;

type PageProps = {
  params: Promise<{ menuId: string }>;
  searchParams: Promise<{ error?: string; message?: string; tab?: string }>;
};

const statusLabels: Record<MenuSiteStatus, string> = {
  draft: "작성중",
  published: "공개중",
  archived: "보관됨",
};

const baseMenuSiteSelect =
  "id, user_id, name, slug, template_key, status, published_at, restaurant_name, restaurant_category, restaurant_address, restaurant_phone, intro_title, intro_description, brand_description, menu_cover_title, menu_cover_description, about_description, opening_hours, map_url, logo_url, cover_image_url, settings, page_settings";
const menuSiteSelect = baseMenuSiteSelect
  .replace("template_key", "template_key, template_category")
  .replace("restaurant_category", "restaurant_category, restaurant_type")
  .replace("menu_cover_title", "menu_cover_label, menu_cover_title");

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function FieldHint({ children }: { children?: ReactNode }) {
  if (!children) {
    return null;
  }

  return <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">{children}</p>;
}

function TextInput({ helperText, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { helperText?: ReactNode }) {
  const displayValue = props.value ?? props.defaultValue ?? "";
  const currentLength = typeof displayValue === "string" || typeof displayValue === "number" ? String(displayValue).length : 0;

  return (
    <>
      <input
        {...props}
        className={`mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 disabled:bg-zinc-100 disabled:text-zinc-400 ${
          className ?? ""
        }`}
      />
      {(helperText || props.maxLength) && (
        <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
          <span className="break-keep">{helperText}</span>
          {props.maxLength && <span className="shrink-0">{currentLength} / {props.maxLength}</span>}
        </div>
      )}
    </>
  );
}

function ColorInput({ name, defaultValue }: { name: string; defaultValue: string }) {
  return (
    <div className="mt-2 flex overflow-hidden rounded-lg border border-zinc-200 bg-white focus-within:border-zinc-950">
      <input type="color" name={name} defaultValue={defaultValue} className="h-11 w-14 shrink-0 cursor-pointer border-0 bg-transparent p-1" />
      <input
        type="text"
        defaultValue={defaultValue}
        readOnly
        pattern="#[0-9A-Fa-f]{6}"
        className="min-w-0 flex-1 px-3 text-sm font-semibold uppercase text-zinc-900 outline-none"
        aria-label={name}
      />
    </div>
  );
}

function TextArea({ helperText, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { helperText?: ReactNode }) {
  const displayValue = props.value ?? props.defaultValue ?? "";
  const currentLength = typeof displayValue === "string" || typeof displayValue === "number" ? String(displayValue).length : 0;

  return (
    <>
      <textarea
        {...props}
        className={`mt-2 min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 ${
          className ?? ""
        }`}
      />
      {(helperText || props.maxLength) && (
        <div className="mt-2 flex items-start justify-between gap-3 text-xs font-bold leading-relaxed text-zinc-400">
          <span className="break-keep">{helperText}</span>
          {props.maxLength && <span className="shrink-0">{currentLength} / {props.maxLength}</span>}
        </div>
      )}
    </>
  );
}

function Select({ helperText, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { helperText?: ReactNode }) {
  return (
    <>
      <select
        {...props}
        className={`mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 ${
          className ?? ""
        }`}
      />
      <FieldHint>{helperText}</FieldHint>
    </>
  );
}

function Checkbox({ name, defaultChecked, label }: { name: string; defaultChecked?: boolean; label: string }) {
  return <SwitchField name={name} label={label} defaultChecked={defaultChecked} onText="사용 중" offText="사용 안 함" />;
}

function SubmitButton({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "light" | "danger" }) {
  const className = {
    dark: "bg-zinc-950 text-white hover:bg-zinc-800",
    light: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
    danger: "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
  }[tone];

  return (
    <button type="submit" className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors ${className}`}>
      {children}
    </button>
  );
}

function SectionCard({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p>}
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function CustomEditorUnavailable({ siteName }: { siteName: string }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <div className="mx-auto w-full max-w-3xl">
          <Link href="/mypage" className="mb-5 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
            마이페이지로 돌아가기
          </Link>
          <section className="rounded-lg bg-white p-8 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Custom Project</p>
            <h1 className="break-keep text-3xl font-bold tracking-tight text-zinc-950">테이블씬 커스텀은 맞춤 제작형 서비스입니다.</h1>
            <div className="mt-5 space-y-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
              <p>담당자 상담을 통해 제작이 진행되며, 일반 편집 페이지에서는 수정할 수 없습니다.</p>
              <p>{siteName} 프로젝트는 상담 및 제작 진행 상황에 맞춰 별도로 안내됩니다.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/mypage" className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800">
                마이페이지로 돌아가기
              </Link>
              <Link href="/mypage/inquiries" className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-100">
                상담 내역 확인하기
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function HiddenMenuId({ menuId }: { menuId: string }) {
  return <input type="hidden" name="menuId" value={menuId} />;
}

export default async function EditMenuPage({ params, searchParams }: PageProps) {
  const { menuId } = await params;
  const { error, message, tab } = await searchParams;
  const requestedActiveTab = isMenuEditorTabKey(tab) ? tab : "basic";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/mypage/menus/${menuId}/edit`);
  }

  const primaryMenuSiteResult = await supabase
    .from("menu_sites")
    .select(menuSiteSelect)
    .eq("id", menuId)
    .eq("user_id", user.id)
    .maybeSingle();
  let menuSite = primaryMenuSiteResult.data as unknown;
  let menuSiteError = primaryMenuSiteResult.error;

  if (menuSiteError && ["template_category", "restaurant_type", "menu_cover_label"].some((column) => menuSiteError.message.toLowerCase().includes(column))) {
    const fallbackResult = await supabase
      .from("menu_sites")
      .select(baseMenuSiteSelect)
      .eq("id", menuId)
      .eq("user_id", user.id)
      .maybeSingle();

    menuSite = fallbackResult.data as unknown;
    menuSiteError = fallbackResult.error;
  }

  if (menuSiteError || !menuSite) {
    redirect("/mypage?error=menu-not-found");
  }

  const site = menuSite as MenuSite;
  const [
    { data: menuPagesData },
    { data: categoriesData },
    { data: itemsData, error: itemsError },
    { data: priceOptionsData, error: priceOptionsError },
    { data: traitsData },
    { data: chefsData },
    { data: eventsData },
    { data: socialLinksData },
    { data: orderData },
  ] =
    await Promise.all([
      supabase
        .from("menu_pages")
        .select("id, title, description, description_visible, legacy_section_key, visible, sort_order, created_at")
        .eq("menu_site_id", menuId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("menu_categories")
        .select("id, menu_page_id, name, description, description_visible, section_key, sort_order, visible")
        .eq("menu_site_id", menuId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("menu_items")
        .select(
          "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, badge_label, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order"
        )
        .eq("menu_site_id", menuId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("menu_item_price_options")
        .select("*")
        .eq("menu_site_id", menuId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("menu_item_traits")
        .select("id, menu_site_id, menu_item_id, label, value, max_value, visible, sort_order, created_at, updated_at")
        .eq("menu_site_id", menuId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("menu_chefs")
        .select("*")
        .eq("menu_site_id", menuId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("menu_events")
        .select("*")
        .eq("menu_site_id", menuId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("menu_social_links")
        .select("*")
        .eq("menu_site_id", menuId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("orders")
        .select("product_key")
        .eq("menu_site_id", menuId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const menuPages = (menuPagesData ?? []) as MenuPage[];
  const categories = (categoriesData ?? []) as MenuCategory[];
  const isMissingBadgeLabelColumn =
    itemsError &&
    (itemsError.message.toLowerCase().includes("badge_label") ||
      itemsError.message.toLowerCase().includes("could not find") ||
      itemsError.code === "42703");
  const { data: legacyItemsData } =
    isMissingBadgeLabelColumn
      ? await supabase
          .from("menu_items")
          .select(
            "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order"
          )
          .eq("menu_site_id", menuId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : { data: null };
  const items = ((isMissingBadgeLabelColumn ? legacyItemsData : itemsData) ?? []) as MenuItem[];
  const isMissingPriceOptionsTable =
    priceOptionsError &&
    (priceOptionsError.message.toLowerCase().includes("menu_item_price_options") ||
      priceOptionsError.message.toLowerCase().includes("does not exist") ||
      priceOptionsError.code === "42P01");
  const priceOptions = (isMissingPriceOptionsTable ? [] : priceOptionsData ?? []) as MenuItemPriceOption[];
  const traits = (traitsData ?? []) as MenuItemTrait[];
  const chefs = (chefsData ?? []) as MenuChef[];
  const events = (eventsData ?? []) as MenuEvent[];
  const socialLinks = (socialLinksData ?? []) as MenuSocialLink[];
  const pageSettings = mergePageSettings(site.page_settings);
  const latestOrder = orderData as MenuSiteOrder | null;
  const editorServiceType = getMenuEditorServiceType(latestOrder?.product_key);

  if (editorServiceType === "custom") {
    return <CustomEditorUnavailable siteName={site.name} />;
  }

  const editorCapabilities = MENU_EDITOR_CAPABILITIES[editorServiceType];
  const templateCapabilities = getTemplateCapabilities(site.template_key);
  const customBadgeStyles = getCustomBadgeStyles(site.settings, site.page_settings);
  const badgeStyles = mergeBadgeStyles(site.template_key, customBadgeStyles);
  const defaultBadgeStyles = getDefaultBadgeStyles(site.template_key);
  const hasCustomBadgeStyles = Boolean(customBadgeStyles);
  const customTypography = getCustomTypographySettings(site.settings, site.page_settings);
  const typographySettings = mergeTypographySettings(site.template_key, customTypography);
  const defaultTypography = getDefaultTypographyPreset(site.template_key);
  const hasCustomTypography = Boolean(customTypography);
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const featuredItemOptions = items.map((item) => ({
    id: item.id,
    label: item.name,
    categoryName: item.category_id ? categoryNameById.get(item.category_id) ?? "미분류" : "미분류",
    price: formatMenuPrice(item) ?? "문의",
    imageStatus: item.image_url ? "이미지 있음" : "이미지 없음",
  }));
  const visibleEditorTabs = MENU_EDITOR_TABS.filter((item) => {
    if (!isMenuEditorTabEnabled(item.key, editorCapabilities)) {
      return false;
    }

    return templateCapabilities.events || item.key !== "events";
  });
  const activeTab = visibleEditorTabs.some((item) => item.key === requestedActiveTab) ? requestedActiveTab : "basic";
  const templateDisplayName = getTemplateDisplayName(site.template_key, site.template_category);
  const publicUrl = getPublicMenuUrl(site.slug);
  const previewUrl = `/mypage/menus/${site.id}/preview`;
  const isSlugLocked = site.status === "published" || Boolean(site.published_at);
  const checklist = [
    { label: "매장명 입력", ok: Boolean(site.restaurant_name || site.name) },
    { label: "공개 메뉴판 주소 설정", ok: Boolean(site.slug) },
    { label: "메뉴 페이지 1개 이상", ok: menuPages.length > 0 },
    { label: "메뉴 카테고리 1개 이상", ok: categories.length > 0 },
    { label: "메뉴 아이템 1개 이상", ok: items.length > 0 },
  ];
  const optionalChecklist = [
    editorCapabilities.introPage ? { label: "인트로 페이지 사용", ok: pageSettings.intro_enabled } : null,
    editorCapabilities.menuCoverPage ? { label: "메뉴 커버 페이지 사용", ok: pageSettings.menu_cover_enabled } : null,
    editorCapabilities.aboutPage ? { label: "소개 페이지 사용", ok: pageSettings.about_enabled } : null,
    editorCapabilities.eventPage && templateCapabilities.events ? { label: "이벤트 등록", ok: events.length > 0 } : null,
    editorCapabilities.socialLinks && templateCapabilities.socialLinks ? { label: "SNS 등록", ok: socialLinks.length > 0 } : null,
    editorCapabilities.chefs && templateCapabilities.chefs ? { label: "셰프/인물 등록", ok: chefs.length > 0 } : null,
  ].filter((item): item is { label: string; ok: boolean } => Boolean(item));

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <MenuEditorScrollRestoration menuId={menuId} />
        <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <Link href="/mypage" className="mb-5 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
            마이페이지로 돌아가기
          </Link>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${site.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {statusLabels[site.status]}
                </span>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">{templateDisplayName}</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{site.name}</h1>
              <p className="mt-3 text-sm font-bold text-zinc-400">{publicUrl}</p>
              <p className="mt-2 break-keep text-sm font-semibold text-zinc-500">결제 시 선택한 템플릿입니다.</p>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <div className="flex flex-wrap gap-2">
                <Link href={previewUrl} className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white">
                  미리보기
                </Link>
                {site.status === "published" ? (
                  <Link href={publicUrl} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
                    공개 페이지 보기
                  </Link>
                ) : (
                  <button type="button" disabled className="cursor-not-allowed rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
                    공개 페이지 보기
                  </button>
                )}
              </div>
              <p className="text-xs font-bold text-zinc-400">공개 후 손님이 볼 수 있는 주소입니다.</p>
              <p className="text-xs font-bold text-emerald-700">저장하면 각 섹션이 즉시 반영됩니다.</p>
            </div>
          </div>
        </header>

        {message && <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</div>}
        {error && <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

        <MenuEditorNavigation menuId={menuId} activeTab={activeTab} tabs={visibleEditorTabs} />

        <div className="space-y-6">
            {activeTab === "basic" && (
              <SectionCard title="기본 정보" eyebrow="Basic">
                <form action={updateMenuSiteAction} className="grid gap-5 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  <div>
                    <FieldLabel required>메뉴판 관리용 이름</FieldLabel>
                    <TextInput name="name" defaultValue={site.name} required maxLength={MENU_FIELD_LIMITS.menuSites.name} helperText={`마이페이지에서 구분할 이름입니다. 최대 ${MENU_FIELD_LIMITS.menuSites.name}자까지 입력할 수 있습니다.`} />
                  </div>
                  <div>
                    <FieldLabel>실제 매장명</FieldLabel>
                    <TextInput name="restaurant_name" defaultValue={site.restaurant_name ?? ""} maxLength={MENU_FIELD_LIMITS.menuSites.restaurantName} helperText="공개 메뉴판에 표시될 매장명입니다." />
                  </div>
                  <div>
                    <FieldLabel>업종</FieldLabel>
                    <Select name="restaurant_type" defaultValue={site.restaurant_type ?? ""} helperText="업종은 템플릿 추천과 기본 데이터 구성에 활용됩니다.">
                      <option value="">선택해주세요</option>
                      {RESTAURANT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>공개 주소</FieldLabel>
                    {isSlugLocked && <input type="hidden" name="slug" value={site.slug} />}
                    <TextInput name="slug" defaultValue={site.slug} required disabled={isSlugLocked} minLength={MENU_FIELD_LIMITS.menuSites.slugMin} maxLength={MENU_FIELD_LIMITS.menuSites.slugMax} pattern="[a-z0-9-]+" title="영문 소문자, 숫자, 하이픈만 입력할 수 있습니다." helperText="영문 소문자, 숫자, 하이픈만 사용할 수 있습니다." />
                    <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
                      공개 후에는 QR 코드와 공유 링크 유지를 위해 주소를 변경할 수 없습니다.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>템플릿</FieldLabel>
                    <TextInput value={templateDisplayName} readOnly helperText="결제 시 선택한 템플릿입니다." />
                  </div>
                  <div className="md:col-span-2">
                    <ImageUploadField
                      label="로고 이미지"
                      menuId={site.id}
                      target="site-logo"
                      currentUrl={site.logo_url}
                      description="상단바에 표시됩니다. 등록하지 않으면 매장명이 표시됩니다."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <SubmitButton>기본 정보 저장</SubmitButton>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "pages" && (
              <SectionCard title="페이지 설정" eyebrow="Pages">
                <form action={updatePageSettingsAction} className="grid gap-4 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  {pageSettingKeys.map((key) => (
                    <div key={key} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                      <Checkbox name={key} label={pageSettingLabels[key]} defaultChecked={pageSettings[key]} />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <SubmitButton>페이지 설정 저장</SubmitButton>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "intro" && (
              <SectionCard title="인트로" eyebrow="Intro">
                <form action={updateIntroAction} className="grid gap-5 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  <div>
                    <FieldLabel required>인트로 제목</FieldLabel>
                    <TextInput name="intro_title" defaultValue={site.intro_title ?? ""} required maxLength={MENU_FIELD_LIMITS.menuSites.introTitle} helperText="첫 화면에서 가장 크게 보이는 제목입니다." />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel required>인트로 설명</FieldLabel>
                    <TextArea name="intro_description" defaultValue={site.intro_description ?? ""} required maxLength={MENU_FIELD_LIMITS.menuSites.introDescription} helperText={`매장의 첫인상을 설명하는 문구입니다. 최대 ${MENU_FIELD_LIMITS.menuSites.introDescription}자까지 입력할 수 있습니다.`} />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>브랜드 설명</FieldLabel>
                    <TextArea name="brand_description" defaultValue={site.brand_description ?? ""} maxLength={MENU_FIELD_LIMITS.menuSites.brandDescription} helperText="브랜드나 공간의 분위기를 소개해주세요." />
                  </div>
                  <div className="md:col-span-2">
                    <ImageUploadField
                      label="인트로 배경 이미지"
                      menuId={site.id}
                      target="site-cover"
                      currentUrl={site.cover_image_url}
                      description="등록하면 어두운 오버레이가 적용되고 흰색 텍스트로 표시됩니다. 등록하지 않으면 단색 배경으로 표시됩니다."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <SubmitButton>인트로 저장</SubmitButton>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "cover" && (
              <SectionCard title="메뉴 커버" eyebrow="Cover">
                <form action={updateMenuCoverAction} className="grid gap-5 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  <div className="md:col-span-2">
                    <p className="rounded-lg bg-zinc-50 p-4 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                      메뉴 커버 페이지는 메뉴 페이지로 들어가기 전 보여지는 텍스트 중심 화면입니다.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>커버 상단 문구</FieldLabel>
                    <TextInput
                      name="menu_cover_label"
                      defaultValue={site.menu_cover_label ?? site.restaurant_category ?? ""}
                      placeholder="SPECIALTY COFFEE / BRUNCH CAFE / FINE DINING / TODAY'S MENU / DESSERT & COFFEE"
                      maxLength={MENU_FIELD_LIMITS.menuSites.menuCoverLabel}
                      helperText="메뉴 커버 페이지 상단에 작게 표시되는 문구입니다."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel required>메뉴 커버 제목</FieldLabel>
                    <TextInput name="menu_cover_title" defaultValue={site.menu_cover_title ?? ""} required maxLength={MENU_FIELD_LIMITS.menuSites.menuCoverTitle} helperText="메뉴 영역 상단에 표시되는 제목입니다." />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel required>메뉴 커버 설명</FieldLabel>
                    <TextArea name="menu_cover_description" defaultValue={site.menu_cover_description ?? ""} required maxLength={MENU_FIELD_LIMITS.menuSites.menuCoverDescription} helperText={`메뉴 소개 문구를 입력해주세요. 최대 ${MENU_FIELD_LIMITS.menuSites.menuCoverDescription}자까지 입력할 수 있습니다.`} />
                  </div>
                  <div className="md:col-span-2 rounded-lg border border-zinc-100 bg-zinc-50 p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold tracking-tight text-zinc-950">대표 추천 메뉴</h3>
                      <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                        대표 추천 메뉴는 일부 템플릿에서 메뉴판의 커버형 영역에 크게 표시됩니다. 이미지가 등록된 메뉴를 선택하면 대표 상품처럼 노출할 수 있습니다.
                      </p>
                    </div>
                    <div className="grid gap-5">
                      <Checkbox name="featured_item_enabled" label="대표 추천 메뉴 사용" defaultChecked={pageSettings.featured_item_enabled} />
                      <div>
                        <FieldLabel>대표 추천 메뉴</FieldLabel>
                        <Select
                          name="featured_item_id"
                          defaultValue={pageSettings.featured_item_id ?? ""}
                          helperText="대표 추천 메뉴는 이미지가 있을 때 가장 잘 보입니다. 이미지가 없는 경우 공개 메뉴판에서 대표 영역이 표시되지 않을 수 있습니다."
                        >
                          <option value="">대표로 보여줄 메뉴를 선택해주세요</option>
                          {featuredItemOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label} · {item.categoryName} · {item.price} · {item.imageStatus}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {(!templateCapabilities.featuredItemHero || !templateCapabilities.menuItemImages) && (
                        <p className="break-keep rounded-lg bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-700">
                          현재 선택한 템플릿은 대표 추천 메뉴 영역을 사용하지 않습니다. 설정값은 저장되지만 공개 메뉴판에는 표시되지 않을 수 있습니다.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <SubmitButton>메뉴 커버 저장</SubmitButton>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "menu" && (
              <MenuManagementSection menuId={site.id} menuPages={menuPages} categories={categories} items={items} priceOptions={priceOptions} traits={traits} capabilities={templateCapabilities} />
            )}

            {activeTab === "about" && (
              <>
                <SectionCard title="소개" eyebrow="About">
                  <form action={updateAboutAction} className="grid gap-5 md:grid-cols-2">
                    <HiddenMenuId menuId={site.id} />
                    <div>
                      <FieldLabel required>주소</FieldLabel>
                      <TextInput name="restaurant_address" defaultValue={site.restaurant_address ?? ""} required maxLength={MENU_FIELD_LIMITS.menuSites.restaurantAddress} helperText="공개 메뉴판의 소개 영역에 표시됩니다." />
                    </div>
                    <div>
                      <FieldLabel required>전화번호</FieldLabel>
                      <TextInput name="restaurant_phone" defaultValue={site.restaurant_phone ?? ""} required inputMode="tel" maxLength={20} pattern="[0-9+\-()\s]{8,20}" title="숫자, 하이픈, 공백, +, 괄호만 입력할 수 있습니다." helperText="숫자, 하이픈, 공백, +, 괄호만 입력할 수 있습니다." />
                    </div>
                    <div>
                      <FieldLabel required>영업시간</FieldLabel>
                      <TextInput name="opening_hours" defaultValue={site.opening_hours ?? ""} required maxLength={MENU_FIELD_LIMITS.menuSites.openingHours} helperText="예: 매일 10:00 - 21:00" />
                    </div>
                    <div>
                      <FieldLabel>지도 URL</FieldLabel>
                      <TextInput name="map_url" defaultValue={site.map_url ?? ""} type="url" placeholder="https://..." maxLength={MENU_FIELD_LIMITS.menuSites.mapUrl} helperText="네이버지도, 카카오맵, 구글맵 링크를 입력할 수 있습니다." />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel required>소개 문구</FieldLabel>
                      <TextArea name="about_description" defaultValue={site.about_description ?? ""} required maxLength={MENU_FIELD_LIMITS.menuSites.aboutDescription} helperText={`매장 소개 영역에 표시됩니다. 최대 ${MENU_FIELD_LIMITS.menuSites.aboutDescription}자까지 입력할 수 있습니다.`} />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>브랜드 설명</FieldLabel>
                      <TextArea name="brand_description" defaultValue={site.brand_description ?? ""} maxLength={MENU_FIELD_LIMITS.menuSites.brandDescription} helperText="브랜드 스토리나 운영 철학을 입력해주세요." />
                    </div>
                    <div className="md:col-span-2">
                      <SubmitButton>소개 저장</SubmitButton>
                    </div>
                  </form>
                </SectionCard>
                {editorCapabilities.chefs && templateCapabilities.chefs && <InteractiveChefsSection menuId={site.id} chefs={chefs} />}
                {editorCapabilities.socialLinks && templateCapabilities.socialLinks && <InteractiveSocialLinksSection menuId={site.id} socialLinks={socialLinks} />}
              </>
            )}

            {editorCapabilities.eventPage && templateCapabilities.events && activeTab === "events" && <InteractiveEventsSection menuId={site.id} events={events} />}

            {activeTab === "design" && (
              <SectionCard title="디자인" eyebrow="Design">
                <div className="space-y-5">
                  <div>
                    <FieldLabel>현재 템플릿</FieldLabel>
                    <TextInput value={templateDisplayName} readOnly helperText="템플릿 변경 기능은 추후 제공 예정입니다." />
                  </div>
                  <p className="break-keep text-sm font-semibold leading-relaxed text-zinc-500">결제 시 선택한 템플릿입니다.</p>
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-5">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-zinc-950">글꼴과 글자 크기</h3>
                        <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                          메뉴판의 한글/영문 글꼴과 전체 글자 크기를 조정할 수 있습니다. 템플릿의 기본 디자인을 유지하는 범위에서 적용됩니다.
                        </p>
                      </div>
                      <form action={resetTypographySettingsAction}>
                        <HiddenMenuId menuId={site.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-100"
                        >
                          기본값으로 되돌리기
                        </button>
                      </form>
                    </div>
                    <form action={updateTypographySettingsAction} className="mt-5 space-y-5">
                      <HiddenMenuId menuId={site.id} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <FieldLabel>한글 폰트</FieldLabel>
                          <Select name="korean_font_key" defaultValue={typographySettings.korean_font_key}>
                            {KOREAN_FONT_OPTIONS.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                          <p
                            className="mt-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700"
                            style={{ fontFamily: KOREAN_FONT_OPTIONS.find((option) => option.key === typographySettings.korean_font_key)?.fontFamily }}
                          >
                            아메리카노 4,500
                          </p>
                        </div>
                        <div>
                          <FieldLabel>영문 폰트</FieldLabel>
                          <Select name="english_font_key" defaultValue={typographySettings.english_font_key}>
                            {ENGLISH_FONT_OPTIONS.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                          <p
                            className="mt-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700"
                            style={{ fontFamily: ENGLISH_FONT_OPTIONS.find((option) => option.key === typographySettings.english_font_key)?.fontFamily }}
                          >
                            Signature Coffee
                          </p>
                        </div>
                      </div>
                      <div>
                        <FieldLabel>글자 크기</FieldLabel>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          {FONT_SIZE_SCALE_OPTIONS.map((option) => (
                            <label
                              key={option.key}
                              className={`cursor-pointer rounded-lg border bg-white p-4 transition ${
                                typographySettings.font_size_scale_key === option.key
                                  ? "border-zinc-950 ring-2 ring-zinc-950/10"
                                  : "border-zinc-200 hover:border-zinc-400"
                              }`}
                            >
                              <input
                                type="radio"
                                name="font_size_scale_key"
                                value={option.key}
                                defaultChecked={typographySettings.font_size_scale_key === option.key}
                                className="sr-only"
                              />
                              <span className="block text-lg font-black text-zinc-950">{option.label}</span>
                              <span className="mt-1 block break-keep text-xs font-bold leading-relaxed text-zinc-400">{option.description}</span>
                            </label>
                          ))}
                        </div>
                        <FieldHint>메뉴 수가 적어 화면이 허전해 보이면 L을 선택해 더 크게 보여줄 수 있습니다.</FieldHint>
                      </div>
                      {!hasCustomTypography && (
                        <p className="break-keep text-xs font-bold leading-relaxed text-zinc-400">
                          현재 템플릿 기본값: {defaultTypography.korean_font_key} / {defaultTypography.english_font_key} / {defaultTypography.font_size_scale_key.toUpperCase()}
                        </p>
                      )}
                      <SubmitButton>글꼴 설정 저장</SubmitButton>
                    </form>
                  </div>
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-5">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-zinc-950">배지/칩 색상</h3>
                        <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                          BEST, SIGNATURE, NEW, 추천 같은 메뉴 배지의 배경색과 글자색을 각각 설정할 수 있습니다.
                        </p>
                      </div>
                      <form action={resetBadgeStylesAction}>
                        <HiddenMenuId menuId={site.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-100"
                        >
                          전체 기본값으로 되돌리기
                        </button>
                      </form>
                    </div>
                    {!templateCapabilities.itemBadges && (
                      <p className="mt-4 break-keep rounded-lg bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-700">
                        현재 선택한 템플릿은 메뉴 배지를 사용하지 않습니다. 설정값은 저장되지만 공개 메뉴판에는 표시되지 않을 수 있습니다.
                      </p>
                    )}
                    <form action={updateBadgeStylesAction} className="mt-5 space-y-3">
                      <HiddenMenuId menuId={site.id} />
                      <fieldset className="space-y-3">
                        {BADGE_STYLE_KEYS.map((key) => {
                          const style = badgeStyles[key];
                          const defaultStyle = defaultBadgeStyles[key];

                          return (
                            <div key={key} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_170px_170px] md:items-end">
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{BADGE_STYLE_LABELS[key]}</p>
                                <span
                                  className="mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black"
                                  style={{ backgroundColor: style.background_color, color: style.text_color }}
                                >
                                  {BADGE_STYLE_LABELS[key]}
                                </span>
                                {!hasCustomBadgeStyles && (
                                  <p className="mt-2 text-xs font-bold text-zinc-400">
                                    템플릿 기본값 {defaultStyle.background_color} / {defaultStyle.text_color}
                                  </p>
                                )}
                              </div>
                              <div>
                                <FieldLabel>배경색</FieldLabel>
                                <ColorInput name={`badge_${key}_background_color`} defaultValue={style.background_color} />
                              </div>
                              <div>
                                <FieldLabel>글자색</FieldLabel>
                                <ColorInput name={`badge_${key}_text_color`} defaultValue={style.text_color} />
                              </div>
                            </div>
                          );
                        })}
                      </fieldset>
                      <div className="flex flex-wrap items-center gap-3">
                        <SubmitButton>배지 색상 저장</SubmitButton>
                        <p className="break-keep text-xs font-bold leading-relaxed text-zinc-400">
                          현재 템플릿의 기본 배지 색상으로 되돌리려면 전체 기본값으로 되돌리기를 사용하세요.
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeTab === "publish" && (
              <SectionCard title="공개 설정" eyebrow="Publish">
                <form action={updatePublishSettingsAction} className="space-y-5">
                  <HiddenMenuId menuId={site.id} />
                  <div>
                    <FieldLabel>공개 상태</FieldLabel>
                    <Select name="status" defaultValue={site.status} helperText="공개중으로 변경하면 고객이 메뉴판 URL로 접근할 수 있습니다.">
                      <option value="draft">작성중</option>
                      <option value="published">공개중</option>
                      <option value="archived">보관됨</option>
                    </Select>
                  </div>
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-5">
                    <h3 className="font-bold">공개 전 필수 체크리스트</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {checklist.map((item) => (
                        <p key={item.label} className={`text-sm font-bold ${item.ok ? "text-emerald-700" : "text-zinc-400"}`}>
                          {item.ok ? "완료" : "필요"} · {item.label}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-100 bg-white p-5">
                    <h3 className="font-bold">선택 콘텐츠</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {optionalChecklist.map((item) => (
                        <p key={item.label} className={`text-sm font-bold ${item.ok ? "text-emerald-700" : "text-zinc-400"}`}>
                          {item.ok ? "사용 중" : "미사용"} · {item.label}
                        </p>
                      ))}
                    </div>
                  </div>
                  {isSlugLocked && <p className="break-keep text-sm font-bold text-amber-700">published_at 기준으로 공개 주소는 잠겨 있습니다.</p>}
                  <SubmitButton>공개 설정 저장</SubmitButton>
                </form>
              </SectionCard>
            )}
        </div>
        </div>
      </main>
    </>
  );
}
