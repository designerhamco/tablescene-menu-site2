import Link from "next/link";
import { redirect } from "next/navigation";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import {
  updateAboutAction,
  updateEventsAction,
  updateIntroAction,
  updateDesignSettingsAction,
  updateMenuCoverAction,
  updateMenuSiteAction,
  updatePageSettingsAction,
  updatePublishSettingsAction,
} from "@/app/mypage/menus/actions";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import BackgroundColorSettingsForm from "@/components/mypage/menu-editor/BackgroundColorSettingsForm";
import MenuEditorNavigation from "@/components/mypage/menu-editor/MenuEditorNavigation";
import ImageUploadField from "@/components/mypage/menu-editor/ImageUploadField";
import LocalizationSection from "@/components/mypage/menu-editor/LocalizationSection";
import MenuManagementSection from "@/components/mypage/menu-editor/MenuManagementSection";
import MenuEditorScrollRestoration from "@/components/mypage/menu-editor/MenuEditorScrollRestoration";
import MenuEditorToastBridge from "@/components/mypage/menu-editor/MenuEditorToastBridge";
import ResetTabActionButton from "@/components/mypage/menu-editor/ResetTabActionButton";
import SwitchField from "@/components/mypage/menu-editor/SwitchField";
import TypographySettingsForm from "@/components/mypage/menu-editor/TypographySettingsForm";
import AboutDraftSections, { EventDraftSections } from "@/components/mypage/menu-editor/AboutDraftSections";
import { MENU_FIELD_LIMITS } from "@/lib/menu-limits";
import { getStarterPreset } from "@/lib/menu-starter-presets";
import CoverDraftToggleSection from "@/components/mypage/menu-editor/CoverDraftToggleSection";
import {
  MENU_EDITOR_CAPABILITIES,
  getMenuEditorServiceType,
  isMenuEditorTabEnabled,
} from "@/lib/menu-editor-capabilities";
import { isMenuEditorTabKey, pageSettingKeys, pageSettingLabels } from "@/lib/menu-editor";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { getSafeTranslationErrorMessage } from "@/lib/menu-translation-errors";
import { getTranslationUsage } from "@/lib/menu-translation-usage";
import { getEnabledLocales } from "@/lib/locales";
import { RESTAURANT_TYPE_OPTIONS } from "@/lib/restaurant-types";
import { createClient } from "@/lib/supabase/server";
import type { Database, MenuSiteStatus } from "@/lib/supabase/types";
import {
  getCoverDescription,
  getCoverTabLabel,
  getCoverToggleLabel,
  getTemplateCapabilities,
} from "@/lib/template-capabilities";
import {
  getCustomBadgeStyles,
  mergeBadgeStyles,
} from "@/lib/template-badge-styles";
import { getTemplateDisplayName } from "@/lib/templates";
import {
  getCustomBackgroundColor,
  getResolvedBackgroundColor,
  getTemplateDefaultBackgroundColor,
} from "@/lib/template-background-colors";
import {
  getCustomEnglishFontValue,
  getCustomKoreanFontValue,
  getDefaultEnglishFontForTemplate,
  getDefaultKoreanFontForTemplate,
  getResolvedEnglishFont,
  getResolvedKoreanFont,
} from "@/lib/font-options";
import {
  getTemplateEditorLabels,
  getTemplateEditorTabs,
  getTemplateType,
  getTemplateTypeLabel,
} from "@/lib/template-types";
import {
  getCustomTypographySettings,
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
  | "logo_path"
  | "cover_image_url"
  | "intro_image_url"
  | "intro_image_path"
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
  | "image_path"
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
type MenuTranslationJob = Pick<
  Database["public"]["Tables"]["menu_translation_jobs"]["Row"],
  "id" | "status" | "error_message" | "target_locales" | "started_at" | "completed_at" | "created_at"
>;

type PageProps = {
  params: Promise<{ menuId: string }>;
  searchParams: Promise<{ error?: string; message?: string; tab?: string }>;
};

const statusLabels: Record<MenuSiteStatus, string> = {
  draft: "비공개",
  published: "공개중",
  archived: "비공개",
};

const baseMenuSiteSelect =
  "id, user_id, name, slug, template_key, status, published_at, restaurant_name, restaurant_category, restaurant_address, restaurant_phone, intro_title, intro_description, intro_image_url, intro_image_path, brand_description, menu_cover_title, menu_cover_description, about_description, opening_hours, map_url, logo_url, logo_path, cover_image_url, settings, page_settings";
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

function SubmitButton({
  children,
  tone = "dark",
  className: customClassName,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; tone?: "dark" | "light" | "danger" | "final" }) {
  const className = {
    dark: "bg-zinc-950 text-white hover:bg-zinc-800",
    light: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
    danger: "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
    final: "rounded-lg bg-zinc-950 text-white shadow-sm hover:bg-zinc-800",
  }[tone];

  return (
    <button
      type="submit"
      {...props}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 ${className} ${customClassName ?? ""}`}
    >
      {children}
    </button>
  );
}

function FinalActionRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-4">
      {children}
    </div>
  );
}

function FinalSaveFeedback({ message, error }: { message?: string | null; error?: string | null }) {
  if (!message && !error) return null;

  return (
    <>
      {message && (
        <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-red-600">
          {error}
        </p>
      )}
    </>
  );
}

function normalizeFinalSaveError(error?: string | null) {
  if (!error) return null;
  if (error.includes("배지 문구는 최대")) {
    return "일부 메뉴 아이템 입력값을 확인해주세요.";
  }
  return error;
}

function SectionCard({ title, action, children }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {action && <div className="flex flex-wrap items-center justify-end gap-3">{action}</div>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function HelpTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/help relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-200 bg-white text-[11px] font-black text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-7 z-30 hidden w-72 -translate-x-1/2 rounded-lg border border-zinc-100 bg-white p-3 text-left text-xs font-semibold leading-relaxed text-zinc-600 shadow-xl group-hover/help:block group-focus-within/help:block"
      >
        {children}
      </span>
    </span>
  );
}

function CustomEditorUnavailable({ siteName }: { siteName: string }) {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <div className="mx-auto w-full max-w-3xl">
          <Link href="/mypage" className="mb-5 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
            ← 메뉴판 목록으로
          </Link>
          <section className="rounded-lg bg-white p-8 shadow-sm">
            <h1 className="break-keep text-3xl font-bold tracking-tight text-zinc-950">테이블씬 커스텀은 맞춤 제작형 서비스입니다.</h1>
            <div className="mt-5 space-y-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
              <p>담당자 상담을 통해 제작이 진행되며, 일반 편집 페이지에서는 수정할 수 없습니다.</p>
              <p>{siteName} 프로젝트는 상담 및 제작 진행 상황에 맞춰 별도로 안내됩니다.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/mypage" className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800">
                메뉴판 목록으로
              </Link>
              <Link href="/mypage/inquiries" className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-100">
                상담 내역 확인하기
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function HiddenMenuId({ menuId }: { menuId: string }) {
  return <input type="hidden" name="menuId" value={menuId} />;
}

function SchedulePlaceholder() {
  return (
    <SectionCard title="일정표 관리" eyebrow="Schedule">
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-6">
        <h3 className="text-lg font-bold tracking-tight text-zinc-950">일정표형 템플릿은 준비 중입니다.</h3>
        <div className="mt-3 space-y-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
          <p>이번 1차 작업에서는 템플릿 유형, 관리자 라벨, 탭 구성만 준비합니다.</p>
          <p>schedule_items 테이블, 일정 CRUD, 공개 일정표 렌더링은 2차 개발에서 추가할 예정입니다.</p>
        </div>
      </div>
    </SectionCard>
  );
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
    { data: translationJobData },
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
          "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, image_path, badge_label, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order"
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
      supabase
        .from("menu_translation_jobs")
        .select("id, status, error_message, target_locales, started_at, completed_at, created_at")
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
            "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, image_path, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order"
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
  const latestTranslationJob = translationJobData as MenuTranslationJob | null;
  const pageSettings = mergePageSettings(site.page_settings);
  const latestOrder = orderData as MenuSiteOrder | null;
  const editorServiceType = getMenuEditorServiceType(latestOrder?.product_key);

  if (editorServiceType === "custom") {
    return <CustomEditorUnavailable siteName={site.name} />;
  }

  const editorCapabilities = MENU_EDITOR_CAPABILITIES[editorServiceType];
  const templateCapabilities = getTemplateCapabilities(site.template_key);
  const templateType = getTemplateType(site.template_key);
  const templateTypeLabel = getTemplateTypeLabel(templateType);
  const isPriceListTemplate = templateType === "price_list";
  const menuCoverCapabilities = templateCapabilities.menuCover;
  const coverMode = menuCoverCapabilities.coverMode;
  const supportsMenuCover = coverMode !== "none";
  const menuCoverEnabled = pageSettings.menu_cover_enabled !== false;
  const coverTabLabel = getCoverTabLabel(coverMode);
  const coverToggleLabel = getCoverToggleLabel(coverMode);
  const coverDescription = getCoverDescription(coverMode);
  const usesStoreIdentityForCover = menuCoverCapabilities.usesStoreName || menuCoverCapabilities.usesStoreDescription;
  const canUseFeaturedItemCover = templateType === "menu" && menuCoverCapabilities.usesFeaturedItem;
  const templateEditorLabels = getTemplateEditorLabels(site.template_key);
  const menuManagementStarterPreset = getStarterPreset(site.template_key, site.restaurant_category, site.template_category);
  const customBadgeStyles = getCustomBadgeStyles(site.settings, site.page_settings);
  const badgeStyles = mergeBadgeStyles(site.template_key, customBadgeStyles);
  const customTypography = getCustomTypographySettings(site.settings, site.page_settings);
  const typographySettings = mergeTypographySettings(site.template_key, customTypography);
  const customKoreanFont = getCustomKoreanFontValue(site.page_settings);
  const customEnglishFont = getCustomEnglishFontValue(site.page_settings);
  const defaultKoreanFont = getDefaultKoreanFontForTemplate(site.template_key);
  const defaultEnglishFont = getDefaultEnglishFontForTemplate(site.template_key);
  const resolvedKoreanFont = getResolvedKoreanFont({
    templateKey: site.template_key,
    selectedFont: typographySettings.korean_font_key,
    pageSettings: site.page_settings,
  });
  const resolvedEnglishFont = getResolvedEnglishFont({
    templateKey: site.template_key,
    selectedFont: typographySettings.english_font_key,
    pageSettings: site.page_settings,
  });
  const customBackgroundColor = getCustomBackgroundColor(site.page_settings);
  const defaultBackgroundColor = getTemplateDefaultBackgroundColor(site.template_key);
  const resolvedBackgroundColor = getResolvedBackgroundColor(site.template_key, site.page_settings);
  const enabledLocales = getEnabledLocales(site.settings);
  const translationUsage = getTranslationUsage(site.settings);
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const featuredItemOptions = items
    .filter((item) => item.visible === true)
    .map((item) => ({
      id: item.id,
      label: item.name,
      categoryName: item.category_id ? categoryNameById.get(item.category_id) ?? "미분류" : "미분류",
      price: formatMenuPrice(item) ?? "문의",
      imageStatus: item.image_url ? "이미지 있음" : "이미지 없음",
    }));
  const selectedFeaturedItem = pageSettings.featured_item_id ? items.find((item) => item.id === pageSettings.featured_item_id) : null;
  const selectedFeaturedItemInactive = Boolean(pageSettings.featured_item_enabled && pageSettings.featured_item_id && selectedFeaturedItem?.visible !== true);
  const visiblePageSettingKeys = pageSettingKeys.filter((key) => key !== "menu_cover_enabled" || supportsMenuCover);
  const configuredEditorTabs = getTemplateEditorTabs(site.template_key);
  const visibleEditorTabs = configuredEditorTabs.flatMap((item) => {
    if (!isMenuEditorTabEnabled(item.key, editorCapabilities)) {
      return [];
    }

    if (item.key === "cover" && !supportsMenuCover) {
      return [];
    }

    if (item.key === "about" && !(templateCapabilities.socialLinks || templateCapabilities.chefs)) {
      return [];
    }

    if (item.key === "events" && !templateCapabilities.events) {
      return [];
    }

    if (item.key === "cover" && coverTabLabel) {
      return [{ ...item, label: coverTabLabel }];
    }

    return [item];
  });
  const activeTab = visibleEditorTabs.some((item) => item.key === requestedActiveTab) ? requestedActiveTab : visibleEditorTabs[0]?.key ?? "basic";
  const editorShellMaxWidth = "max-w-7xl";
  const bannerMessage = message;
  const bannerError =
    activeTab === "localization"
      ? latestTranslationJob?.status === "completed"
        ? null
        : latestTranslationJob?.status === "failed"
          ? getSafeTranslationErrorMessage(latestTranslationJob.error_message)
          : error
            ? getSafeTranslationErrorMessage(error)
            : null
      : error;
  const basicNameError = activeTab === "basic" && bannerError?.includes("메뉴판 이름") ? bannerError : null;
  const basicSlugError =
    activeTab === "basic" &&
    (bannerError?.includes("공개 메뉴판 주소") || bannerError?.includes("이미 사용 중인 공개 메뉴판 주소"))
      ? bannerError
      : null;
  const finalSaveError = normalizeFinalSaveError(activeTab === "basic" && (basicNameError || basicSlugError) ? null : bannerError);
  const globalBannerError = activeTab === "localization" ? bannerError : null;
  const templateDisplayName = getTemplateDisplayName(site.template_key, site.template_category);
  const publicUrl = getPublicMenuUrl(site.slug);
  const qrDownloadUrl = `/api/qr?slug=${encodeURIComponent(site.slug)}`;
  const previewUrl = `/mypage/menus/${site.id}/preview`;
  const isSlugLocked = site.status === "published" || Boolean(site.published_at);
  const checklist = [
    { label: "매장명 입력", ok: Boolean(site.restaurant_name || site.name) },
    { label: "공개 메뉴판 주소 설정", ok: Boolean(site.slug) },
    { label: `${templateEditorLabels.pageLabel} 1개 이상`, ok: menuPages.length > 0 },
    { label: `${templateEditorLabels.categoryLabel} 1개 이상`, ok: categories.length > 0 },
    { label: `${templateEditorLabels.itemLabel} 1개 이상`, ok: items.length > 0 },
  ];
  const optionalChecklist = [
    editorCapabilities.introPage ? { label: "인트로 페이지 사용", ok: pageSettings.intro_enabled } : null,
    editorCapabilities.menuCoverPage && supportsMenuCover ? { label: coverToggleLabel, ok: pageSettings.menu_cover_enabled } : null,
    editorCapabilities.aboutPage ? { label: "소개 페이지 사용", ok: pageSettings.about_enabled } : null,
    editorCapabilities.eventPage && templateCapabilities.events ? { label: "이벤트 등록", ok: events.length > 0 } : null,
    editorCapabilities.socialLinks && templateCapabilities.socialLinks ? { label: "SNS 등록", ok: socialLinks.length > 0 } : null,
    editorCapabilities.chefs && templateCapabilities.chefs ? { label: "셰프/인물 등록", ok: chefs.length > 0 } : null,
  ].filter((item): item is { label: string; ok: boolean } => Boolean(item));

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <MenuEditorScrollRestoration menuId={menuId} />
        <MenuEditorToastBridge message={bannerMessage} error={finalSaveError} />
        <div className={`mx-auto w-full ${editorShellMaxWidth}`}>
        <header className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <Link href="/mypage" className="mb-5 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
            ← 메뉴판 목록으로
          </Link>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${site.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {statusLabels[site.status]}
                </span>
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white">{templateTypeLabel}</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">
                  {templateDisplayName}
                  <HelpTooltip label="템플릿 도움말">결제 시 선택한 템플릿입니다.</HelpTooltip>
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{site.name}</h1>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-zinc-400">
                {publicUrl}
                <HelpTooltip label="공개 주소 도움말">손님이 공개 메뉴판을 볼 때 사용하는 주소입니다.</HelpTooltip>
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Link
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white"
                >
                  미리보기
                </Link>
                {site.status === "published" ? (
                  <>
                    <Link
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700"
                    >
                      공개 페이지 보기
                    </Link>
                    <a
                      href={qrDownloadUrl}
                      download
                      className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700"
                    >
                      QR 다운로드
                    </a>
                  </>
                ) : (
                  <>
                    <button type="button" disabled title="공개 설정 탭에서 공개로 저장한 뒤 사용할 수 있습니다." className="cursor-not-allowed rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
                      공개 페이지 보기
                    </button>
                    <button type="button" disabled title="공개 설정 탭에서 공개로 저장한 뒤 QR을 다운로드할 수 있습니다." className="cursor-not-allowed rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
                      QR 다운로드
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs font-bold text-zinc-400">변경사항은 저장 후 반영됩니다.</p>
            </div>
          </div>
        </header>

        {globalBannerError && <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{globalBannerError}</div>}

        <MenuEditorNavigation menuId={menuId} activeTab={activeTab} tabs={visibleEditorTabs} />

        <div className="space-y-6">
            {activeTab === "basic" && (
              <SectionCard title="기본 정보" eyebrow="Basic">
                <form id="basic-info-form" action={updateMenuSiteAction} className="grid gap-5 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  <div>
                    <FieldLabel required>{templateEditorLabels.pageLabel} 관리용 이름</FieldLabel>
                    <TextInput
                      name="name"
                      defaultValue={site.name}
                      required
                      maxLength={MENU_FIELD_LIMITS.menuSites.name}
                      helperText={
                        <>
                          마이페이지에서 구분할 이름입니다. 최대 {MENU_FIELD_LIMITS.menuSites.name}자까지 입력할 수 있습니다.
                          {basicNameError && <span className="mt-1 block text-red-600">{basicNameError}</span>}
                        </>
                      }
                    />
                  </div>
                  <div>
                    <FieldLabel>실제 매장명</FieldLabel>
                    <TextInput name="restaurant_name" defaultValue={site.restaurant_name ?? ""} maxLength={MENU_FIELD_LIMITS.menuSites.restaurantName} helperText="공개 메뉴판에 표시될 매장명입니다." />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>매장 설명</FieldLabel>
                    <TextArea
                      name="brand_description"
                      defaultValue={site.brand_description ?? ""}
                      maxLength={MENU_FIELD_LIMITS.menuSites.brandDescription}
                      placeholder="예: 신선한 재료와 정성스러운 서비스로 매일의 시간을 더 특별하게 만드는 공간입니다."
                      helperText="공개 메뉴판 상단에 매장 소개 문구로 표시됩니다."
                    />
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
                    <FieldLabel required>공개 메뉴판 주소</FieldLabel>
                    {isSlugLocked && <input type="hidden" name="slug" value={site.slug} />}
                    <TextInput
                      name="slug"
                      defaultValue={site.slug}
                      required
                      disabled={isSlugLocked}
                      minLength={MENU_FIELD_LIMITS.menuSites.slugMin}
                      maxLength={MENU_FIELD_LIMITS.menuSites.slugMax}
                      pattern="[a-z0-9-]+"
                      title="영문 소문자, 숫자, 하이픈만 입력할 수 있습니다."
                      helperText={
                        <>
                          영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.
                          {basicSlugError && <span className="mt-1 block text-red-600">{basicSlugError}</span>}
                        </>
                      }
                    />
                    <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
                      공개 후에는 QR 코드와 공유 링크 유지를 위해 주소를 변경할 수 없습니다.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>템플릿</FieldLabel>
                    <TextInput value={templateDisplayName} readOnly />
                  </div>
                  {templateCapabilities.logoImage && (
                    <div className="md:col-span-2">
                      <ImageUploadField
                        label="로고 이미지"
                        menuId={site.id}
                        target="site-logo-draft"
                        currentUrl={site.logo_url}
                        description="공개 메뉴판에서는 최대 높이 32~48px, 최대 너비 120~180px 안에서 비율에 맞춰 표시됩니다."
                        fileGuidance="PNG, JPG, WebP · 최대 2MB / 권장: 가로 512px 이상, 투명 배경 이미지"
                        deferredDeleteName="delete_logo_image"
                        draftImageUrlInputName="draft_logo_image_url"
                        draftImagePathInputName="draft_logo_image_path"
                        uploadSuccessMessage="새 로고 이미지는 저장 후 공개 메뉴판에 반영됩니다."
                        deleteSuccessMessage="로고 이미지가 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다."
                        deleteConfirmTitle="이 로고 이미지를 삭제할까요?"
                        deleteConfirmDescription="삭제해도 저장 전까지 공개 메뉴판에는 반영되지 않습니다."
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <FinalActionRow>
                      <SubmitButton tone="final">저장</SubmitButton>
                      <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                      <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                        변경사항은 저장 후 미리보기와 공개 메뉴판에 반영됩니다.
                      </p>
                    </FinalActionRow>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "pages" && (
              <SectionCard title="페이지 설정" eyebrow="Pages">
                <form id="page-settings-form" action={updatePageSettingsAction} className="grid gap-4 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  {visiblePageSettingKeys.map((key) => {
                    const settingLabel = key === "menu_cover_enabled" ? coverToggleLabel : pageSettingLabels[key];

                    return (
                      <div key={key} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                        <Checkbox name={key} label={settingLabel} defaultChecked={pageSettings[key]} />
                      </div>
                    );
                  })}
                  <div className="md:col-span-2">
                    <FinalActionRow>
                      <SubmitButton tone="final">저장</SubmitButton>
                      <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                      <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                        변경사항은 저장 후 미리보기와 공개 메뉴판에 반영됩니다.
                      </p>
                    </FinalActionRow>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "intro" && (
              <SectionCard title="인트로" eyebrow="Intro">
                <form id="intro-form" action={updateIntroAction} className="grid gap-5 md:grid-cols-2">
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
                    <ImageUploadField
                      label="인트로 배경 이미지"
                      menuId={site.id}
                      target="site-intro-image-draft"
                      currentUrl={site.intro_image_url}
                      description="등록하면 어두운 오버레이가 적용되고 흰색 텍스트로 표시됩니다. 등록하지 않으면 단색 배경으로 표시됩니다."
                      deferredDeleteName="delete_intro_image"
                      draftImageUrlInputName="draft_intro_image_url"
                      draftImagePathInputName="draft_intro_image_path"
                      uploadSuccessMessage="새 인트로 배경 이미지는 저장 후 공개 메뉴판에 반영됩니다."
                      deleteSuccessMessage="인트로 배경 이미지가 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다."
                      deleteConfirmTitle="이 인트로 배경 이미지를 삭제할까요?"
                      deleteConfirmDescription="삭제해도 저장 전까지 공개 메뉴판에는 반영되지 않습니다."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FinalActionRow>
                      <SubmitButton tone="final">저장</SubmitButton>
                      <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                      <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                        변경사항은 저장 후 미리보기와 공개 메뉴판에 반영됩니다.
                      </p>
                    </FinalActionRow>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "cover" && (
              <SectionCard
                title={coverTabLabel ?? "메뉴 커버"}
                eyebrow="Cover"
              >
                <form id="menu-cover-form" action={updateMenuCoverAction} className="grid gap-5 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  <div className="md:col-span-2 rounded-lg border border-zinc-100 bg-zinc-50 p-5">
                    <p className="break-keep text-sm font-bold leading-relaxed text-zinc-600">
                      {coverDescription ||
                        (usesStoreIdentityForCover
                        ? "이 템플릿은 상단 제목과 설명에 기본 정보의 매장명과 매장 설명을 사용합니다. 메뉴 커버에서는 템플릿에 강조해서 보여줄 이미지와 대표 항목만 설정할 수 있습니다."
                        : isPriceListTemplate
                        ? "가격표 상단에 보여줄 대표 문구와 이미지를 설정합니다. 등록된 서비스 중 하나를 고르는 방식이 아니라, 가격표 전체를 소개하는 커버 내용을 직접 입력합니다."
                        : "메뉴판 첫 화면이나 상단 영역에 강조해서 보여줄 내용을 설정합니다. 대표 추천 메뉴를 선택하면 템플릿에 따라 상단 강조 영역에 표시될 수 있습니다.")}
                    </p>
                  </div>
                  <CoverDraftToggleSection
                    name="menu_cover_enabled"
                    label={coverToggleLabel}
                    defaultChecked={menuCoverEnabled}
                    inactiveMessage={`${coverToggleLabel}을 켜면 아래 설정을 편집할 수 있습니다. 꺼도 기존 입력값은 삭제되지 않습니다.`}
                  >
                    {menuCoverCapabilities.usesCoverTitle && (
                      <div className="md:col-span-2">
                        <FieldLabel required>커버 제목</FieldLabel>
                        <TextInput
                          name="menu_cover_title"
                          defaultValue={site.menu_cover_title ?? ""}
                          required
                          maxLength={MENU_FIELD_LIMITS.menuSites.menuCoverTitle}
                          placeholder={isPriceListTemplate ? "예: 우리 매장의 대표 서비스 안내" : "예: 오늘의 대표 메뉴"}
                          helperText={isPriceListTemplate ? "가격표 상단에 표시할 대표 제목입니다." : "메뉴 영역 상단에 표시되는 제목입니다."}
                        />
                      </div>
                    )}
                    {menuCoverCapabilities.usesCoverDescription && (
                      <div className="md:col-span-2">
                        <FieldLabel required>커버 설명</FieldLabel>
                        <TextArea
                          name="menu_cover_description"
                          defaultValue={site.menu_cover_description ?? ""}
                          required
                          maxLength={MENU_FIELD_LIMITS.menuSites.menuCoverDescription}
                          placeholder={isPriceListTemplate ? "예: 기본 관리부터 프리미엄 케어까지, 필요한 서비스를 한눈에 확인해보세요." : "예: 매장의 대표 메뉴와 추천 구성을 소개해보세요."}
                          helperText={`${isPriceListTemplate ? "가격표 소개 문구" : "메뉴 소개 문구"}를 입력해주세요. 최대 ${MENU_FIELD_LIMITS.menuSites.menuCoverDescription}자까지 입력할 수 있습니다.`}
                        />
                      </div>
                    )}
                    {menuCoverCapabilities.usesCoverImage && (
                      <div className="md:col-span-2">
                        <ImageUploadField
                          label="커버 이미지"
                          menuId={site.id}
                          target="site-cover-draft"
                          currentUrl={site.cover_image_url}
                          description={isPriceListTemplate ? "매장 분위기, 대표 시술, 서비스 이미지를 등록해주세요." : "메뉴판 첫 화면이나 상단 영역에 사용할 이미지를 등록해주세요."}
                          deferredDeleteName="delete_cover_image"
                          draftImageUrlInputName="draft_cover_image_url"
                          draftImagePathInputName="draft_cover_image_path"
                          uploadSuccessMessage="새 커버 이미지는 저장 후 공개 메뉴판에 반영됩니다."
                          deleteConfirmTitle="이 커버 이미지를 삭제할까요?"
                          deleteConfirmDescription="삭제해도 저장 전까지 공개 메뉴판에는 반영되지 않습니다."
                        />
                      </div>
                    )}
                    {canUseFeaturedItemCover && (
                      <div className="md:col-span-2 rounded-lg border border-zinc-100 bg-zinc-50 p-5">
                        <div className="mb-4">
                          <h3 className="text-lg font-bold tracking-tight text-zinc-950">대표 추천 메뉴</h3>
                          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                            대표 추천 메뉴는 일부 템플릿에서 대표 영역의 메뉴 정보로 표시됩니다. 커버 이미지는 별도로 등록한 이미지만 사용합니다.
                          </p>
                        </div>
                        <div className="grid gap-5">
                          <Checkbox name="featured_item_enabled" label="대표 추천 메뉴 사용" defaultChecked={pageSettings.featured_item_enabled} />
                          <div>
                            <FieldLabel>대표 추천 메뉴</FieldLabel>
                            <Select
                              name="featured_item_id"
                              defaultValue={pageSettings.featured_item_id ?? ""}
                              helperText="대표 영역에 표시할 메뉴 정보를 선택합니다. 메뉴 이미지는 커버 이미지 대체로 사용되지 않습니다."
                            >
                              <option value="">대표로 보여줄 메뉴를 선택해주세요</option>
                              {selectedFeaturedItemInactive && selectedFeaturedItem && (
                                <option value={selectedFeaturedItem.id} disabled>
                                  {selectedFeaturedItem.name} · 숨김 처리됨
                                </option>
                              )}
                              {featuredItemOptions.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.label} · {item.categoryName} · {item.price} · {item.imageStatus}
                                </option>
                              ))}
                            </Select>
                            {selectedFeaturedItemInactive && (
                              <p className="mt-3 break-keep rounded-lg bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-700">
                                선택한 대표 추천 메뉴가 숨김 처리되어 공개 메뉴판에는 표시되지 않습니다. 선택을 해제하려면 “대표 추천 메뉴 사용”을 끄거나 선택값을 비운 뒤 저장해주세요.
                              </p>
                            )}
                          </div>
                          {!templateCapabilities.featuredItemHero && (
                            <p className="break-keep rounded-lg bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-700">
                              현재 선택한 템플릿은 대표 추천 메뉴 영역을 사용하지 않습니다. 설정값은 저장되지만 공개 메뉴판에는 표시되지 않을 수 있습니다.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CoverDraftToggleSection>
                  <div className="md:col-span-2">
                    <FinalActionRow>
                      <SubmitButton tone="final">저장</SubmitButton>
                      <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                      <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                        변경사항은 저장 후 미리보기와 공개 메뉴판에 반영됩니다. 새 커버 이미지는 저장 전까지 공개 메뉴판에 반영되지 않습니다.
                      </p>
                    </FinalActionRow>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "menu" && (
              templateType === "schedule" ? (
                <SchedulePlaceholder />
              ) : (
                <MenuManagementSection
                  menuId={site.id}
                  menuPages={menuPages}
                  categories={categories}
                  items={items}
                  priceOptions={priceOptions}
                  traits={traits}
                  capabilities={templateCapabilities}
                  badgeStyles={badgeStyles}
                  editorLabels={templateEditorLabels}
                  starterPreset={menuManagementStarterPreset}
                  finalSaveMessage={bannerMessage}
                  finalSaveError={finalSaveError}
                />
              )
            )}

            {activeTab === "schedule" && <SchedulePlaceholder />}

            {activeTab === "about" && (
              <>
                <SectionCard title="소개" eyebrow="About">
                  <form id="about-form" action={updateAboutAction} className="grid gap-5 md:grid-cols-2">
                    <HiddenMenuId menuId={site.id} />
                    <AboutDraftSections
                      socialLinks={socialLinks}
                      chefs={chefs}
                      showChefs={editorCapabilities.chefs && templateCapabilities.chefs}
                      showSocialLinks={editorCapabilities.socialLinks && templateCapabilities.socialLinks}
                    />
                    <div className="md:col-span-2">
                      <FinalActionRow>
                        <SubmitButton tone="final">저장</SubmitButton>
                        <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                        <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                          변경사항은 저장 후 미리보기와 공개 메뉴판에 반영됩니다.
                        </p>
                      </FinalActionRow>
                    </div>
                  </form>
                </SectionCard>
              </>
            )}

            {activeTab === "events" && (
              <SectionCard title="이벤트" eyebrow="Events">
                <form id="events-form" action={updateEventsAction} className="grid gap-5 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  <EventDraftSections
                    events={events}
                    showEvents={editorCapabilities.eventPage && templateCapabilities.events}
                  />
                  <div className="md:col-span-2">
                      <FinalActionRow>
                        <SubmitButton tone="final">저장</SubmitButton>
                        <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                        <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                          이벤트 변경사항은 저장 후 미리보기와 공개 메뉴판에 반영됩니다. 이벤트 이미지는 후속 draft 단계 전까지 기존 업로드 정책을 따릅니다.
                        </p>
                    </FinalActionRow>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "design" && (
              <SectionCard
                title="디자인"
                eyebrow="Design"
              >
                <div className="space-y-5">
                  <form id="design-settings-form" action={updateDesignSettingsAction} className="space-y-5">
                    <HiddenMenuId menuId={site.id} />
                    <div>
                      <FieldLabel>현재 템플릿</FieldLabel>
                      <TextInput value={templateDisplayName} readOnly helperText="템플릿 변경 기능은 추후 제공 예정입니다." />
                    </div>
                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-5">
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-zinc-950">배경색</h3>
                        <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                          메뉴판 전체 배경색을 매장 분위기에 맞게 변경할 수 있습니다. 마음에 들지 않으면 언제든 템플릿 기본 색상으로 되돌릴 수 있습니다.
                        </p>
                      </div>
                      <BackgroundColorSettingsForm
                        formId="design-settings-form"
                        initialColor={resolvedBackgroundColor}
                        defaultColor={defaultBackgroundColor}
                        hasCustomBackgroundColor={Boolean(customBackgroundColor)}
                      />
                    </div>
                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-5">
                      <div>
                        <div>
                          <h3 className="text-lg font-bold tracking-tight text-zinc-950">폰트 설정</h3>
                          <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                            템플릿에 어울리는 기본 폰트가 적용되어 있습니다. 원하는 경우 준비된 한글 폰트 목록에서 선택해 메뉴판 분위기를 바꿀 수 있습니다.
                            마음에 들지 않으면 언제든 템플릿 기본 폰트로 되돌릴 수 있습니다.
                          </p>
                        </div>
                      </div>
                      <TypographySettingsForm
                        formId="design-settings-form"
                        initialFont={resolvedKoreanFont}
                        initialEnglishFont={resolvedEnglishFont}
                        defaultFont={defaultKoreanFont}
                        defaultEnglishFont={defaultEnglishFont}
                        hasCustomKoreanFont={Boolean(customKoreanFont)}
                        hasCustomEnglishFont={Boolean(customEnglishFont)}
                        templateType={templateType}
                      />
                    </div>
                  </form>
                  <FinalActionRow>
                    <ResetTabActionButton menuId={site.id} kind="design" />
                    <SubmitButton form="design-settings-form" tone="final">저장</SubmitButton>
                    <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                    <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                      미리보기에는 저장된 디자인 설정만 표시됩니다.
                    </p>
                  </FinalActionRow>
                </div>
              </SectionCard>
            )}

            {activeTab === "localization" && (
              <SectionCard title="다국어" eyebrow="Localization">
                <LocalizationSection
                  menuId={site.id}
                  enabledLocales={enabledLocales}
                  translationUsage={translationUsage}
                  latestTranslationJob={latestTranslationJob}
                />
              </SectionCard>
            )}

            {activeTab === "publish" && (
              <SectionCard title="공개 설정" eyebrow="Publish">
                <form id="publish-settings-form" action={updatePublishSettingsAction} className="space-y-5">
                  <HiddenMenuId menuId={site.id} />
                  <div>
                    <FieldLabel>공개 상태</FieldLabel>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="group relative flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-5 transition focus-within:border-zinc-950 has-[:checked]:border-zinc-950 has-[:checked]:bg-zinc-50">
                        <input
                          type="radio"
                          name="status"
                          value="draft"
                          defaultChecked={site.status !== "published"}
                          className="mt-1 h-4 w-4 shrink-0 accent-zinc-950"
                        />
                        <span>
                          <span className="block text-base font-black text-zinc-950">비공개</span>
                          <span className="mt-2 block break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                            공개 URL로 접속해도 손님에게 메뉴판이 보이지 않습니다.
                          </span>
                        </span>
                      </label>
                      <label className="group relative flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-5 transition focus-within:border-zinc-950 has-[:checked]:border-zinc-950 has-[:checked]:bg-zinc-50">
                        <input
                          type="radio"
                          name="status"
                          value="published"
                          defaultChecked={site.status === "published"}
                          className="mt-1 h-4 w-4 shrink-0 accent-zinc-950"
                        />
                        <span>
                          <span className="block text-base font-black text-zinc-950">공개</span>
                          <span className="mt-2 block break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                            공개 URL과 QR 코드로 손님이 메뉴판을 볼 수 있습니다.
                          </span>
                        </span>
                      </label>
                    </div>
                    {site.status === "archived" && (
                      <p className="mt-3 break-keep rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-700">
                        현재 보관된 메뉴판입니다. 공개 설정 탭에서는 비공개 상태로 표시됩니다.
                      </p>
                    )}
                    <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                      공개 상태 변경은 저장 후 반영됩니다.
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-relaxed text-emerald-700">
                    저장 전에는 미리보기와 공개 메뉴판에 반영되지 않습니다. 공개 페이지 보기와 미리보기는 저장된 데이터 기준으로 열립니다.
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
                  {isSlugLocked && <p className="break-keep text-sm font-bold text-amber-700">이미 공개된 메뉴판입니다. 기존 QR 코드가 깨지지 않도록 공개 메뉴판 주소는 잠겨 있습니다.</p>}
                  <div>
                    <FinalActionRow>
                      <SubmitButton tone="final">저장</SubmitButton>
                      <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                      <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                        공개 상태 변경은 저장 후 DB와 미리보기, 공개 메뉴판에 반영됩니다.
                      </p>
                    </FinalActionRow>
                  </div>
                </form>
              </SectionCard>
            )}
        </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
