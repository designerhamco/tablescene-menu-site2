import Link from "next/link";
import { redirect } from "next/navigation";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import {
  updateAboutAction,
  updateIntroAction,
  updateMenuCoverAction,
  updateMenuSiteAction,
  updatePageSettingsAction,
  updatePublishSettingsAction,
} from "@/app/mypage/menus/actions";
import MenuEditorNavigation from "@/components/mypage/menu-editor/MenuEditorNavigation";
import ImageUploadField from "@/components/mypage/menu-editor/ImageUploadField";
import MenuManagementSection from "@/components/mypage/menu-editor/MenuManagementSection";
import {
  ChefsSection as InteractiveChefsSection,
  EventsSection as InteractiveEventsSection,
  SocialLinksSection as InteractiveSocialLinksSection,
} from "@/components/mypage/menu-editor/OptionalContentSections";
import { isMenuEditorTabKey, pageSettingKeys, pageSettingLabels } from "@/lib/menu-editor";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { createClient } from "@/lib/supabase/server";
import type { Database, MenuSiteStatus } from "@/lib/supabase/types";
import { getTemplateDisplayName } from "@/lib/templates";
import { mergePageSettings } from "@/types/menu";

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
  | "restaurant_address"
  | "restaurant_phone"
  | "intro_title"
  | "intro_description"
  | "brand_description"
  | "menu_cover_title"
  | "menu_cover_description"
  | "about_description"
  | "opening_hours"
  | "map_url"
  | "logo_url"
  | "cover_image_url"
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
type MenuChef = Database["public"]["Tables"]["menu_chefs"]["Row"];
type MenuEvent = Database["public"]["Tables"]["menu_events"]["Row"];
type MenuSocialLink = Database["public"]["Tables"]["menu_social_links"]["Row"];

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
  "id, user_id, name, slug, template_key, status, published_at, restaurant_name, restaurant_category, restaurant_address, restaurant_phone, intro_title, intro_description, brand_description, menu_cover_title, menu_cover_description, about_description, opening_hours, map_url, logo_url, cover_image_url, page_settings";
const menuSiteSelect = baseMenuSiteSelect.replace("template_key", "template_key, template_category");

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
  return (
    <>
      <input
        {...props}
        className={`mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 disabled:bg-zinc-100 disabled:text-zinc-400 ${
          className ?? ""
        }`}
      />
      <FieldHint>{helperText}</FieldHint>
    </>
  );
}

function TextArea({ helperText, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { helperText?: ReactNode }) {
  return (
    <>
      <textarea
        {...props}
        className={`mt-2 min-h-24 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition invalid:border-red-200 focus:border-zinc-950 invalid:focus:border-red-500 ${
          className ?? ""
        }`}
      />
      <FieldHint>{helperText}</FieldHint>
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
  return (
    <label className="inline-flex items-start gap-2 text-sm font-bold leading-relaxed text-zinc-600">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-zinc-950" />
      <span>{label}</span>
    </label>
  );
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

function HiddenMenuId({ menuId }: { menuId: string }) {
  return <input type="hidden" name="menuId" value={menuId} />;
}

export default async function EditMenuPage({ params, searchParams }: PageProps) {
  const { menuId } = await params;
  const { error, message, tab } = await searchParams;
  const activeTab = isMenuEditorTabKey(tab) ? tab : "basic";
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

  if (menuSiteError && menuSiteError.message.toLowerCase().includes("template_category")) {
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
    { data: itemsData },
    { data: traitsData },
    { data: chefsData },
    { data: eventsData },
    { data: socialLinksData },
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
          "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order"
        )
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
    ]);

  const menuPages = (menuPagesData ?? []) as MenuPage[];
  const categories = (categoriesData ?? []) as MenuCategory[];
  const items = (itemsData ?? []) as MenuItem[];
  const traits = (traitsData ?? []) as MenuItemTrait[];
  const chefs = (chefsData ?? []) as MenuChef[];
  const events = (eventsData ?? []) as MenuEvent[];
  const socialLinks = (socialLinksData ?? []) as MenuSocialLink[];
  const pageSettings = mergePageSettings(site.page_settings);
  const templateDisplayName = getTemplateDisplayName(site.template_key, site.template_category);
  const publicUrl = getPublicMenuUrl(site.slug);
  const previewUrl = `/mypage/menus/${site.id}/preview`;
  const isSlugLocked = site.status === "published" || Boolean(site.published_at);
  const hasVisibleItem = items.some((item) => item.visible);
  const checklist = [
    { label: "매장명 입력", ok: Boolean(site.restaurant_name || site.name) },
    { label: "공개 주소 설정", ok: Boolean(site.slug) },
    { label: "메뉴 카테고리 1개 이상", ok: categories.length > 0 },
    { label: "노출 메뉴 1개 이상", ok: hasVisibleItem },
    { label: "공개 상태에서 메뉴판 주소 활성화", ok: site.status === "published" },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
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

        <MenuEditorNavigation menuId={menuId} activeTab={activeTab} />

        <div className="space-y-6">
            {activeTab === "basic" && (
              <SectionCard title="기본 정보" eyebrow="Basic">
                <form action={updateMenuSiteAction} className="grid gap-5 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  <div>
                    <FieldLabel required>메뉴판 관리용 이름</FieldLabel>
                    <TextInput name="name" defaultValue={site.name} required maxLength={80} helperText="마이페이지에서 구분할 이름입니다. 최대 80자까지 입력할 수 있습니다." />
                  </div>
                  <div>
                    <FieldLabel>실제 매장명</FieldLabel>
                    <TextInput name="restaurant_name" defaultValue={site.restaurant_name ?? ""} maxLength={80} helperText="공개 메뉴판에 표시될 매장명입니다." />
                  </div>
                  <div>
                    <FieldLabel>매장 카테고리</FieldLabel>
                    <TextInput name="restaurant_category" defaultValue={site.restaurant_category ?? ""} placeholder="예: 이탈리안 레스토랑" maxLength={50} helperText="고객이 이해하기 쉬운 업종명을 입력해주세요." />
                  </div>
                  <div>
                    <FieldLabel required>공개 주소</FieldLabel>
                    {isSlugLocked && <input type="hidden" name="slug" value={site.slug} />}
                    <TextInput name="slug" defaultValue={site.slug} required disabled={isSlugLocked} pattern="[a-z0-9-]+" title="영문 소문자, 숫자, 하이픈만 입력할 수 있습니다." helperText="영문 소문자, 숫자, 하이픈만 사용할 수 있습니다." />
                    <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
                      공개 후에는 QR 코드와 공유 링크 유지를 위해 주소를 변경할 수 없습니다.
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>템플릿</FieldLabel>
                    <TextInput value={templateDisplayName} readOnly helperText="결제 시 선택한 템플릿입니다." />
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
                    <TextInput name="intro_title" defaultValue={site.intro_title ?? ""} required maxLength={80} helperText="첫 화면에서 가장 크게 보이는 제목입니다." />
                  </div>
                  <div>
                    <ImageUploadField label="로고 이미지" menuId={site.id} target="site-logo" currentUrl={site.logo_url} />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel required>인트로 설명</FieldLabel>
                    <TextArea name="intro_description" defaultValue={site.intro_description ?? ""} required maxLength={300} helperText="매장의 첫인상을 설명하는 문구입니다. 최대 300자까지 입력할 수 있습니다." />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>브랜드 설명</FieldLabel>
                    <TextArea name="brand_description" defaultValue={site.brand_description ?? ""} maxLength={500} helperText="브랜드나 공간의 분위기를 소개해주세요." />
                  </div>
                  <div className="md:col-span-2">
                    <ImageUploadField label="커버 이미지" menuId={site.id} target="site-cover" currentUrl={site.cover_image_url} />
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
                  <div>
                    <FieldLabel required>메뉴 커버 제목</FieldLabel>
                    <TextInput name="menu_cover_title" defaultValue={site.menu_cover_title ?? ""} required maxLength={80} helperText="메뉴 영역 상단에 표시되는 제목입니다." />
                  </div>
                  <div>
                    <ImageUploadField label="커버 이미지" menuId={site.id} target="site-cover" currentUrl={site.cover_image_url} />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel required>메뉴 커버 설명</FieldLabel>
                    <TextArea name="menu_cover_description" defaultValue={site.menu_cover_description ?? ""} required maxLength={300} helperText="메뉴 소개 문구를 입력해주세요. 최대 300자까지 입력할 수 있습니다." />
                  </div>
                  <div className="md:col-span-2">
                    <SubmitButton>메뉴 커버 저장</SubmitButton>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "menu" && (
              <MenuManagementSection menuId={site.id} menuPages={menuPages} categories={categories} items={items} traits={traits} />
            )}

            {activeTab === "about" && (
              <SectionCard title="소개" eyebrow="About">
                <form action={updateAboutAction} className="grid gap-5 md:grid-cols-2">
                  <HiddenMenuId menuId={site.id} />
                  <div>
                    <FieldLabel required>주소</FieldLabel>
                    <TextInput name="restaurant_address" defaultValue={site.restaurant_address ?? ""} required maxLength={150} helperText="공개 메뉴판의 소개 영역에 표시됩니다." />
                  </div>
                  <div>
                    <FieldLabel required>전화번호</FieldLabel>
                    <TextInput name="restaurant_phone" defaultValue={site.restaurant_phone ?? ""} required inputMode="tel" pattern="[0-9+\-()\s]{8,20}" title="숫자, 하이픈, 공백, +, 괄호만 입력할 수 있습니다." helperText="숫자, 하이픈, 공백, +, 괄호만 입력할 수 있습니다." />
                  </div>
                  <div>
                    <FieldLabel required>영업시간</FieldLabel>
                    <TextInput name="opening_hours" defaultValue={site.opening_hours ?? ""} required maxLength={120} helperText="예: 매일 10:00 - 21:00" />
                  </div>
                  <div>
                    <FieldLabel>지도 URL</FieldLabel>
                    <TextInput name="map_url" defaultValue={site.map_url ?? ""} type="url" placeholder="https://..." helperText="네이버지도, 카카오맵, 구글맵 링크를 입력할 수 있습니다." />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel required>소개 문구</FieldLabel>
                    <TextArea name="about_description" defaultValue={site.about_description ?? ""} required maxLength={500} helperText="매장 소개 영역에 표시됩니다. 최대 500자까지 입력할 수 있습니다." />
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>브랜드 설명</FieldLabel>
                    <TextArea name="brand_description" defaultValue={site.brand_description ?? ""} maxLength={500} helperText="브랜드 스토리나 운영 철학을 입력해주세요." />
                  </div>
                  <p className="md:col-span-2 text-sm font-semibold text-zinc-500">SNS 링크는 SNS 탭에서 관리합니다.</p>
                  <div className="md:col-span-2">
                    <SubmitButton>소개 저장</SubmitButton>
                  </div>
                </form>
              </SectionCard>
            )}

            {activeTab === "chefs" && <InteractiveChefsSection menuId={site.id} chefs={chefs} />}
            {activeTab === "events" && <InteractiveEventsSection menuId={site.id} events={events} />}
            {activeTab === "social" && <InteractiveSocialLinksSection menuId={site.id} socialLinks={socialLinks} />}

            {activeTab === "design" && (
              <SectionCard title="디자인" eyebrow="Design">
                <div className="space-y-5">
                  <div>
                    <FieldLabel>현재 템플릿</FieldLabel>
                    <TextInput value={templateDisplayName} readOnly helperText="템플릿 변경 기능은 추후 제공 예정입니다." />
                  </div>
                  <p className="break-keep text-sm font-semibold leading-relaxed text-zinc-500">결제 시 선택한 템플릿입니다.</p>
                  <p className="break-keep text-sm font-semibold leading-relaxed text-zinc-500">전체 폰트 선택 기능은 추후 제공 예정입니다.</p>
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
                    <h3 className="font-bold">공개 전 체크리스트</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {checklist.map((item) => (
                        <p key={item.label} className={`text-sm font-bold ${item.ok ? "text-emerald-700" : "text-zinc-400"}`}>
                          {item.ok ? "완료" : "필요"} · {item.label}
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
  );
}
