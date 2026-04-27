import Link from "next/link";
import { redirect } from "next/navigation";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import {
  createCategoryAction,
  createMenuItemAction,
  deleteCategoryAction,
  deleteMenuItemAction,
  updateCategoryAction,
  updateMenuItemAction,
  updateMenuSiteAction,
} from "@/app/mypage/menus/actions";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { templateCatalog } from "@/lib/templates";

type MenuSite = Pick<
  Database["public"]["Tables"]["menu_sites"]["Row"],
  "id" | "user_id" | "name" | "slug" | "template_key" | "status"
>;
type MenuCategory = Pick<
  Database["public"]["Tables"]["menu_categories"]["Row"],
  "id" | "name" | "description" | "sort_order" | "visible"
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
  | "visible"
  | "sort_order"
>;

type PageProps = {
  params: Promise<{ menuId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
};

const statusOptions = [
  { value: "draft", label: "작성중" },
  { value: "published", label: "공개중" },
  { value: "archived", label: "보관됨" },
];

function getStatusNotice(site: MenuSite, publicUrl: string) {
  if (site.status === "published") {
    return {
      title: "공개 링크가 활성화되어 있습니다",
      description: `고객은 ${publicUrl} 주소로 메뉴판을 볼 수 있습니다. 카테고리와 메뉴 아이템은 visible=true인 항목만 공개됩니다.`,
      className: "border-emerald-100 bg-emerald-50 text-emerald-800",
    };
  }

  if (site.status === "draft") {
    return {
      title: "비공개 상태입니다",
      description: "현재 메뉴판은 작성중 상태라 공개 페이지에서 보이지 않습니다. 공개하려면 상태를 공개중으로 변경해 저장하세요.",
      className: "border-amber-100 bg-amber-50 text-amber-800",
    };
  }

  return {
    title: "보관된 메뉴판입니다",
    description: "보관 상태의 메뉴판은 공개 페이지에서 보이지 않습니다. 다시 공개하려면 상태를 공개중으로 변경해 저장하세요.",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
  };
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{children}</label>;
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 ${
        props.className ?? ""
      }`}
    />
  );
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-2 min-h-24 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 ${
        props.className ?? ""
      }`}
    />
  );
}

function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 ${
        props.className ?? ""
      }`}
    />
  );
}

function Checkbox({
  name,
  defaultChecked,
  label,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-zinc-950" />
      {label}
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
    <button
      type="submit"
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function categoryLabel(categories: MenuCategory[], categoryId: string | null) {
  return categories.find((category) => category.id === categoryId)?.name ?? "카테고리 없음";
}

export default async function EditMenuPage({ params, searchParams }: PageProps) {
  const { menuId } = await params;
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/mypage/menus/${menuId}/edit`);
  }

  const { data: menuSite, error: menuSiteError } = await supabase
    .from("menu_sites")
    .select("id, user_id, name, slug, template_key, status")
    .eq("id", menuId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (menuSiteError || !menuSite) {
    redirect("/mypage?error=menu-not-found");
  }

  const [{ data: categoriesData, error: categoriesError }, { data: itemsData, error: itemsError }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("id, name, description, sort_order, visible")
      .eq("menu_site_id", menuId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id, category_id, name, description, price, image_url, badge, is_best, is_sold_out, visible, sort_order")
      .eq("menu_site_id", menuId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const site = menuSite as MenuSite;
  const categories = (categoriesData ?? []) as MenuCategory[];
  const items = (itemsData ?? []) as MenuItem[];
  const publicUrl = `/m/${site.slug}`;
  const statusNotice = getStatusNotice(site, publicUrl);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-24 text-zinc-950">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
          <div>
            <Link href="/mypage" className="mb-6 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
              ← 마이페이지
            </Link>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Menu Editor</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{site.name}</h1>
            <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
              기본 정보, 카테고리, 메뉴 아이템을 Supabase DB에 바로 저장합니다.
            </p>
          </div>

          <Link
            href={publicUrl}
            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-950 hover:text-white"
          >
            공개 메뉴판 보기
          </Link>
        </header>

        {message && (
          <div className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {(categoriesError || itemsError) && (
          <div className="mb-6 rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
            {categoriesError?.message ?? itemsError?.message}
          </div>
        )}

        <section className={`mb-8 rounded-3xl border p-6 shadow-sm ${statusNotice.className}`}>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold">{statusNotice.title}</h2>
              <p className="mt-2 break-keep text-sm font-semibold leading-relaxed opacity-80">{statusNotice.description}</p>
            </div>
            {site.status === "published" && (
              <Link href={publicUrl} className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white">
                {publicUrl}
              </Link>
            )}
          </div>
        </section>

        <section className="mb-8 rounded-3xl bg-white p-7 shadow-sm">
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Site Settings</p>
              <h2 className="text-3xl font-bold tracking-tight">메뉴판 기본 정보</h2>
            </div>
            <p className="text-sm font-bold text-zinc-400">{publicUrl}</p>
          </div>

          <form action={updateMenuSiteAction} className="grid gap-5 md:grid-cols-2">
            <input type="hidden" name="menuId" value={site.id} />
            <div>
              <FieldLabel>메뉴판 이름</FieldLabel>
              <TextInput name="name" defaultValue={site.name} required />
            </div>
            <div>
              <FieldLabel>공개 메뉴판 주소</FieldLabel>
              <TextInput name="slug" defaultValue={site.slug} minLength={3} required />
              <p className="mt-2 break-keep text-xs font-medium leading-relaxed text-zinc-400">
                고객에게 공유되는 주소입니다. 변경하면 기존에 공유한 /m/{site.slug} 링크가 더 이상 연결되지 않을 수 있습니다.
              </p>
            </div>
            <div>
              <FieldLabel>템플릿</FieldLabel>
              <Select name="template_key" defaultValue={site.template_key}>
                {templateCatalog.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.name} ({template.key})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>공개 상태</FieldLabel>
              <Select name="status" defaultValue={site.status}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <SubmitButton>기본 정보 저장</SubmitButton>
            </div>
          </form>
        </section>

        <section className="mb-8 rounded-3xl bg-white p-7 shadow-sm">
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Categories</p>
            <h2 className="text-3xl font-bold tracking-tight">카테고리 관리</h2>
          </div>

          <form action={createCategoryAction} className="mb-6 grid gap-4 rounded-3xl border border-zinc-100 bg-zinc-50 p-5 md:grid-cols-[1fr_1fr_120px_auto] md:items-end">
            <input type="hidden" name="menuId" value={site.id} />
            <div>
              <FieldLabel>카테고리 이름</FieldLabel>
              <TextInput name="category_name" placeholder="Lunch Course" required />
            </div>
            <div>
              <FieldLabel>설명</FieldLabel>
              <TextInput name="category_description" placeholder="카테고리 설명" />
            </div>
            <div>
              <FieldLabel>정렬 순서</FieldLabel>
              <TextInput name="category_sort_order" type="number" defaultValue={categories.length + 1} />
            </div>
            <div className="flex flex-col gap-3">
              <Checkbox name="category_visible" label="노출" defaultChecked />
              <SubmitButton>추가</SubmitButton>
            </div>
          </form>

          {categories.length > 0 ? (
            <div className="space-y-4">
              {categories.map((category) => (
                <article key={category.id} className="rounded-3xl border border-zinc-100 p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-bold text-zinc-400">정렬 순서 {category.sort_order}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${category.visible ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                      {category.visible ? "공개 메뉴판 노출" : "숨김"}
                    </span>
                  </div>
                  <form action={updateCategoryAction} className="grid gap-4 md:grid-cols-[1fr_1fr_120px_auto] md:items-end">
                    <input type="hidden" name="menuId" value={site.id} />
                    <input type="hidden" name="categoryId" value={category.id} />
                    <div>
                      <FieldLabel>카테고리 이름</FieldLabel>
                      <TextInput name="category_name" defaultValue={category.name} required />
                    </div>
                    <div>
                      <FieldLabel>설명</FieldLabel>
                      <TextInput name="category_description" defaultValue={category.description ?? ""} />
                    </div>
                    <div>
                      <FieldLabel>정렬 순서</FieldLabel>
                      <TextInput name="category_sort_order" type="number" defaultValue={category.sort_order} />
                    </div>
                    <div className="flex flex-col gap-3">
                      <Checkbox name="category_visible" label="노출" defaultChecked={category.visible} />
                      <SubmitButton tone="light">저장</SubmitButton>
                    </div>
                  </form>
                  <form action={deleteCategoryAction} className="mt-3">
                    <input type="hidden" name="menuId" value={site.id} />
                    <input type="hidden" name="categoryId" value={category.id} />
                    <SubmitButton tone="danger">삭제</SubmitButton>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-200 p-8 text-center">
              <h3 className="text-xl font-bold">아직 카테고리가 없습니다</h3>
              <p className="mt-2 text-sm font-medium text-zinc-500">첫 카테고리를 추가하면 메뉴 아이템을 묶어서 관리할 수 있습니다.</p>
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Menu Items</p>
            <h2 className="text-3xl font-bold tracking-tight">메뉴 아이템 관리</h2>
          </div>

          <form action={createMenuItemAction} className="mb-6 grid gap-4 rounded-3xl border border-zinc-100 bg-zinc-50 p-5 md:grid-cols-2">
            <input type="hidden" name="menuId" value={site.id} />
            <div>
              <FieldLabel>메뉴 이름</FieldLabel>
              <TextInput name="item_name" placeholder="Truffle Pasta" required />
            </div>
            <div>
              <FieldLabel>카테고리</FieldLabel>
              <Select name="item_category_id" defaultValue="">
                <option value="">카테고리 없음</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>가격</FieldLabel>
              <TextInput name="item_price" type="number" min={0} step={1} defaultValue={0} />
            </div>
            <div>
              <FieldLabel>정렬 순서</FieldLabel>
              <TextInput name="item_sort_order" type="number" defaultValue={items.length + 1} />
            </div>
            <div>
              <FieldLabel>배지</FieldLabel>
              <TextInput name="item_badge" placeholder="BEST" />
            </div>
            <div>
              <FieldLabel>이미지 URL</FieldLabel>
              <TextInput name="item_image_url" placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>설명</FieldLabel>
              <TextArea name="item_description" placeholder="메뉴 설명" />
            </div>
            <div className="flex flex-wrap gap-4 md:col-span-2">
              <Checkbox name="item_visible" label="노출" defaultChecked />
              <Checkbox name="item_recommended" label="추천 메뉴" />
              <Checkbox name="item_is_sold_out" label="품절" />
            </div>
            <div className="md:col-span-2">
              <SubmitButton>메뉴 추가</SubmitButton>
            </div>
          </form>

          {items.length > 0 ? (
            <div className="space-y-5">
              {items.map((item) => (
                <article key={item.id} className="rounded-3xl border border-zinc-100 p-5">
                  <div className="mb-4 flex flex-col justify-between gap-2 border-b border-zinc-100 pb-4 md:flex-row md:items-center">
                    <div>
                      <h3 className="text-xl font-bold">{item.name}</h3>
                      <p className="mt-1 text-sm font-bold text-zinc-400">{categoryLabel(categories, item.category_id)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      {item.is_best && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">추천</span>}
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.visible ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                        {item.visible ? "노출" : "숨김"}
                      </span>
                      <p className="text-sm font-bold text-zinc-500">{item.price.toLocaleString("ko-KR")}원</p>
                    </div>
                  </div>

                  <form action={updateMenuItemAction} className="grid gap-4 md:grid-cols-2">
                    <input type="hidden" name="menuId" value={site.id} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <div>
                      <FieldLabel>메뉴 이름</FieldLabel>
                      <TextInput name="item_name" defaultValue={item.name} required />
                    </div>
                    <div>
                      <FieldLabel>카테고리</FieldLabel>
                      <Select name="item_category_id" defaultValue={item.category_id ?? ""}>
                        <option value="">카테고리 없음</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>가격</FieldLabel>
                      <TextInput name="item_price" type="number" min={0} step={1} defaultValue={item.price} />
                    </div>
                    <div>
                      <FieldLabel>정렬 순서</FieldLabel>
                      <TextInput name="item_sort_order" type="number" defaultValue={item.sort_order} />
                    </div>
                    <div>
                      <FieldLabel>배지</FieldLabel>
                      <TextInput name="item_badge" defaultValue={item.badge ?? ""} />
                    </div>
                    <div>
                      <FieldLabel>이미지 URL</FieldLabel>
                      <TextInput name="item_image_url" defaultValue={item.image_url ?? ""} />
                    </div>
                    <div className="md:col-span-2">
                      <FieldLabel>설명</FieldLabel>
                      <TextArea name="item_description" defaultValue={item.description ?? ""} />
                    </div>
                    <div className="flex flex-wrap gap-4 md:col-span-2">
                      <Checkbox name="item_visible" label="노출" defaultChecked={item.visible} />
                      <Checkbox name="item_recommended" label="추천 메뉴" defaultChecked={item.is_best} />
                      <Checkbox name="item_is_sold_out" label="품절" defaultChecked={item.is_sold_out} />
                    </div>
                    <div className="md:col-span-2">
                      <SubmitButton tone="light">메뉴 저장</SubmitButton>
                    </div>
                  </form>

                  <form action={deleteMenuItemAction} className="mt-3">
                    <input type="hidden" name="menuId" value={site.id} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <SubmitButton tone="danger">메뉴 삭제</SubmitButton>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-200 p-8 text-center">
              <h3 className="text-xl font-bold">아직 메뉴 아이템이 없습니다</h3>
              <p className="mt-2 text-sm font-medium text-zinc-500">대표 메뉴, 가격, 노출 상태를 먼저 입력해 기본 메뉴판을 구성하세요.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
