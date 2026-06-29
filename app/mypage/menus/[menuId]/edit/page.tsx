import { createHash } from "node:crypto";

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
import AiCreditRechargePanel from "@/components/mypage/AiCreditRechargePanel";
import BackgroundColorSettingsForm from "@/components/mypage/menu-editor/BackgroundColorSettingsForm";
import CoverSampleResetButton from "@/components/mypage/menu-editor/CoverSampleResetButton";
import DirtySubmitButton from "@/components/mypage/menu-editor/DirtySubmitButton";
import MenuEditorNavigation from "@/components/mypage/menu-editor/MenuEditorNavigation";
import ImageUploadField from "@/components/mypage/menu-editor/ImageUploadField";
import LocalizationSection from "@/components/mypage/menu-editor/LocalizationSection";
import LiveCharacterCounter from "@/components/mypage/menu-editor/LiveCharacterCounter";
import MenuManagementSection from "@/components/mypage/menu-editor/MenuManagementSection";
import MenuEditorScrollRestoration from "@/components/mypage/menu-editor/MenuEditorScrollRestoration";
import MenuEditorToastBridge from "@/components/mypage/menu-editor/MenuEditorToastBridge";
import PendingSubmitButton from "@/components/mypage/menu-editor/PendingSubmitButton";
import ResetTabActionButton from "@/components/mypage/menu-editor/ResetTabActionButton";
import SwitchField from "@/components/mypage/menu-editor/SwitchField";
import TypographySettingsForm from "@/components/mypage/menu-editor/TypographySettingsForm";
import AboutDraftSections, { EventDraftSections } from "@/components/mypage/menu-editor/AboutDraftSections";
import { MENU_FIELD_LIMITS } from "@/lib/menu-limits";
import type { AiCreditBalance } from "@/lib/ai-credits";
import { getStarterPreset } from "@/lib/menu-starter-presets";
import CoverDraftToggleSection from "@/components/mypage/menu-editor/CoverDraftToggleSection";
import {
  MENU_EDITOR_CAPABILITIES,
  getMenuEditorServiceTypeForMenuSite,
  isMenuEditorTabEnabled,
} from "@/lib/menu-editor-capabilities";
import { isMenuEditorTabKey, pageSettingKeys, pageSettingLabels } from "@/lib/menu-editor";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { getSafeTranslationErrorMessage } from "@/lib/menu-translation-errors";
import { getAiUsageSnapshot, getAiUsageSnapshotFromCredits, normalizeMenuLinkPlanKey } from "@/lib/menu-ai-usage";
import { getPublicPortOneConfig } from "@/lib/portone";
import { getAiCreditBalanceForMenuSite } from "@/lib/server/ai-credits-service";
import { getMenuSiteAccessStateForMenuSite, type MenuSiteAccessState } from "@/lib/server/menu-site-access-service";
import { getEnabledLocales } from "@/lib/locales";
import type { EditableTranslationField, EditableTranslationLocale } from "@/lib/menu-localization-draft";
import { getPcTabletLayoutModeFromPageSettings, supportsPcTabletLayoutMode } from "@/lib/menu-layout-modes";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json, MenuSiteStatus } from "@/lib/supabase/types";
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
  "id" | "title" | "description" | "description_visible" | "display_settings" | "legacy_section_key" | "visible" | "sort_order" | "created_at"
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
type MenuSiteTranslation = Database["public"]["Tables"]["menu_site_translations"]["Row"];
type MenuPageTranslation = Database["public"]["Tables"]["menu_page_translations"]["Row"];
type MenuCategoryTranslation = Database["public"]["Tables"]["menu_category_translations"]["Row"];
type MenuItemTranslation = Database["public"]["Tables"]["menu_item_translations"]["Row"];

const editableTranslationLocales = ["en", "zh", "ja"] as const satisfies readonly EditableTranslationLocale[];

function cleanTranslationSource(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function buildLocalizationSourceHash(fields: Record<string, string>) {
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}

function getTranslationValue(
  translationsByLocale: Map<EditableTranslationLocale, Record<string, unknown>>,
  locale: EditableTranslationLocale,
  field: string
) {
  const value = translationsByLocale.get(locale)?.[field];
  return typeof value === "string" ? value : "";
}

function buildTranslationLocaleValues(
  translationsByLocale: Map<EditableTranslationLocale, Record<string, unknown>>,
  field: string
) {
  return editableTranslationLocales.reduce<Record<EditableTranslationLocale, string>>((result, locale) => {
    result[locale] = getTranslationValue(translationsByLocale, locale, field);
    return result;
  }, { en: "", zh: "", ja: "" });
}

function buildEditableTranslationFields({
  site,
  pages,
  categories,
  items,
  siteTranslations,
  pageTranslations,
  categoryTranslations,
  itemTranslations,
  includeItemBadges,
  includeCategoryDescriptions,
  menuCoverCapabilities,
  useBasicLocalizationStructure,
}: {
  site: MenuSite;
  pages: MenuPage[];
  categories: MenuCategory[];
  items: MenuItem[];
  siteTranslations: MenuSiteTranslation[];
  pageTranslations: MenuPageTranslation[];
  categoryTranslations: MenuCategoryTranslation[];
  itemTranslations: MenuItemTranslation[];
  includeItemBadges: boolean;
  includeCategoryDescriptions: boolean;
  menuCoverCapabilities: ReturnType<typeof getTemplateCapabilities>["menuCover"];
  useBasicLocalizationStructure: boolean;
}) {
  const fields: EditableTranslationField[] = [];
  const siteTranslationsByLocale = new Map(
    siteTranslations.map((translation) => [translation.locale as EditableTranslationLocale, translation as Record<string, unknown>])
  );
  const pageTranslationsById = new Map<string, Map<EditableTranslationLocale, Record<string, unknown>>>();
  const categoryTranslationsById = new Map<string, Map<EditableTranslationLocale, Record<string, unknown>>>();
  const itemTranslationsById = new Map<string, Map<EditableTranslationLocale, Record<string, unknown>>>();

  pageTranslations.forEach((translation) => {
    const locale = translation.locale as EditableTranslationLocale;
    const translations = pageTranslationsById.get(translation.menu_page_id) ?? new Map<EditableTranslationLocale, Record<string, unknown>>();
    translations.set(locale, translation as Record<string, unknown>);
    pageTranslationsById.set(translation.menu_page_id, translations);
  });
  categoryTranslations.forEach((translation) => {
    const locale = translation.locale as EditableTranslationLocale;
    const translations = categoryTranslationsById.get(translation.category_id) ?? new Map<EditableTranslationLocale, Record<string, unknown>>();
    translations.set(locale, translation as Record<string, unknown>);
    categoryTranslationsById.set(translation.category_id, translations);
  });
  itemTranslations.forEach((translation) => {
    const locale = translation.locale as EditableTranslationLocale;
    const translations = itemTranslationsById.get(translation.item_id) ?? new Map<EditableTranslationLocale, Record<string, unknown>>();
    translations.set(locale, translation as Record<string, unknown>);
    itemTranslationsById.set(translation.item_id, translations);
  });

  function pushFields({
    entityType,
    entityId,
    group,
    groupLabel,
    sourceFields,
    translationsByLocale,
    fieldLabels,
    parentGroupLabel,
    multilineFields = [],
  }: {
    entityType: EditableTranslationField["entityType"];
    entityId: string;
    group: EditableTranslationField["group"];
    groupLabel: string;
    sourceFields: Record<string, unknown>;
    translationsByLocale: Map<EditableTranslationLocale, Record<string, unknown>>;
    fieldLabels: Record<string, string>;
    parentGroupLabel?: string;
    multilineFields?: string[];
  }) {
    const cleanFields = Object.entries(sourceFields).reduce<Record<string, string>>((result, [field, value]) => {
      const text = cleanTranslationSource(value);
      if (text) result[field] = text;
      return result;
    }, {});
    const sourceHash = buildLocalizationSourceHash(cleanFields);

    Object.entries(cleanFields).forEach(([field, sourceText]) => {
      fields.push({
        entityType,
        entityId,
        field,
        group,
        groupLabel,
        parentGroupLabel,
        label: fieldLabels[field] ?? field,
        sourceText,
        sourceHash,
        multiline: multilineFields.includes(field),
        translations: buildTranslationLocaleValues(translationsByLocale, field),
      });
    });
  }

  if (useBasicLocalizationStructure) {
    const siteSettings = getJsonRecord(site.settings);
    const hasFooterNotice1 = Object.prototype.hasOwnProperty.call(siteSettings, "footer_notice_1");
    const hasFooterNotice2 = Object.prototype.hasOwnProperty.call(siteSettings, "footer_notice_2");
    const hasFooterNotice3 = Object.prototype.hasOwnProperty.call(siteSettings, "footer_notice_3");
    // Basic/CafeA footer notice translation compatibility mapping:
    // footer_notice_1/2/3 reuse opening_hours/address/phone translation columns to avoid a schema change.
    const footerNotice1 = hasFooterNotice1 ? getSettingsString(siteSettings, "footer_notice_1") : site.opening_hours ?? "";
    const footerNotice2 = hasFooterNotice2 ? getSettingsString(siteSettings, "footer_notice_2") : site.restaurant_address ?? "";
    const footerNotice3 = hasFooterNotice3
      ? getSettingsString(siteSettings, "footer_notice_3")
      : getSettingsString(siteSettings, "footer_sns_text") || getSettingsString(siteSettings, "footer_note");

    pushFields({
      entityType: "site",
      entityId: site.id,
      group: "site",
      groupLabel: "기본 정보",
      sourceFields: {
        restaurant_name: site.restaurant_name,
        brand_description: site.brand_description,
        opening_hours: footerNotice1,
        restaurant_address: footerNotice2,
        restaurant_phone: footerNotice3,
      },
      translationsByLocale: siteTranslationsByLocale,
      fieldLabels: {
        restaurant_name: "매장명",
        brand_description: "매장 설명",
        opening_hours: "안내사항 1",
        restaurant_address: "안내사항 2",
        restaurant_phone: "안내사항 3",
      },
      multilineFields: ["brand_description", "opening_hours", "restaurant_address", "restaurant_phone"],
    });
  } else {
    pushFields({
      entityType: "site",
      entityId: site.id,
      group: "site",
      groupLabel: "커버 이미지",
      sourceFields: {
        restaurant_name: menuCoverCapabilities.usesStoreName ? site.restaurant_name : null,
        brand_description: menuCoverCapabilities.usesStoreDescription ? site.brand_description : null,
        menu_cover_label: menuCoverCapabilities.usesCoverLabel ? site.menu_cover_label : null,
        menu_cover_title: menuCoverCapabilities.usesCoverTitle ? site.menu_cover_title : null,
        menu_cover_description: menuCoverCapabilities.usesCoverDescription ? site.menu_cover_description : null,
      },
      translationsByLocale: siteTranslationsByLocale,
      fieldLabels: {
        restaurant_name: "매장명",
        brand_description: "브랜드 설명",
        menu_cover_label: "커버 이미지 라벨",
        menu_cover_title: "커버 이미지 제목",
        menu_cover_description: "커버 이미지 설명",
      },
      multilineFields: ["brand_description", "menu_cover_description"],
    });

    pages
      .filter((page) => page.visible)
      .forEach((page) => {
        pushFields({
          entityType: "page",
          entityId: page.id,
          group: "pages",
          groupLabel: page.title,
          sourceFields: {
            title: page.title,
            description: page.description_visible ? page.description : null,
          },
          translationsByLocale: pageTranslationsById.get(page.id) ?? new Map(),
          fieldLabels: { title: "페이지명", description: "페이지 설명" },
          multilineFields: ["description"],
        });
      });
  }

  categories
    .filter((category) => category.visible)
    .forEach((category) => {
      pushFields({
        entityType: "category",
        entityId: category.id,
        group: "categories",
        groupLabel: category.name,
        sourceFields: {
          name: category.name,
          description: includeCategoryDescriptions && category.description_visible ? category.description : null,
        },
        translationsByLocale: categoryTranslationsById.get(category.id) ?? new Map(),
        fieldLabels: useBasicLocalizationStructure
          ? { name: "메뉴 그룹명", description: "메뉴 그룹 설명" }
          : { name: "카테고리명", description: "카테고리 설명" },
        multilineFields: ["description"],
      });
    });

  items
    .filter((item) => item.visible)
    .forEach((item) => {
      const categoryName = categories.find((category) => category.id === item.category_id)?.name ?? "기타";
      pushFields({
        entityType: "item",
        entityId: item.id,
        group: "items",
        groupLabel: item.name,
        parentGroupLabel: categoryName,
        sourceFields: {
          name: item.name,
          description: item.description,
          price_label: item.price_label,
          portion_label: item.portion_visible === false ? null : item.portion_label,
          badge_label: includeItemBadges ? item.badge_label : null,
        },
        translationsByLocale: itemTranslationsById.get(item.id) ?? new Map(),
        fieldLabels: { name: "메뉴명", description: "메뉴 설명", price_label: "표시 가격 문구", portion_label: "제공량 표시 문구", badge_label: "배지 문구" },
        multilineFields: ["description"],
      });
    });

  return fields;
}

type PageProps = {
  params: Promise<{ menuId: string }>;
  searchParams: Promise<{ error?: string; message?: string; tab?: string }>;
};

const statusLabels: Record<MenuSiteStatus, string> = {
  draft: "비공개",
  published: "공개중",
  archived: "비공개",
};

function isMenuSiteStatus(value: string | null | undefined): value is MenuSiteStatus {
  return value === "draft" || value === "published" || value === "archived";
}

function LockedMenuEditorScreen({ site, accessState }: { site: MenuSite; accessState: MenuSiteAccessState | null }) {
  const statusLabel = accessState?.statusLabel ?? (isMenuSiteStatus(site.status) ? statusLabels[site.status] : "이용 제한");
  const message =
    accessState?.message ??
    "서비스 이용 기간이 종료되었거나 결제 확인이 필요해 이 메뉴판을 편집할 수 없습니다. 결제를 재개하면 기존 데이터를 다시 사용할 수 있습니다.";
  const templateDisplayName = getTemplateDisplayName(site.template_key, site.template_category);

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center">
          <Link href="/mypage?tab=menus&menuTab=archived" className="mb-5 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
            ← 메뉴판 목록으로
          </Link>
          <div className="rounded-3xl border border-amber-100 bg-white p-8 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{statusLabel}</span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500">{templateDisplayName}</span>
            </div>
            <h1 className="mt-6 break-keep text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">이 메뉴판은 현재 편집할 수 없습니다.</h1>
            <p className="mt-4 break-keep text-base font-bold leading-relaxed text-zinc-600">{message}</p>
            <p className="mt-4 break-keep rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
              보관/만료 상태에서는 편집, 저장, 이미지 업로드, 샘플 되돌리기, 공개 설정 변경이 제한됩니다. 미리보기로 기존 메뉴판 상태는 확인할 수 있습니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {accessState?.canOwnerPreview ? (
                <Link href={`/mypage/menus/${site.id}/preview`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-100">
                  미리보기
                </Link>
              ) : null}
              {accessState?.canConvertToBusiness ? (
                <Link href={`/mypage/menus/${site.id}/convert`} className="rounded-full bg-amber-700 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-amber-800">
                  사업자 플랜으로 전환하고 복구
                </Link>
              ) : (
                <Link href="/mypage?tab=payments&billingTab=expired" className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800">
                  구독/결제 상태 확인
                </Link>
              )}
              <Link href="/mypage?tab=inquiries" className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-100">
                고객지원 문의
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

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

function getJsonRecord(value: unknown): Record<string, Json> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, Json>) : {};
}

function getSettingsString(settings: Record<string, Json>, key: string) {
  const value = settings[key];
  return typeof value === "string" ? value : "";
}

function TextInput({ helperText, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { helperText?: ReactNode }) {
  const displayValue = props.value ?? props.defaultValue ?? "";
  const currentLength = typeof displayValue === "string" || typeof displayValue === "number" ? String(displayValue).length : 0;
  const fieldName = typeof props.name === "string" ? props.name : null;

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
          {props.maxLength && fieldName && <LiveCharacterCounter fieldName={fieldName} initialLength={currentLength} maxLength={props.maxLength} />}
        </div>
      )}
    </>
  );
}

function TextArea({ helperText, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { helperText?: ReactNode }) {
  const displayValue = props.value ?? props.defaultValue ?? "";
  const currentLength = typeof displayValue === "string" || typeof displayValue === "number" ? String(displayValue).length : 0;
  const fieldName = typeof props.name === "string" ? props.name : null;

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
          {props.maxLength && fieldName && <LiveCharacterCounter fieldName={fieldName} initialLength={currentLength} maxLength={props.maxLength} />}
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
  dirtyFormId,
  className: customClassName,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; tone?: "dark" | "light" | "danger" | "final"; dirtyFormId?: string }) {
  const className = {
    dark: "bg-zinc-950 text-white hover:bg-zinc-800",
    light: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
    danger: "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
    final: "rounded-lg bg-zinc-950 text-white shadow-sm hover:bg-zinc-800",
  }[tone];
  const buttonClassName = `inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 ${className} ${customClassName ?? ""}`;

  if (dirtyFormId) {
    return (
      <DirtySubmitButton
        {...props}
        formId={dirtyFormId}
        pendingLabel="저장 중..."
        className={buttonClassName}
      >
        {children}
      </DirtySubmitButton>
    );
  }

  return (
    <PendingSubmitButton
      {...props}
      pendingLabel="저장 중..."
      className={buttonClassName}
    >
      {children}
    </PendingSubmitButton>
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
            <h1 className="break-keep text-3xl font-bold tracking-tight text-zinc-950">메뉴링크 커스텀은 맞춤 제작형 서비스입니다.</h1>
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

  const menuSiteErrorMessage = menuSiteError?.message.toLowerCase() ?? "";
  if (menuSiteError && ["template_category", "restaurant_type", "menu_cover_label"].some((column) => menuSiteErrorMessage.includes(column))) {
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
  const accessState = await getMenuSiteAccessStateForMenuSite({ menuSiteId: site.id, userId: user.id });
  if (!accessState?.canEdit) {
    return <LockedMenuEditorScreen site={site} accessState={accessState} />;
  }

  const isReadOnly = !accessState?.canEdit;
  const canPreview = Boolean(accessState?.canOwnerPreview);
  const canViewPublic = Boolean(accessState?.canViewPublic);
  const canDownloadQr = Boolean(accessState?.canDownloadQr);
  const readOnlyMessage =
    accessState?.message ?? "체험 기간이 종료되어 편집과 공개가 제한되었습니다. 사업자 플랜으로 전환하면 기존 메뉴판을 이어서 사용할 수 있습니다.";
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
        .select("id, title, description, description_visible, display_settings, legacy_section_key, visible, sort_order, created_at")
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
  const pageIds = menuPages.map((page) => page.id);
  const categoryIds = categories.map((category) => category.id);
  const itemIds = items.map((item) => item.id);
  const [
    { data: siteTranslationsData },
    { data: pageTranslationsData },
    { data: categoryTranslationsData },
    { data: itemTranslationsData },
  ] = await Promise.all([
    supabase
      .from("menu_site_translations")
      .select("*")
      .eq("menu_site_id", menuId)
      .in("locale", editableTranslationLocales),
    pageIds.length > 0
      ? supabase.from("menu_page_translations").select("*").in("menu_page_id", pageIds).in("locale", editableTranslationLocales)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length > 0
      ? supabase.from("menu_category_translations").select("*").in("category_id", categoryIds).in("locale", editableTranslationLocales)
      : Promise.resolve({ data: [], error: null }),
    itemIds.length > 0
      ? supabase.from("menu_item_translations").select("*").in("item_id", itemIds).in("locale", editableTranslationLocales)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const pageSettings = mergePageSettings(site.page_settings);
  const latestOrder = orderData as MenuSiteOrder | null;
  const templateType = getTemplateType(site.template_key);
  const editorServiceType = getMenuEditorServiceTypeForMenuSite(latestOrder?.product_key, templateType);
  const aiUsagePlanKey = normalizeMenuLinkPlanKey(latestOrder?.product_key);

  if (editorServiceType === "custom") {
    return <CustomEditorUnavailable siteName={site.name} />;
  }

  const editorCapabilities = MENU_EDITOR_CAPABILITIES[editorServiceType];
  const templateCapabilities = getTemplateCapabilities(site.template_key);
  const siteSettings = getJsonRecord(site.settings);
  const templateTypeLabel = getTemplateTypeLabel(templateType);
  const isPriceListTemplate = templateType === "price_list";
  const menuCoverCapabilities = templateCapabilities.menuCover;
  const coverMode = menuCoverCapabilities.coverMode;
  const supportsMenuCover = coverMode !== "none";
  const supportsBasicBrandDescription = site.template_key !== "display_menu_a";
  const supportsBrandLogo = templateCapabilities.logoImage || templateCapabilities.brandLogo;
  const supportsBrandLogoReplacesName = templateCapabilities.brandLogo && templateCapabilities.brandLogoReplacesName;
  const supportsFooterStoreInfo = templateCapabilities.footerStoreInfo;
  const logoReplacesName = siteSettings.logo_replaces_name === true;
  const hasFooterNotice1 = Object.prototype.hasOwnProperty.call(siteSettings, "footer_notice_1");
  const hasFooterNotice2 = Object.prototype.hasOwnProperty.call(siteSettings, "footer_notice_2");
  const hasFooterNotice3 = Object.prototype.hasOwnProperty.call(siteSettings, "footer_notice_3");
  const footerNotice1 = hasFooterNotice1 ? getSettingsString(siteSettings, "footer_notice_1") : site.opening_hours ?? "";
  const footerNotice2 = hasFooterNotice2 ? getSettingsString(siteSettings, "footer_notice_2") : site.restaurant_address ?? "";
  const footerNotice3 = hasFooterNotice3
    ? getSettingsString(siteSettings, "footer_notice_3")
    : getSettingsString(siteSettings, "footer_sns_text") || getSettingsString(siteSettings, "footer_note");
  const menuCoverEnabled = pageSettings.menu_cover_enabled !== false;
  const coverTabLabel = getCoverTabLabel(coverMode);
  const coverToggleLabel = getCoverToggleLabel(coverMode);
  const coverDescription = getCoverDescription(coverMode);
  const usesStoreIdentityForCover = menuCoverCapabilities.usesStoreName || menuCoverCapabilities.usesStoreDescription;
  const canUseFeaturedItemCover = templateType === "menu" && menuCoverCapabilities.usesFeaturedItem;
  const templateEditorLabels = getTemplateEditorLabels(site.template_key);
  const menuManagementStarterPreset = getStarterPreset(site.template_key, site.restaurant_category, site.template_category);
  const canConfigurePcTabletLayoutMode = supportsPcTabletLayoutMode(site.template_key);
  const pcTabletLayoutMode = getPcTabletLayoutModeFromPageSettings(site.page_settings);
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
  let aiCreditBalance: AiCreditBalance | null = null;

  try {
    aiCreditBalance = await getAiCreditBalanceForMenuSite(site.id);
  } catch {
    aiCreditBalance = null;
  }

  const portOneConfig = getPublicPortOneConfig();
  const aiUsage = getAiUsageSnapshotFromCredits(aiCreditBalance) ?? getAiUsageSnapshot(site.settings, aiUsagePlanKey);
  const editableTranslationFields = buildEditableTranslationFields({
    site,
    pages: menuPages,
    categories,
    items,
    siteTranslations: (siteTranslationsData ?? []) as MenuSiteTranslation[],
    pageTranslations: (pageTranslationsData ?? []) as MenuPageTranslation[],
    categoryTranslations: (categoryTranslationsData ?? []) as MenuCategoryTranslation[],
    itemTranslations: (itemTranslationsData ?? []) as MenuItemTranslation[],
    includeItemBadges: templateCapabilities.itemBadges,
    includeCategoryDescriptions: templateCapabilities.categoryDescription,
    menuCoverCapabilities,
    useBasicLocalizationStructure: editorServiceType === "menu",
  });
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
  const selectedFeaturedItemInactive = Boolean(
    pageSettings.featured_item_enabled &&
      pageSettings.featured_item_id &&
      (!selectedFeaturedItem || selectedFeaturedItem.visible === false)
  );
  const sampleFeaturedItem = menuManagementStarterPreset
    ? (
        (menuManagementStarterPreset.featured_item_name
          ? items.find((item) => item.name === menuManagementStarterPreset.featured_item_name && item.visible !== false)
          : null) ??
        items.find((item) => item.visible !== false && item.recommended === true && Boolean(item.image_url)) ??
        items.find((item) => item.visible !== false && item.recommended === true) ??
        null
      )
    : null;
  const coverSampleDraft = menuManagementStarterPreset && supportsMenuCover
    ? {
        menuCoverEnabled: true,
        menuCoverTitle: menuCoverCapabilities.usesCoverTitle ? menuManagementStarterPreset.site.menu_cover_title : null,
        menuCoverDescription: menuCoverCapabilities.usesCoverDescription ? menuManagementStarterPreset.site.menu_cover_description : null,
        coverImageUrl: menuCoverCapabilities.usesCoverImage ? menuManagementStarterPreset.site.cover_image_url : null,
        featuredItemEnabled: Boolean(canUseFeaturedItemCover && sampleFeaturedItem),
        featuredItemId: canUseFeaturedItemCover ? sampleFeaturedItem?.id ?? null : null,
      }
    : null;
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
  const basicRestaurantNameError = activeTab === "basic" && bannerError?.includes("실제 매장명") ? bannerError : null;
  const coverFeaturedItemError = activeTab === "cover" && bannerError?.includes("대표 추천 메뉴") ? bannerError : null;
  const finalSaveError = normalizeFinalSaveError(
    (activeTab === "basic" && (basicNameError || basicRestaurantNameError)) ||
      (activeTab === "cover" && coverFeaturedItemError)
      ? null
      : bannerError
  );
  const globalBannerError = activeTab === "localization" ? bannerError : null;
  const templateDisplayName = getTemplateDisplayName(site.template_key, site.template_category);
  const publicUrl = getPublicMenuUrl(site.slug);
  const qrDownloadUrl = `/api/qr?slug=${encodeURIComponent(site.slug)}`;
  const previewUrl = `/mypage/menus/${site.id}/preview`;
  const headerStatusLabel = accessState?.statusLabel ?? (isMenuSiteStatus(site.status) ? statusLabels[site.status] : "상태 확인 필요");
  const headerStatusClassName = accessState?.canViewPublic
    ? "bg-emerald-50 text-emerald-700"
    : isReadOnly
      ? "bg-amber-50 text-amber-700"
      : "bg-zinc-100 text-zinc-600";
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
    editorCapabilities.aboutPage && (templateCapabilities.chefs || templateCapabilities.socialLinks)
      ? { label: "소개 페이지 사용", ok: pageSettings.about_enabled }
      : null,
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
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${headerStatusClassName}`}>
                  {headerStatusLabel}
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
                {canPreview ? (
                  <Link
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white"
                  >
                    미리보기
                  </Link>
                ) : (
                  <button type="button" disabled className="cursor-not-allowed rounded-full bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
                    미리보기
                  </button>
                )}
                {canViewPublic ? (
                  <>
                    <Link
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700"
                    >
                      공개 페이지 보기
                    </Link>
                    {canDownloadQr ? (
                      <a
                        href={qrDownloadUrl}
                        download
                        className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700"
                      >
                        QR 다운로드
                      </a>
                    ) : null}
                  </>
                ) : (
                  <>
                    <button type="button" disabled title="공개 중인 활성 메뉴판에서만 사용할 수 있습니다." className="cursor-not-allowed rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
                      공개 페이지 보기
                    </button>
                    <button type="button" disabled title="공개 중인 메뉴판에서만 QR을 다운로드할 수 있습니다." className="cursor-not-allowed rounded-full border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
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
        {isReadOnly && (
          <div className="mb-5 rounded-lg border border-amber-100 bg-amber-50 p-5">
            <p className="break-keep text-sm font-bold leading-relaxed text-amber-800">{readOnlyMessage}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {accessState?.canConvertToBusiness ? (
                <Link
                  href={`/mypage/menus/${site.id}/convert`}
                  className="rounded-full bg-amber-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-800"
                >
                  사업자 플랜으로 전환하고 복구
                </Link>
              ) : (
                <Link
                  href="/mypage/inquiries"
                  className="rounded-full bg-amber-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-800"
                >
                  고객지원 문의
                </Link>
              )}
            </div>
          </div>
        )}

        <MenuEditorNavigation menuId={menuId} activeTab={activeTab} tabs={visibleEditorTabs} />

        <div className={`space-y-6 ${isReadOnly ? "pointer-events-none opacity-60" : ""}`} aria-disabled={isReadOnly}>
            {activeTab === "basic" && (
              <>
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
                    <FieldLabel required>실제 매장명</FieldLabel>
                    <TextInput
                      name="restaurant_name"
                      defaultValue={site.restaurant_name ?? ""}
                      required
                      maxLength={MENU_FIELD_LIMITS.menuSites.restaurantName}
                      helperText={
                        <>
                          공개 메뉴판에 표시될 매장명입니다.
                          {basicRestaurantNameError && <span className="mt-1 block text-red-600">{basicRestaurantNameError}</span>}
                        </>
                      }
                    />
                  </div>
                  {supportsBasicBrandDescription && (
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
                  )}
                  <div>
                    <FieldLabel>공개 메뉴판 주소</FieldLabel>
                    <TextInput
                      value={publicUrl}
                      readOnly
                      className="cursor-not-allowed bg-zinc-100 text-zinc-600 focus:border-zinc-200"
                      helperText={
                        <>
                          QR 코드와 공유 링크에 사용되는 주소입니다. 결제 후에는 변경할 수 없습니다.
                          {!site.slug && <span className="mt-1 block text-red-600">공개 메뉴판 주소가 비어 있습니다. 관리자에게 문의해주세요.</span>}
                        </>
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>템플릿</FieldLabel>
                    <TextInput
                      value={templateDisplayName}
                      readOnly
                      className="cursor-not-allowed bg-zinc-100 text-zinc-600 focus:border-zinc-200"
                      helperText="결제 시 선택한 디자인입니다. 메뉴판 생성 후에는 변경할 수 없습니다."
                    />
                  </div>
                  {(supportsBrandLogo || supportsFooterStoreInfo) && (
                    <div className="space-y-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-5 md:col-span-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Store Display</p>
                        <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-950">매장 표시 정보</h3>
                        <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                          템플릿이 지원하는 경우 공개 메뉴판의 매장명, 하단 매장 안내 정보에 반영됩니다.
                        </p>
                      </div>

                      {supportsBrandLogo && (
                        <div className="space-y-4">
                          <ImageUploadField
                            label="로고 이미지"
                            menuId={site.id}
                            target="site-logo-draft"
                            currentUrl={site.logo_url}
                            description="공개 메뉴판에서는 템플릿별 안전 크기 안에서 비율에 맞춰 표시됩니다."
                            fileGuidance="PNG, JPG, WebP · 최대 2MB / 권장: 가로 512px 이상, 투명 배경 이미지"
                            deferredDeleteName="delete_logo_image"
                            draftImageUrlInputName="draft_logo_image_url"
                            draftImagePathInputName="draft_logo_image_path"
                            uploadSuccessMessage="새 로고 이미지는 저장 후 공개 메뉴판에 반영됩니다."
                            deleteSuccessMessage="로고 이미지가 임시 삭제되었습니다. 저장 후 공개 메뉴판에 반영됩니다."
                            deleteConfirmTitle="이 로고 이미지를 삭제할까요?"
                            deleteConfirmDescription="삭제해도 저장 전까지 공개 메뉴판에는 반영되지 않습니다."
                          />
                          {supportsBrandLogoReplacesName && (
                            <div>
                              <input type="hidden" name="logo_replaces_name_present" value="1" />
                              <SwitchField
                                name="logo_replaces_name"
                                label="공개 메뉴판에서 매장명 대신 로고를 표시"
                                description="로고가 등록되어 있고 이 옵션이 켜져 있으면, 공개 메뉴판의 매장명 위치에 로고가 표시됩니다."
                                defaultChecked={logoReplacesName}
                                onText="로고 표시"
                                offText="매장명 표시"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {supportsFooterStoreInfo && (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <FieldLabel>안내사항 1</FieldLabel>
                            <TextArea
                              name="footer_notice_1"
                              defaultValue={footerNotice1}
                              maxLength={MENU_FIELD_LIMITS.menuSites.footerNotice}
                              placeholder="예: 매일 10:00~22:00"
                              helperText="메뉴판 하단에 입력한 문구만 표시됩니다."
                            />
                          </div>
                          <div>
                            <FieldLabel>안내사항 2</FieldLabel>
                            <TextArea
                              name="footer_notice_2"
                              defaultValue={footerNotice2}
                              maxLength={MENU_FIELD_LIMITS.menuSites.footerNotice}
                              placeholder="예: 포장 가능 · 주차 가능"
                              helperText="업종에 맞는 짧은 안내를 입력하세요."
                            />
                          </div>
                          <div>
                            <FieldLabel>안내사항 3</FieldLabel>
                            <TextArea
                              name="footer_notice_3"
                              defaultValue={footerNotice3}
                              maxLength={MENU_FIELD_LIMITS.menuSites.footerNotice}
                              placeholder="예: Instagram @menulink_official"
                              helperText="링크가 아닌 단순 텍스트로 표시됩니다."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <FinalActionRow>
                      <SubmitButton tone="final" dirtyFormId="basic-info-form" disabled={isReadOnly}>저장</SubmitButton>
                      <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                      <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                        변경사항은 저장 후 미리보기와 공개 메뉴판에 반영됩니다. 상단의 미리보기에서 반영 내용을 확인할 수 있습니다.
                      </p>
                    </FinalActionRow>
                  </div>
                  </form>
                </SectionCard>
              </>
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
                      <SubmitButton tone="final" dirtyFormId="page-settings-form" disabled={isReadOnly}>저장</SubmitButton>
                      <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                      <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                        변경사항은 저장 후 미리보기와 공개 메뉴판에 반영됩니다. 상단의 미리보기에서 반영 내용을 확인할 수 있습니다.
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
                      <SubmitButton tone="final" dirtyFormId="intro-form" disabled={isReadOnly}>저장</SubmitButton>
                      <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                      <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                        변경사항은 저장 후 미리보기와 공개 메뉴판에 반영됩니다. 상단의 미리보기에서 반영 내용을 확인할 수 있습니다.
                      </p>
                    </FinalActionRow>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "cover" && (
              <SectionCard
                title={coverTabLabel ?? "커버 이미지"}
                eyebrow="Cover"
              >
                <form id="menu-cover-form" action={updateMenuCoverAction} className="grid gap-5 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  <div className="md:col-span-2 rounded-lg border border-zinc-100 bg-zinc-50 p-5">
                    <p className="break-keep text-sm font-bold leading-relaxed text-zinc-600">
                      {coverDescription ||
                        (usesStoreIdentityForCover
                        ? "이 템플릿은 상단 제목과 설명에 기본 정보의 매장명과 매장 설명을 사용합니다. 이 탭에서는 메뉴판에 표시되는 커버 이미지와 추천 메뉴를 설정합니다."
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
                            대표 추천 메뉴는 일부 템플릿에서 커버 이미지 영역의 메뉴 정보로 표시됩니다. 커버 이미지는 별도로 등록한 이미지만 사용합니다.
                          </p>
                        </div>
                        <div className="grid gap-5">
                          <Checkbox name="featured_item_enabled" label="대표 추천 메뉴 사용" defaultChecked={pageSettings.featured_item_enabled} />
                          <div>
                            <FieldLabel required>대표 추천 메뉴</FieldLabel>
                            <Select
                              name="featured_item_id"
                              defaultValue={pageSettings.featured_item_id ?? ""}
                              helperText={
                                <>
                                  대표 추천 메뉴 사용을 켠 경우 필수입니다. 메뉴 이미지는 커버 이미지 대체로 사용되지 않습니다.
                                  {coverFeaturedItemError && <span className="mt-1 block text-red-600">{coverFeaturedItemError}</span>}
                                </>
                              }
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
                                {selectedFeaturedItem
                                  ? `선택한 대표 추천 메뉴 “${selectedFeaturedItem.name}”이 숨김 처리되어 공개 메뉴판에는 표시되지 않습니다.`
                                  : "선택한 대표 추천 메뉴가 삭제되었거나 존재하지 않아 공개 메뉴판에는 표시되지 않습니다."}{" "}
                                선택을 해제하려면 “대표 추천 메뉴 사용”을 끄거나 선택값을 비운 뒤 저장해주세요.
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
                      <CoverSampleResetButton formId="menu-cover-form" sampleDraft={coverSampleDraft} />
                      <SubmitButton tone="final" dirtyFormId="menu-cover-form" disabled={isReadOnly}>저장</SubmitButton>
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
                <div className="space-y-5">
                  {accessState?.canUseAi ? (
                    <AiCreditRechargePanel
                      menuSiteId={site.id}
                      menuName={site.name}
                      userId={user.id}
                      userEmail={user.email}
                      storeId={portOneConfig.storeId ?? undefined}
                      channelKey={portOneConfig.channelKey ?? undefined}
                      initialBalance={aiCreditBalance}
                    />
                  ) : (
                    <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
                      현재 메뉴판은 서비스 이용 기간이 종료되어 AI 기능을 사용할 수 없습니다.
                    </div>
                  )}
                  <div className="rounded-lg border border-zinc-100 bg-white p-4 text-xs font-bold leading-relaxed text-zinc-500 shadow-sm">
                    메뉴명, 가격, 원산지, 알레르기, 이벤트 정보는 실제 매장 운영 기준과 일치하는지 반드시 확인해주세요. 잘못 입력된 정보로 인한 소비자 분쟁은 메뉴판 운영자에게 책임이 있습니다.
                  </div>
                  <MenuManagementSection
                    menuId={site.id}
                    menuPages={menuPages}
                    categories={categories}
                    items={items}
                    priceOptions={priceOptions}
                    traits={traits}
                    capabilities={templateCapabilities}
                    canManagePages={editorCapabilities.canManageMenuPages}
                    supportsDisplayPageTypes={editorCapabilities.supportsDisplayPageTypes}
                    supportsDisplayPromotionPages={editorCapabilities.supportsDisplayPromotionPages}
                    supportsDisplayMenuLayoutTypes={editorCapabilities.supportsDisplayMenuLayoutTypes}
                    aiDescriptionUsage={aiUsage.ai_description}
                    aiMenuCleanupUsage={aiUsage.ai_menu_cleanup}
                    badgeStyles={badgeStyles}
                    editorLabels={templateEditorLabels}
                    starterPreset={menuManagementStarterPreset}
                    canConfigurePcTabletLayoutMode={canConfigurePcTabletLayoutMode}
                    pcTabletLayoutMode={pcTabletLayoutMode}
                    finalSaveMessage={bannerMessage}
                    finalSaveError={finalSaveError}
                  />
                </div>
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
                        <SubmitButton tone="final" dirtyFormId="about-form" disabled={isReadOnly}>저장</SubmitButton>
                        <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                        <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                          변경사항은 저장 후 미리보기와 공개 메뉴판에 반영됩니다. 상단의 미리보기에서 반영 내용을 확인할 수 있습니다.
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
                        <SubmitButton tone="final" dirtyFormId="events-form" disabled={isReadOnly}>저장</SubmitButton>
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
                      <TextInput
                        value={templateDisplayName}
                        readOnly
                        className="cursor-not-allowed bg-zinc-100 text-zinc-600 focus:border-zinc-200"
                        helperText="결제 시 선택한 디자인입니다. 메뉴판 생성 후에는 변경할 수 없습니다."
                      />
                    </div>
                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-5">
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-zinc-950">배경색</h3>
                        <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                          메뉴판 전체 배경색을 매장 분위기에 맞게 변경할 수 있습니다. 마음에 들지 않으면 언제든 템플릿 기본 색상으로 되돌릴 수 있습니다.
                        </p>
                      </div>
                      <BackgroundColorSettingsForm
                        key={`background-${resolvedBackgroundColor}-${Boolean(customBackgroundColor)}`}
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
                        key={`typography-${customKoreanFont ? "custom" : "default"}-${resolvedKoreanFont.value}-${customEnglishFont ? "custom" : "default"}-${resolvedEnglishFont.value}-${typographySettings.font_size_scale_key}`}
                        formId="design-settings-form"
                        initialFont={resolvedKoreanFont}
                        initialEnglishFont={resolvedEnglishFont}
                        defaultFont={defaultKoreanFont}
                        defaultEnglishFont={defaultEnglishFont}
                        hasCustomKoreanFont={Boolean(customKoreanFont)}
                        hasCustomEnglishFont={Boolean(customEnglishFont)}
                        initialFontSizeScale={typographySettings.font_size_scale_key}
                        templateType={templateType}
                        templateKey={site.template_key}
                      />
                    </div>
                    <FinalActionRow>
                      <ResetTabActionButton menuId={site.id} kind="design" />
                      <SubmitButton tone="final" dirtyFormId="design-settings-form" disabled={isReadOnly}>저장</SubmitButton>
                      <FinalSaveFeedback message={bannerMessage} error={finalSaveError} />
                      <p className="basis-full break-keep text-center text-xs font-bold leading-relaxed text-zinc-400">
                        미리보기에는 저장된 디자인 설정만 표시됩니다.
                      </p>
                    </FinalActionRow>
                  </form>
                </div>
              </SectionCard>
            )}

            {activeTab === "localization" && (
              <SectionCard title="다국어" eyebrow="Localization">
                {accessState?.canUseAi ? (
                  <AiCreditRechargePanel
                    menuSiteId={site.id}
                    menuName={site.name}
                    userId={user.id}
                    userEmail={user.email}
                    storeId={portOneConfig.storeId ?? undefined}
                    channelKey={portOneConfig.channelKey ?? undefined}
                    initialBalance={aiCreditBalance}
                  />
                ) : (
                  <div className="mb-5 rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
                    현재 메뉴판은 서비스 이용 기간이 종료되어 AI 기능을 사용할 수 없습니다.
                  </div>
                )}
                <LocalizationSection
                  menuId={site.id}
                  enabledLocales={enabledLocales}
                  aiUsage={aiUsage}
                  latestTranslationJob={latestTranslationJob}
                  editableTranslationFields={editableTranslationFields}
                  isBasicLocalization={editorServiceType === "menu"}
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
                          disabled={isReadOnly}
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
                          disabled={isReadOnly}
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
                    {isReadOnly && (
                      <p className="mt-3 break-keep rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-700">
                        체험 기간이 종료되어 공개 상태를 변경할 수 없습니다. 사업자 플랜으로 전환 후 다시 이용해주세요.
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
                  {optionalChecklist.length > 1 && (
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
                  )}
                  <p className="break-keep text-sm font-bold text-amber-700">
                    QR 코드는 결제 시 지정한 공개 메뉴판 주소로 연결됩니다.
                  </p>
                  <p className="break-keep rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
                    공개 전 메뉴명, 가격, 영업시간, 이벤트, 원산지, 알레르기 정보가 정확한지 확인해주세요. AI 기능을 통해 생성된 문구와 번역은 참고용 초안이며, 실제 매장 운영 정보와 일치하는지 직접 검토해야 합니다.
                  </p>
                  <div>
                    <FinalActionRow>
                      <SubmitButton tone="final" dirtyFormId="publish-settings-form" disabled={isReadOnly}>저장</SubmitButton>
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
