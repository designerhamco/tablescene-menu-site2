"use client";

import { useMemo, useState, type ReactNode } from "react";

import {
  createCategoryAction,
  createMenuItemAction,
  createMenuItemTraitAction,
  createMenuPageAction,
  deleteCategoryAction,
  deleteMenuItemAction,
  deleteMenuItemTraitAction,
  deleteMenuPageAction,
  updateCategoryAction,
  updateMenuItemAction,
  updateMenuItemTraitAction,
  updateMenuPageAction,
} from "@/app/mypage/menus/actions";
import ImageUploadField from "@/components/mypage/menu-editor/ImageUploadField";
import { BADGE_LABELS, BADGE_TYPES, getBadgeLabel, getMenuItemBadgeType } from "@/lib/menu-badges";
import { MENU_LIMITS } from "@/lib/menu-starter-presets";
import type { Database } from "@/lib/supabase/types";
import { formatMenuPrice, formatPortionLabel, getMenuPageTitle, sortMenuPages } from "@/types/menu";

type MenuPage = Pick<
  Database["public"]["Tables"]["menu_pages"]["Row"],
  "id" | "title" | "description" | "description_visible" | "legacy_section_key" | "visible" | "sort_order" | "created_at"
>;
type MenuCategory = Pick<
  Database["public"]["Tables"]["menu_categories"]["Row"],
  "id" | "menu_page_id" | "name" | "description" | "description_visible" | "section_key" | "sort_order" | "visible"
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

type MenuManagementSectionProps = {
  menuId: string;
  menuPages: MenuPage[];
  categories: MenuCategory[];
  items: MenuItem[];
  traits: MenuItemTrait[];
};

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

function TextInput({ helperText, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { helperText?: ReactNode }) {
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

function TextArea({ helperText, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { helperText?: ReactNode }) {
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

function ValidatedTextInput({
  name,
  label,
  defaultValue = "",
  placeholder,
  required,
  maxLength,
  type = "text",
  min,
  step,
  helperText,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  placeholder: string;
  required?: boolean;
  maxLength?: number;
  type?: React.HTMLInputTypeAttribute;
  min?: number;
  step?: number;
  helperText?: string;
}) {
  const [value, setValue] = useState(defaultValue == null ? "" : String(defaultValue));
  const isTooLong = typeof maxLength === "number" && value.length > maxLength;
  const isMissing = Boolean(required && !value.trim());

  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        name={name}
        type={type}
        value={value}
        min={min}
        step={step}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        onChange={(event) => setValue(event.target.value)}
        className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
          isTooLong || isMissing ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
        }`}
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
        <span className={isTooLong || isMissing ? "text-red-600" : "text-zinc-400"}>
          {isMissing ? `${label}은 필수 입력입니다.` : isTooLong ? `최대 ${maxLength}자까지 입력 가능합니다.` : helperText ?? ""}
        </span>
        {typeof maxLength === "number" && <span className={isTooLong ? "text-red-600" : "text-zinc-400"}>{value.length} / {maxLength}</span>}
      </div>
    </div>
  );
}

function ValidatedTextArea({
  name,
  label,
  defaultValue = "",
  placeholder,
  maxLength,
  helperText,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder: string;
  maxLength: number;
  helperText?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const isTooLong = value.length > maxLength;

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        name={name}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        className={`mt-2 min-h-24 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
          isTooLong ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
        }`}
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
        <span className={isTooLong ? "text-red-600" : "text-zinc-400"}>{isTooLong ? `최대 ${maxLength}자까지 입력 가능합니다.` : helperText ?? ""}</span>
        <span className={isTooLong ? "text-red-600" : "text-zinc-400"}>{value.length} / {maxLength}</span>
      </div>
    </div>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mt-2 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950 ${
        props.className ?? ""
      }`}
    />
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

function SubmitButton({ children, tone = "dark", disabled = false }: { children: ReactNode; tone?: "dark" | "light" | "danger"; disabled?: boolean }) {
  const className = {
    dark: "bg-zinc-950 text-white hover:bg-zinc-800",
    light: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
    danger: "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
  }[tone];

  return (
    <button
      type="submit"
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 ${className}`}
    >
      {children}
    </button>
  );
}

function HiddenMenuId({ menuId }: { menuId: string }) {
  return <input type="hidden" name="menuId" value={menuId} />;
}

function BadgeSelect({ defaultValue = "none" }: { defaultValue?: string | null }) {
  return (
    <Select name="item_badge_type" defaultValue={defaultValue ?? "none"}>
      {BADGE_TYPES.map((type) => (
        <option key={type} value={type}>
          {BADGE_LABELS[type] || "없음"}
        </option>
      ))}
    </Select>
  );
}

function TraitValueSelect({ defaultValue = 0 }: { defaultValue?: number }) {
  return (
    <Select name="trait_value" defaultValue={String(defaultValue)}>
      {[0, 1, 2, 3, 4, 5].map((value) => (
        <option key={value} value={value}>
          {value}/5
        </option>
      ))}
    </Select>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm font-bold text-zinc-400">{children}</p>;
}

function DetailValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <div className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-700">{children || <span className="text-zinc-400">입력 전</span>}</div>
    </div>
  );
}

function DeleteConfirmForm({
  action,
  menuId,
  hiddenName,
  hiddenValue,
  disabledReason,
  isConfirming,
  onRequestConfirm,
  onCancel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  menuId: string;
  hiddenName: string;
  hiddenValue: string;
  disabledReason?: string;
  isConfirming: boolean;
  onRequestConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={onRequestConfirm}
        className="inline-flex items-center justify-center rounded-full border border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
      >
        삭제
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4">
      <p className="text-sm font-bold text-red-700">정말 삭제하시겠습니까?</p>
      {disabledReason && <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-red-600">{disabledReason}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={action}>
          <HiddenMenuId menuId={menuId} />
          <input type="hidden" name={hiddenName} value={hiddenValue} />
          <SubmitButton tone="danger" disabled={Boolean(disabledReason)}>
            삭제 확정
          </SubmitButton>
        </form>
        <button type="button" onClick={onCancel} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
          취소
        </button>
      </div>
    </div>
  );
}

function MenuPageForm({ menuId, page, count, onCancel }: { menuId: string; page?: MenuPage; count: number; onCancel: () => void }) {
  const [title, setTitle] = useState(page?.title ?? "");
  const titleInvalid = !title.trim() || title.length > 30;

  return (
    <form action={page ? updateMenuPageAction : createMenuPageAction} className="mt-4 space-y-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <HiddenMenuId menuId={menuId} />
      {page && <input type="hidden" name="menuPageId" value={page.id} />}
      <div>
        <FieldLabel required>페이지 이름</FieldLabel>
        <input
          name="menu_page_title"
          value={title}
          maxLength={30}
          placeholder="페이지 이름을 입력하세요"
          required
          onChange={(event) => setTitle(event.target.value)}
          className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
            titleInvalid ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
          }`}
        />
        <div className="mt-2 flex items-center justify-between text-xs font-bold">
          <span className={titleInvalid ? "text-red-600" : "text-zinc-400"}>
            {!title.trim() ? "이름은 필수 입력입니다" : title.length > 30 ? "최대 30자까지 입력 가능합니다" : ""}
          </span>
          <span className={title.length > 30 ? "text-red-600" : "text-zinc-400"}>{title.length} / 30</span>
        </div>
      </div>
      <ValidatedTextArea name="menu_page_description" label="페이지 설명" defaultValue={page?.description ?? ""} placeholder="간단한 설명을 입력하세요" maxLength={100} helperText="메뉴 페이지를 설명하는 짧은 문구입니다." />
      <ValidatedTextInput name="menu_page_sort_order" label="정렬 순서" type="number" min={0} step={1} defaultValue={page?.sort_order ?? count} placeholder="정렬 순서를 입력하세요" required helperText="숫자가 낮을수록 먼저 표시됩니다." />
      <div className="grid gap-3">
        <Checkbox name="menu_page_description_visible" label="설명 표시" defaultChecked={page?.description_visible ?? true} />
        <Checkbox name="menu_page_visible" label="메뉴판 표시" defaultChecked={page?.visible ?? true} />
      </div>
      <SubmitButton tone={page ? "light" : "dark"} disabled={titleInvalid}>
        {page ? "페이지 저장" : "페이지 추가"}
      </SubmitButton>
      <button type="button" onClick={onCancel} className="ml-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
        취소
      </button>
    </form>
  );
}

function MenuCategoryForm({
  menuId,
  pageId,
  category,
  count,
  onCancel,
}: {
  menuId: string;
  pageId: string;
  category?: MenuCategory;
  count: number;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const nameInvalid = !name.trim() || name.length > 30;

  return (
    <form action={category ? updateCategoryAction : createCategoryAction} className="mt-4 space-y-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <HiddenMenuId menuId={menuId} />
      {category && <input type="hidden" name="categoryId" value={category.id} />}
      <input type="hidden" name="category_menu_page_id" value={category?.menu_page_id ?? pageId} />
      <div>
        <FieldLabel required>메뉴 카테고리 이름</FieldLabel>
        <input
          name="category_name"
          value={name}
          maxLength={30}
          placeholder="메뉴 카테고리 이름을 입력하세요"
          required
          onChange={(event) => setName(event.target.value)}
          className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
            nameInvalid ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
          }`}
        />
        <div className="mt-2 flex items-center justify-between text-xs font-bold">
          <span className={nameInvalid ? "text-red-600" : "text-zinc-400"}>
            {!name.trim() ? "이름은 필수 입력입니다" : name.length > 30 ? "최대 30자까지 입력 가능합니다" : ""}
          </span>
          <span className={name.length > 30 ? "text-red-600" : "text-zinc-400"}>{name.length} / 30</span>
        </div>
      </div>
      <ValidatedTextArea name="category_description" label="메뉴 카테고리 설명" defaultValue={category?.description ?? ""} placeholder="간단한 설명을 입력하세요" maxLength={100} helperText="카테고리 소개 문구입니다." />
      <ValidatedTextInput name="category_sort_order" label="정렬 순서" type="number" min={0} step={1} defaultValue={category?.sort_order ?? count} placeholder="정렬 순서를 입력하세요" required helperText="숫자가 낮을수록 먼저 표시됩니다." />
      <div className="grid gap-3">
        <Checkbox name="category_description_visible" label="설명 표시" defaultChecked={category?.description_visible ?? true} />
        <Checkbox name="category_visible" label="메뉴판 표시" defaultChecked={category?.visible ?? true} />
      </div>
      <SubmitButton tone={category ? "light" : "dark"} disabled={nameInvalid}>
        {category ? "메뉴 카테고리 저장" : "메뉴 카테고리 추가"}
      </SubmitButton>
      <button type="button" onClick={onCancel} className="ml-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
        취소
      </button>
    </form>
  );
}

function MenuItemForm({
  menuId,
  item,
  itemCount,
  selectedCategoryId,
  onCancel,
}: {
  menuId: string;
  item?: MenuItem;
  itemCount: number;
  selectedCategoryId: string;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const nameInvalid = !name.trim() || name.length > 50;
  const linkedCategoryId = item?.category_id ?? selectedCategoryId;

  return (
    <form action={item ? updateMenuItemAction : createMenuItemAction} className="mt-4 grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-2">
      <HiddenMenuId menuId={menuId} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      <input type="hidden" name="item_category_id" value={linkedCategoryId} />
      <div>
        <FieldLabel required>이름</FieldLabel>
        <input
          name="item_name"
          value={name}
          maxLength={50}
          placeholder="메뉴 이름을 입력하세요"
          required
          onChange={(event) => setName(event.target.value)}
          className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
            nameInvalid ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
          }`}
        />
        <div className="mt-2 flex items-center justify-between text-xs font-bold">
          <span className={nameInvalid ? "text-red-600" : "text-zinc-400"}>
            {!name.trim() ? "이름은 필수 입력입니다" : name.length > 50 ? "최대 50자까지 입력 가능합니다" : ""}
          </span>
          <span className={name.length > 50 ? "text-red-600" : "text-zinc-400"}>{name.length} / 50</span>
        </div>
      </div>
      <ValidatedTextInput name="item_price" label="가격" type="number" min={0} step={1} defaultValue={item?.price ?? ""} placeholder="가격을 입력하세요" helperText="숫자만 입력하세요. 표시용 가격이 있으면 공개 메뉴판에는 표시용 가격이 우선될 수 있습니다." />
      <ValidatedTextInput name="item_price_label" label="표시용 가격" defaultValue={item?.price_label ?? ""} placeholder="예: 시가, 문의, 12,000원" maxLength={30} helperText="숫자 가격 대신 보여줄 문구입니다." />
      <ValidatedTextInput name="item_portion_label" label="제공량" defaultValue={item?.portion_label ?? ""} placeholder="예: 150g, 1인분, 2pcs" maxLength={30} helperText="용량, 인분, 온도 옵션 등을 입력할 수 있습니다." />
      <ValidatedTextInput name="item_sort_order" label="정렬 순서" type="number" min={0} step={1} defaultValue={item?.sort_order ?? itemCount} placeholder="정렬 순서를 입력하세요" required helperText="숫자가 낮을수록 먼저 표시됩니다." />
      <div>
        <FieldLabel>추천/딱지</FieldLabel>
        <BadgeSelect defaultValue={item ? getMenuItemBadgeType(item) : "none"} />
      </div>
      <div>
        {item ? (
          <ImageUploadField label="메뉴 이미지" menuId={menuId} target="menu-item" recordId={item.id} currentUrl={item.image_url} />
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-4 text-sm font-bold leading-relaxed text-zinc-400">
            아이템을 먼저 추가한 뒤 이미지를 등록할 수 있습니다.
          </div>
        )}
      </div>
      <div className="md:col-span-2">
        <ValidatedTextArea name="item_description" label="설명" defaultValue={item?.description ?? ""} placeholder="간단한 설명을 입력하세요" maxLength={200} helperText="재료, 맛, 추천 포인트를 짧게 적어주세요." />
      </div>
      <div className="md:col-span-2">
        <FieldLabel>원산지 정보</FieldLabel>
        <TextArea name="item_origin_info" defaultValue={item?.origin_info ?? ""} placeholder="원산지 정보를 입력하세요" maxLength={300} helperText="필요한 메뉴에만 원산지 정보를 입력하세요." />
      </div>
      <div className="rounded-lg border border-zinc-100 bg-white p-4 md:col-span-2">
        <h4 className="mb-3 text-sm font-bold text-zinc-900">표시 설정</h4>
        <div className="grid gap-3 md:grid-cols-2">
          <Checkbox name="item_visible" label="메뉴판 표시" defaultChecked={item?.visible ?? true} />
          <Checkbox name="item_recommended" label="추천 여부" defaultChecked={item?.recommended ?? false} />
          <Checkbox name="item_price_visible" label="가격 표시" defaultChecked={item?.price_visible ?? true} />
          <Checkbox name="item_portion_visible" label="제공량 표시" defaultChecked={item?.portion_visible ?? true} />
          <Checkbox name="item_traits_visible" label="맛/특징 지표 표시" defaultChecked={item?.traits_visible ?? true} />
          <Checkbox name="item_is_sold_out" label="품절" defaultChecked={item?.is_sold_out ?? false} />
        </div>
      </div>
      <div className="md:col-span-2">
        <SubmitButton tone={item ? "light" : "dark"} disabled={nameInvalid}>
          {item ? "아이템 저장" : "아이템 추가"}
        </SubmitButton>
        <button type="button" onClick={onCancel} className="ml-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
          취소
        </button>
      </div>
    </form>
  );
}

function sortCategories(categories: MenuCategory[]) {
  return [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
}

function sortItems(items: MenuItem[]) {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
}

function traitSummary(traits: MenuItemTrait[]) {
  return traits
    .filter((trait) => trait.visible)
    .slice(0, 3)
    .map((trait) => `${trait.label} ${trait.value}/${trait.max_value}`)
    .join(" · ");
}

export default function MenuManagementSection({ menuId, menuPages, categories, items, traits }: MenuManagementSectionProps) {
  const sortedPages = useMemo(() => sortMenuPages(menuPages), [menuPages]);
  const firstPageId = sortedPages[0]?.id ?? "";
  const [selectedPageId, setSelectedPageId] = useState(firstPageId);
  const [editingPageId, setEditingPageId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingItemId, setEditingItemId] = useState("");
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [confirmingDeleteKey, setConfirmingDeleteKey] = useState("");
  const selectedPage = sortedPages.find((page) => page.id === selectedPageId) ?? sortedPages[0] ?? null;
  const visiblePageId = selectedPage?.id ?? "";

  const categoriesForPage = useMemo(() => {
    if (!visiblePageId) return [];
    return sortCategories(categories.filter((category) => category.menu_page_id === visiblePageId));
  }, [categories, visiblePageId]);

  const [selectedCategoryId, setSelectedCategoryId] = useState(categoriesForPage[0]?.id ?? "");
  const selectedCategory = categoriesForPage.find((category) => category.id === selectedCategoryId) ?? categoriesForPage[0] ?? null;
  const visibleCategoryId = selectedCategory?.id ?? "";
  const itemsForCategory = useMemo(() => sortItems(items.filter((item) => item.category_id === visibleCategoryId)), [items, visibleCategoryId]);
  const reachedPageLimit = sortedPages.length >= MENU_LIMITS.maxPagesPerSite;
  const reachedCategoryLimit = categoriesForPage.length >= MENU_LIMITS.maxCategoriesPerPage;
  const reachedItemsPerCategoryLimit = itemsForCategory.length >= MENU_LIMITS.maxItemsPerCategory;
  const reachedItemsPerSiteLimit = items.length >= MENU_LIMITS.maxItemsPerSite;
  const reachedItemLimit = reachedItemsPerCategoryLimit || reachedItemsPerSiteLimit;

  function resetModes() {
    setEditingPageId("");
    setEditingCategoryId("");
    setEditingItemId("");
    setIsCreatingPage(false);
    setIsCreatingCategory(false);
    setIsCreatingItem(false);
    setConfirmingDeleteKey("");
  }

  function startCreatePage() {
    if (reachedPageLimit) return;
    resetModes();
    setIsCreatingPage(true);
  }

  function startEditPage(pageId: string) {
    resetModes();
    setEditingPageId(pageId);
  }

  function startCreateCategory() {
    if (!visiblePageId || reachedCategoryLimit) return;
    resetModes();
    setIsCreatingCategory(true);
  }

  function startEditCategory(categoryId: string) {
    resetModes();
    setEditingCategoryId(categoryId);
  }

  function startCreateItem() {
    if (!visibleCategoryId || reachedItemLimit) return;
    resetModes();
    setIsCreatingItem(true);
  }

  function startEditItem(itemId: string) {
    resetModes();
    setEditingItemId(itemId);
  }

  function startConfirmDelete(key: string) {
    resetModes();
    setConfirmingDeleteKey(key);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <div className="mb-8 border-b border-zinc-100 pb-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Menu Builder</p>
          <h2 className="text-2xl font-bold tracking-tight">메뉴 페이지, 메뉴 카테고리, 아이템</h2>
          <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
            메뉴 페이지를 선택한 뒤 메뉴 카테고리를 만들고, 선택한 메뉴 카테고리 안에 아이템을 추가합니다.
          </p>
          <p className="mt-3 rounded-lg bg-zinc-50 p-4 break-keep text-sm font-bold leading-relaxed text-zinc-500">
            기본 메뉴 구성은 예시입니다. 실제 메뉴에 맞게 자유롭게 수정하거나 삭제하세요.
          </p>
        </div>

        <div>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Pages</p>
            <h3 className="text-xl font-bold tracking-tight">메뉴 페이지</h3>
          </div>
          {!isCreatingPage && !editingPageId && (
            <button
              type="button"
              onClick={startCreatePage}
              disabled={reachedPageLimit}
              className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              + 메뉴 페이지 추가
            </button>
          )}
        </div>
        {reachedPageLimit && !isCreatingPage && (
          <p className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm font-bold text-zinc-400">
            메뉴 페이지는 최대 {MENU_LIMITS.maxPagesPerSite}개까지 추가할 수 있습니다.
          </p>
        )}

        {isCreatingPage && <MenuPageForm menuId={menuId} count={sortedPages.length} onCancel={resetModes} />}

        {sortedPages.length === 0 ? (
          <div className="mt-6">
            <EmptyState>메뉴 페이지가 없습니다</EmptyState>
          </div>
        ) : (
          <div className="mt-5 flex gap-2 overflow-x-auto">
            {sortedPages.map((page) => {
              const isActive = page.id === visiblePageId;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => {
                    resetModes();
                    setSelectedPageId(page.id);
                    const nextCategory = sortCategories(categories.filter((category) => category.menu_page_id === page.id))[0];
                    setSelectedCategoryId(nextCategory?.id ?? "");
                  }}
                  className={`shrink-0 rounded-full px-4 py-3 text-left text-sm font-bold transition ${
                    isActive ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {getMenuPageTitle(page)}
                </button>
              );
            })}
          </div>
        )}

        {selectedPage && editingPageId === selectedPage.id && (
          <MenuPageForm menuId={menuId} page={selectedPage} count={sortedPages.length} onCancel={resetModes} />
        )}

        {selectedPage && editingPageId !== selectedPage.id && (
          <div className="mt-6 rounded-lg border border-zinc-100 bg-zinc-50 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <DetailValue label="페이지 이름">{selectedPage.title}</DetailValue>
              <DetailValue label="정렬 순서">{selectedPage.sort_order}</DetailValue>
              <DetailValue label="설명 표시">{selectedPage.description_visible ? "표시" : "숨김"}</DetailValue>
              <DetailValue label="메뉴판 표시">{selectedPage.visible ? "표시" : "숨김"}</DetailValue>
              <div className="md:col-span-2">
                <DetailValue label="페이지 설명">{selectedPage.description}</DetailValue>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => startEditPage(selectedPage.id)} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
                수정
              </button>
              <DeleteConfirmForm
                action={deleteMenuPageAction}
                menuId={menuId}
                hiddenName="menuPageId"
                hiddenValue={selectedPage.id}
                disabledReason={categoriesForPage.length > 0 ? "하위 메뉴 카테고리가 있어 삭제할 수 없습니다. 삭제 대신 저장 시 메뉴판 표시를 끌 수 있습니다." : undefined}
                isConfirming={confirmingDeleteKey === `page:${selectedPage.id}`}
                onRequestConfirm={() => startConfirmDelete(`page:${selectedPage.id}`)}
                onCancel={resetModes}
              />
            </div>
          </div>
        )}
        </div>

        <div className={`mt-8 border-t border-zinc-100 pt-6 ${!selectedPage ? "opacity-60" : ""}`}>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Categories</p>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">메뉴 카테고리</h3>
                {selectedPage && (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">
                    {getMenuPageTitle(selectedPage)}
                  </span>
                )}
              </div>
            </div>
            {!isCreatingCategory && !editingCategoryId && (
              <button
                type="button"
                onClick={startCreateCategory}
                disabled={!selectedPage || reachedCategoryLimit}
                className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                + 메뉴 카테고리 추가
              </button>
            )}
          </div>

          {!selectedPage && <p className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm font-bold text-zinc-400">메뉴 페이지를 먼저 선택해주세요</p>}
          {selectedPage && reachedCategoryLimit && !isCreatingCategory && (
            <p className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm font-bold text-zinc-400">
              이 페이지에는 메뉴 카테고리를 최대 {MENU_LIMITS.maxCategoriesPerPage}개까지 추가할 수 있습니다.
            </p>
          )}

          {isCreatingCategory && <MenuCategoryForm menuId={menuId} pageId={selectedPage.id} count={categoriesForPage.length} onCancel={resetModes} />}

          {selectedPage && categoriesForPage.length === 0 ? (
            <div className="mt-6">
            <EmptyState>이 페이지에 메뉴 카테고리가 없습니다</EmptyState>
            </div>
          ) : selectedPage ? (
            <div className="mt-5 flex gap-2 overflow-x-auto">
              {categoriesForPage.map((category) => {
                const isActive = category.id === visibleCategoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      resetModes();
                      setSelectedCategoryId(category.id);
                    }}
                    className={`shrink-0 rounded-full px-4 py-3 text-sm font-bold transition ${
                      isActive ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          ) : null}

          {selectedCategory && editingCategoryId === selectedCategory.id && (
            <MenuCategoryForm menuId={menuId} pageId={selectedPage.id} category={selectedCategory} count={categoriesForPage.length} onCancel={resetModes} />
          )}

          {selectedCategory && editingCategoryId !== selectedCategory.id && (
            <div className="mt-6 rounded-lg border border-zinc-100 bg-zinc-50 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <DetailValue label="메뉴 카테고리 이름">{selectedCategory.name}</DetailValue>
                <DetailValue label="연결 페이지 이름">{getMenuPageTitle(selectedPage)}</DetailValue>
                <DetailValue label="정렬 순서">{selectedCategory.sort_order}</DetailValue>
                <DetailValue label="설명 표시">{selectedCategory.description_visible ? "표시" : "숨김"}</DetailValue>
                <DetailValue label="메뉴판 표시">{selectedCategory.visible ? "표시" : "숨김"}</DetailValue>
                <div className="md:col-span-2">
                  <DetailValue label="메뉴 카테고리 설명">{selectedCategory.description}</DetailValue>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => startEditCategory(selectedCategory.id)} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
                  수정
                </button>
                <DeleteConfirmForm
                  action={deleteCategoryAction}
                  menuId={menuId}
                  hiddenName="categoryId"
                  hiddenValue={selectedCategory.id}
                  disabledReason={itemsForCategory.length > 0 ? "하위 아이템이 있어 삭제할 수 없습니다. 삭제 대신 저장 시 메뉴판 표시를 끌 수 있습니다." : undefined}
                  isConfirming={confirmingDeleteKey === `category:${selectedCategory.id}`}
                  onRequestConfirm={() => startConfirmDelete(`category:${selectedCategory.id}`)}
                  onCancel={resetModes}
                />
              </div>
            </div>
          )}
        </div>

        <div className={`mt-8 border-t border-zinc-100 pt-6 ${!selectedCategory ? "opacity-60" : ""}`}>
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Items</p>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xl font-bold tracking-tight">아이템 목록</h4>
              {selectedCategory && (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">
                  {selectedCategory.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            {!isCreatingItem && !editingItemId && (
              <button
                type="button"
                onClick={startCreateItem}
                disabled={!selectedCategory || reachedItemLimit}
                className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                + 아이템 추가
              </button>
            )}
          </div>
        </div>

        {!selectedCategory && <p className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm font-bold text-zinc-400">메뉴 카테고리를 먼저 선택해주세요</p>}
        {selectedCategory && reachedItemLimit && !isCreatingItem && (
          <p className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm font-bold text-zinc-400">
            {reachedItemsPerSiteLimit
              ? `한 메뉴판에는 아이템을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`
              : `이 카테고리에는 아이템을 최대 ${MENU_LIMITS.maxItemsPerCategory}개까지 추가할 수 있습니다.`}
          </p>
        )}

        <div className="mt-6 grid gap-4">
          {itemsForCategory.map((item) => (
            <MenuItemCard
              key={item.id}
              menuId={menuId}
              categories={categoriesForPage}
              item={item}
              traits={traits.filter((trait) => trait.menu_item_id === item.id)}
              isEditing={editingItemId === item.id}
              isConfirmingDelete={confirmingDeleteKey === `item:${item.id}`}
              onEdit={() => startEditItem(item.id)}
              onCancel={resetModes}
              onRequestDelete={() => startConfirmDelete(`item:${item.id}`)}
            />
          ))}
        </div>

        {selectedCategory && itemsForCategory.length === 0 && <EmptyState>이 메뉴 카테고리에 아이템이 없습니다.</EmptyState>}

        {isCreatingItem && (
          <MenuItemForm menuId={menuId} itemCount={itemsForCategory.length} selectedCategoryId={selectedCategory.id} onCancel={resetModes} />
        )}
        </div>
      </section>
    </div>
  );
}

function MenuItemCard({
  menuId,
  categories,
  item,
  traits,
  isEditing,
  isConfirmingDelete,
  onEdit,
  onCancel,
  onRequestDelete,
}: {
  menuId: string;
  categories: MenuCategory[];
  item: MenuItem;
  traits: MenuItemTrait[];
  isEditing: boolean;
  isConfirmingDelete: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onRequestDelete: () => void;
}) {
  const badgeLabel = getBadgeLabel(getMenuItemBadgeType(item));
  const price = formatMenuPrice(item);
  const portion = formatPortionLabel(item);
  const traitText = traitSummary(traits);
  const categoryName = categories.find((category) => category.id === item.category_id)?.name ?? "메뉴 카테고리";

  return (
    <article className="rounded-lg border border-zinc-100 p-5">
      {isEditing ? (
        <>
          <div className="mb-4 border-b border-zinc-100 pb-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Item Detail</p>
            <h4 className="mt-1 text-2xl font-bold">아이템 수정</h4>
          </div>
          <MenuItemForm menuId={menuId} item={item} itemCount={0} selectedCategoryId={item.category_id ?? ""} onCancel={onCancel} />
          <MenuItemTraitEditor menuId={menuId} itemId={item.id} traits={traits} />
        </>
      ) : (
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold">{item.name}</h3>
            {badgeLabel && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{badgeLabel}</span>}
            {!item.visible && <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">숨김</span>}
          </div>
          <p className="mt-2 text-sm font-bold text-zinc-400">{categoryName}</p>
          <p className="mt-1 text-xs font-bold text-zinc-400">연결된 메뉴 카테고리 이름: {categoryName}</p>
          <p className="mt-2 text-sm font-semibold text-zinc-600">
            {[portion, price, item.recommended ? "추천" : null].filter(Boolean).join(" · ") || "표시 정보 없음"}
          </p>
          {traitText && <p className="mt-2 text-xs font-bold text-zinc-400">{traitText}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
            수정
          </button>
          <DeleteConfirmForm
            action={deleteMenuItemAction}
            menuId={menuId}
            hiddenName="itemId"
            hiddenValue={item.id}
            disabledReason={traits.length > 0 ? "하위 맛/특징 지표가 있어 삭제할 수 없습니다. 삭제 대신 저장 시 메뉴판 표시를 끌 수 있습니다." : undefined}
            isConfirming={isConfirmingDelete}
            onRequestConfirm={onRequestDelete}
            onCancel={onCancel}
          />
        </div>
      </div>
      )}
    </article>
  );
}

function MenuItemTraitEditor({ menuId, itemId, traits }: { menuId: string; itemId: string; traits: MenuItemTrait[] }) {
  return (
    <div className="mt-6 rounded-lg bg-zinc-50 p-4">
      <details>
        <summary className="cursor-pointer text-sm font-bold text-zinc-900">맛/특징 지표</summary>
        <p className="mt-2 break-keep text-xs font-semibold text-zinc-500">값은 0/5부터 5/5까지 선택할 수 있습니다.</p>
        <form action={createMenuItemTraitAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_100px_100px_auto] md:items-end">
          <HiddenMenuId menuId={menuId} />
          <input type="hidden" name="itemId" value={itemId} />
          <div>
            <FieldLabel>지표 이름</FieldLabel>
            <TextInput name="trait_label" placeholder="맵기" maxLength={30} helperText="예: 맵기, 단맛, 산미" />
          </div>
          <div>
            <FieldLabel>강도</FieldLabel>
            <TraitValueSelect />
          </div>
          <div>
            <FieldLabel>최대</FieldLabel>
            <TextInput name="trait_max_value" type="number" defaultValue={5} min={1} step={1} helperText="1 이상의 숫자를 입력하세요." />
          </div>
          <div>
            <FieldLabel>순서</FieldLabel>
            <TextInput name="trait_sort_order" type="number" defaultValue={traits.length + 1} min={0} step={1} helperText="숫자가 낮을수록 먼저 표시됩니다." />
          </div>
          <div className="flex flex-col gap-2">
            <Checkbox name="trait_visible" label="표시" defaultChecked />
            <SubmitButton tone="light">추가</SubmitButton>
          </div>
        </form>
        <div className="mt-4 space-y-3">
          {traits.map((trait) => (
            <div key={trait.id} className="rounded-lg border border-zinc-100 bg-white p-3">
              <form action={updateMenuItemTraitAction} className="grid gap-3 md:grid-cols-[1fr_120px_100px_100px_auto] md:items-end">
                <HiddenMenuId menuId={menuId} />
                <input type="hidden" name="traitId" value={trait.id} />
                <div>
                  <FieldLabel>지표 이름</FieldLabel>
                  <TextInput name="trait_label" defaultValue={trait.label} maxLength={30} helperText="예: 맵기, 단맛, 산미" />
                </div>
                <div>
                  <FieldLabel>강도</FieldLabel>
                  <TraitValueSelect defaultValue={trait.value} />
                </div>
                <div>
                  <FieldLabel>최대</FieldLabel>
                  <TextInput name="trait_max_value" type="number" defaultValue={trait.max_value} min={1} step={1} helperText="1 이상의 숫자를 입력하세요." />
                </div>
                <div>
                  <FieldLabel>순서</FieldLabel>
                  <TextInput name="trait_sort_order" type="number" defaultValue={trait.sort_order} min={0} step={1} helperText="숫자가 낮을수록 먼저 표시됩니다." />
                </div>
                <div className="flex flex-col gap-2">
                  <Checkbox name="trait_visible" label="표시" defaultChecked={trait.visible} />
                  <SubmitButton tone="light">저장</SubmitButton>
                </div>
              </form>
              <form action={deleteMenuItemTraitAction} className="mt-2">
                <HiddenMenuId menuId={menuId} />
                <input type="hidden" name="traitId" value={trait.id} />
                <SubmitButton tone="danger">{trait.label} 삭제</SubmitButton>
              </form>
            </div>
          ))}
          {traits.length === 0 && <EmptyState>아직 맛/특징 지표가 없습니다.</EmptyState>}
        </div>
      </details>
    </div>
  );
}
