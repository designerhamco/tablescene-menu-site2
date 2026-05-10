"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  createCategoryAction,
  createMenuItemAction,
  createMenuItemPriceOptionAction,
  createMenuPageAction,
  deleteCategoryAction,
  deleteMenuItemAction,
  deleteMenuItemPriceOptionAction,
  deleteMenuPageAction,
  updateCategoryAction,
  updateMenuItemAction,
  updateMenuItemPriceOptionAction,
  updateMenuPageAction,
} from "@/app/mypage/menus/actions";
import ImageUploadField from "@/components/mypage/menu-editor/ImageUploadField";
import SwitchField from "@/components/mypage/menu-editor/SwitchField";
import { getMenuItemBadgeLabel, MENU_BADGE_OPTIONS } from "@/lib/menu-badges";
import { MENU_FIELD_LIMITS, MENU_LIMITS } from "@/lib/menu-limits";
import type { Database } from "@/lib/supabase/types";
import type { TemplateCapabilities } from "@/lib/template-capabilities";
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

type MenuManagementSectionProps = {
  menuId: string;
  menuPages: MenuPage[];
  categories: MenuCategory[];
  items: MenuItem[];
  priceOptions: MenuItemPriceOption[];
  traits: MenuItemTrait[];
  capabilities: TemplateCapabilities;
};
type PriceMode = "single" | "options";
type DraftPriceOption = {
  id: string;
  label: string;
  price: string;
  priceLabel: string;
  visible: boolean;
  sortOrder: number;
};

const MENU_BUILDER_STATE_KEY_PREFIX = "tablescene:menu-editor:builder";

type MenuBuilderSavedState = {
  selectedPageId?: string;
  selectedCategoryId?: string;
  editingItemId?: string;
};

function readMenuBuilderState(menuId: string): MenuBuilderSavedState {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.sessionStorage.getItem(`${MENU_BUILDER_STATE_KEY_PREFIX}:${menuId}`);
    return rawValue ? (JSON.parse(rawValue) as MenuBuilderSavedState) : {};
  } catch {
    return {};
  }
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function TextInput({ helperText, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { helperText?: ReactNode }) {
  const initialValue = props.value ?? props.defaultValue ?? "";
  const [currentLength, setCurrentLength] = useState(String(initialValue).length);

  return (
    <>
      <input
        {...props}
        onChange={(event) => {
          setCurrentLength(event.target.value.length);
          props.onChange?.(event);
        }}
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

function TextArea({ helperText, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { helperText?: ReactNode }) {
  const initialValue = props.value ?? props.defaultValue ?? "";
  const [currentLength, setCurrentLength] = useState(String(initialValue).length);

  return (
    <>
      <textarea
        {...props}
        onChange={(event) => {
          setCurrentLength(event.target.value.length);
          props.onChange?.(event);
        }}
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

function ValidatedTextInput({
  name,
  label,
  defaultValue = "",
  placeholder,
  required,
  requiredIndicator,
  maxLength,
  type = "text",
  min,
  step,
  helperText,
  errorText,
  form,
  onValueChange,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  placeholder: string;
  required?: boolean;
  requiredIndicator?: boolean;
  maxLength?: number;
  type?: React.HTMLInputTypeAttribute;
  min?: number;
  step?: number;
  helperText?: string;
  errorText?: string;
  form?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue == null ? "" : String(defaultValue));
  const isTooLong = typeof maxLength === "number" && value.length > maxLength;
  const isMissing = Boolean(required && !value.trim());
  const hasError = Boolean(errorText) || isTooLong || isMissing;

  return (
    <div>
      <FieldLabel required={Boolean(required || requiredIndicator)}>{label}</FieldLabel>
      <input
        name={name}
        form={form}
        type={type}
        value={value}
        min={min}
        step={step}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        onChange={(event) => {
          setValue(event.target.value);
          onValueChange?.(event.target.value);
        }}
        className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
          hasError ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
        }`}
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
        <span className={hasError ? "text-red-600" : "text-zinc-400"}>
          {errorText ?? (isMissing ? `${label}은 필수 입력입니다.` : isTooLong ? `최대 ${maxLength}자까지 입력 가능합니다.` : helperText ?? "")}
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
  form,
  onValueChange,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder: string;
  maxLength: number;
  helperText?: string;
  form?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const isTooLong = value.length > maxLength;

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        name={name}
        form={form}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => {
          setValue(event.target.value);
          onValueChange?.(event.target.value);
        }}
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

function Checkbox({
  name,
  defaultChecked,
  label,
  form,
  canTurnOn,
  blockedMessage,
}: {
  name: string;
  defaultChecked?: boolean;
  label: string;
  form?: string;
  canTurnOn?: boolean;
  blockedMessage?: ReactNode;
}) {
  return (
    <SwitchField
      name={name}
      form={form}
      label={label}
      defaultChecked={defaultChecked}
      canTurnOn={canTurnOn}
      blockedMessage={blockedMessage}
    />
  );
}

function SubmitButton({
  children,
  tone = "dark",
  disabled = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; tone?: "dark" | "light" | "danger" }) {
  const className = {
    dark: "bg-zinc-950 text-white hover:bg-zinc-800",
    light: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100",
    danger: "border border-red-100 bg-red-50 text-red-700 hover:bg-red-100",
  }[tone];

  return (
    <button
      type="submit"
      disabled={disabled}
      {...props}
      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 ${className}`}
    >
      {children}
    </button>
  );
}

function HiddenMenuId({ menuId, form }: { menuId: string; form?: string }) {
  return <input type="hidden" name="menuId" value={menuId} form={form} />;
}

function BadgeSelect({ defaultValue = "none", form }: { defaultValue?: string | null; form?: string }) {
  return (
    <Select name="item_badge_label" form={form} defaultValue={defaultValue || "none"}>
      {MENU_BADGE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
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
  const [description, setDescription] = useState(page?.description ?? "");
  const titleInvalid = !title.trim() || title.length > MENU_FIELD_LIMITS.menuPages.title;
  const hasDescription = Boolean(description.trim());

  return (
    <form action={page ? updateMenuPageAction : createMenuPageAction} className="mt-4 space-y-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <HiddenMenuId menuId={menuId} />
      {page && <input type="hidden" name="menuPageId" value={page.id} />}
      <div>
        <FieldLabel required>페이지 이름</FieldLabel>
        <input
          name="menu_page_title"
          value={title}
          maxLength={MENU_FIELD_LIMITS.menuPages.title}
          placeholder="페이지 이름을 입력하세요"
          required
          onChange={(event) => setTitle(event.target.value)}
          className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
            titleInvalid ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
          }`}
        />
        <div className="mt-2 flex items-center justify-between text-xs font-bold">
          <span className={titleInvalid ? "text-red-600" : "text-zinc-400"}>
            {!title.trim() ? "이름은 필수 입력입니다" : title.length > MENU_FIELD_LIMITS.menuPages.title ? `최대 ${MENU_FIELD_LIMITS.menuPages.title}자까지 입력 가능합니다` : ""}
          </span>
          <span className={title.length > MENU_FIELD_LIMITS.menuPages.title ? "text-red-600" : "text-zinc-400"}>{title.length} / {MENU_FIELD_LIMITS.menuPages.title}</span>
        </div>
      </div>
      <ValidatedTextArea name="menu_page_description" label="페이지 설명" defaultValue={page?.description ?? ""} placeholder="간단한 설명을 입력하세요" maxLength={MENU_FIELD_LIMITS.menuPages.description} helperText="메뉴 페이지를 설명하는 짧은 문구입니다." onValueChange={setDescription} />
      <ValidatedTextInput name="menu_page_sort_order" label="정렬 순서" type="number" min={0} step={1} defaultValue={page?.sort_order ?? count} placeholder="정렬 순서를 입력하세요" required helperText="숫자가 낮을수록 먼저 표시됩니다." />
      <div className="grid gap-3">
        <Checkbox
          name="menu_page_description_visible"
          label="설명 표시"
          defaultChecked={Boolean((page?.description_visible ?? true) && hasDescription)}
          canTurnOn={hasDescription}
          blockedMessage="설명을 먼저 입력해주세요."
        />
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
  const [description, setDescription] = useState(category?.description ?? "");
  const nameInvalid = !name.trim() || name.length > MENU_FIELD_LIMITS.menuCategories.name;
  const hasDescription = Boolean(description.trim());

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
          maxLength={MENU_FIELD_LIMITS.menuCategories.name}
          placeholder="메뉴 카테고리 이름을 입력하세요"
          required
          onChange={(event) => setName(event.target.value)}
          className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
            nameInvalid ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
          }`}
        />
        <div className="mt-2 flex items-center justify-between text-xs font-bold">
          <span className={nameInvalid ? "text-red-600" : "text-zinc-400"}>
            {!name.trim() ? "이름은 필수 입력입니다" : name.length > MENU_FIELD_LIMITS.menuCategories.name ? `최대 ${MENU_FIELD_LIMITS.menuCategories.name}자까지 입력 가능합니다` : ""}
          </span>
          <span className={name.length > MENU_FIELD_LIMITS.menuCategories.name ? "text-red-600" : "text-zinc-400"}>{name.length} / {MENU_FIELD_LIMITS.menuCategories.name}</span>
        </div>
      </div>
      <ValidatedTextArea name="category_description" label="메뉴 카테고리 설명" defaultValue={category?.description ?? ""} placeholder="간단한 설명을 입력하세요" maxLength={MENU_FIELD_LIMITS.menuCategories.description} helperText="카테고리 소개 문구입니다." onValueChange={setDescription} />
      <ValidatedTextInput name="category_sort_order" label="정렬 순서" type="number" min={0} step={1} defaultValue={category?.sort_order ?? count} placeholder="정렬 순서를 입력하세요" required helperText="숫자가 낮을수록 먼저 표시됩니다." />
      <div className="grid gap-3">
        <Checkbox
          name="category_description_visible"
          label="설명 표시"
          defaultChecked={Boolean((category?.description_visible ?? true) && hasDescription)}
          canTurnOn={hasDescription}
          blockedMessage="카테고리 설명을 먼저 입력해주세요."
        />
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
  categories,
  capabilities,
  item,
  itemCount,
  selectedCategoryId,
  priceOptions = [],
  traits = [],
  priceMode = "single",
  onPriceModeChange,
  onCancel,
}: {
  menuId: string;
  categories: MenuCategory[];
  capabilities: TemplateCapabilities;
  item?: MenuItem;
  itemCount: number;
  selectedCategoryId: string;
  priceOptions?: MenuItemPriceOption[];
  traits?: MenuItemTrait[];
  priceMode?: PriceMode;
  onPriceModeChange?: (mode: PriceMode) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? selectedCategoryId);
  const nameInvalid = !name.trim() || name.length > MENU_FIELD_LIMITS.menuItems.name;
  const categoryInvalid = !categoryId;
  const [draftPriceMode, setDraftPriceMode] = useState<PriceMode>(priceMode);
  const requestedPriceMode = item ? priceMode : draftPriceMode;
  const currentPriceMode = capabilities.priceOptions ? requestedPriceMode : "single";
  const isOptionsMode = currentPriceMode === "options";
  const isSingleMode = !isOptionsMode;
  const formId = item ? `menu-item-form-${item.id}` : "menu-item-form-new";
  const [priceValue, setPriceValue] = useState(item?.price == null ? "" : String(item.price));
  const [, setPriceLabelValue] = useState(item?.price_label ?? "");
  const [draftPriceOptions, setDraftPriceOptions] = useState<DraftPriceOption[]>([]);
  const [draftPriceOptionLabel, setDraftPriceOptionLabel] = useState("");
  const [draftPriceOptionPrice, setDraftPriceOptionPrice] = useState("");
  const [draftPriceOptionPriceLabel, setDraftPriceOptionPriceLabel] = useState("");
  const [draftPriceOptionError, setDraftPriceOptionError] = useState("");
  const [attemptedItemSubmit, setAttemptedItemSubmit] = useState(false);
  const [portionLabelValue, setPortionLabelValue] = useState(item?.portion_label ?? "");
  const [traitLabelValues, setTraitLabelValues] = useState(() =>
    [...traits]
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
      .slice(0, MENU_LIMITS.maxTraitsPerItem)
      .map((trait) => trait.label)
  );
  const hasVisiblePriceOption = priceOptions.some((option) => option.visible);
  const hasDraftPriceOption = draftPriceOptions.some((option) => option.visible);
  const singlePriceInvalid = isSingleMode && !priceValue.trim();
  const optionsPriceInvalid = isOptionsMode && !(hasVisiblePriceOption || hasDraftPriceOption);
  const singlePriceErrorText = attemptedItemSubmit && singlePriceInvalid ? "기본 가격을 입력해주세요." : undefined;
  const hasPortionData = Boolean(portionLabelValue.trim());
  const hasTraitData = traitLabelValues.some((label) => label.trim());

  function setPriceMode(mode: PriceMode) {
    if (!capabilities.priceOptions && mode === "options") {
      return;
    }

    if (item) {
      onPriceModeChange?.(mode);
      return;
    }

    setDraftPriceMode(mode);
  }

  function addDraftPriceOption() {
    const label = draftPriceOptionLabel.trim();
    const price = draftPriceOptionPrice.trim();
    const priceLabel = draftPriceOptionPriceLabel.trim();

    if (!label) {
      setDraftPriceOptionError("옵션명을 입력해주세요.");
      return;
    }

    if (!price) {
      setDraftPriceOptionError("옵션 가격을 입력해주세요.");
      return;
    }

    if (draftPriceOptions.length >= MENU_LIMITS.maxPriceOptionsPerItem) {
      setDraftPriceOptionError(`가격 옵션은 아이템당 최대 ${MENU_LIMITS.maxPriceOptionsPerItem}개까지 등록할 수 있습니다.`);
      return;
    }

    setDraftPriceOptions((currentOptions) => [
      ...currentOptions,
      {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${currentOptions.length}`,
        label,
        price,
        priceLabel,
        visible: true,
        sortOrder: currentOptions.length + 1,
      },
    ]);
    setDraftPriceOptionLabel("");
    setDraftPriceOptionPrice("");
    setDraftPriceOptionPriceLabel("");
    setDraftPriceOptionError("");
  }

  function removeDraftPriceOption(optionId: string) {
    setDraftPriceOptions((currentOptions) => currentOptions.filter((option) => option.id !== optionId));
  }

  function handleTraitLabelChange(index: number, value: string) {
    setTraitLabelValues((currentValues) => {
      const nextValues = [...currentValues];
      nextValues[index] = value;
      return nextValues;
    });
  }

  return (
    <div className="mt-4 grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      <form id={formId} action={item ? updateMenuItemAction : createMenuItemAction} className="hidden" />
      <HiddenMenuId menuId={menuId} form={formId} />
      {item && <input type="hidden" name="itemId" value={item.id} form={formId} />}
      <input type="hidden" name="item_price_mode" value={currentPriceMode} form={formId} />
      {item?.is_sold_out && <input type="hidden" name="item_is_sold_out" value="on" form={formId} />}
      {draftPriceOptions.map((option, index) => (
        <span key={option.id}>
          <input type="hidden" name={`new_price_option_${index}_label`} value={option.label} form={formId} />
          <input type="hidden" name={`new_price_option_${index}_price`} value={option.price} form={formId} />
          <input type="hidden" name={`new_price_option_${index}_price_label`} value={option.priceLabel} form={formId} />
          <input type="hidden" name={`new_price_option_${index}_sort_order`} value={option.sortOrder} form={formId} />
        </span>
      ))}

      <section className="rounded-lg border border-zinc-100 bg-white p-4">
        <h4 className="text-sm font-black text-zinc-950">기본 정보</h4>
        <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
          메뉴의 소속, 이름, 설명, 원산지 정보를 입력합니다.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel required>메뉴 카테고리</FieldLabel>
            <Select
              name="item_category_id"
              form={formId}
              value={categoryId}
              required
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {categories.length === 0 && <option value="">메뉴 카테고리를 선택하세요</option>}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <p className={`mt-2 break-keep text-xs font-bold leading-relaxed ${categoryInvalid ? "text-red-600" : "text-zinc-400"}`}>
              {categoryInvalid ? "메뉴 카테고리를 선택해주세요." : "이 아이템이 표시될 메뉴 카테고리를 선택하세요."}
            </p>
          </div>
          <div>
            <FieldLabel required>메뉴명</FieldLabel>
            <input
              name="item_name"
              form={formId}
              value={name}
              maxLength={MENU_FIELD_LIMITS.menuItems.name}
              placeholder="메뉴 이름을 입력하세요"
              required
              onChange={(event) => setName(event.target.value)}
              className={`mt-2 w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition ${
                nameInvalid ? "border-red-200 focus:border-red-500" : "border-zinc-200 focus:border-zinc-950"
              }`}
            />
            <div className="mt-2 flex items-center justify-between text-xs font-bold">
              <span className={nameInvalid ? "text-red-600" : "text-zinc-400"}>
                {!name.trim()
                  ? "메뉴명을 입력해주세요."
                  : name.length > MENU_FIELD_LIMITS.menuItems.name
                    ? `최대 ${MENU_FIELD_LIMITS.menuItems.name}자까지 입력 가능합니다`
                    : ""}
              </span>
              <span className={name.length > MENU_FIELD_LIMITS.menuItems.name ? "text-red-600" : "text-zinc-400"}>{name.length} / {MENU_FIELD_LIMITS.menuItems.name}</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <ValidatedTextArea form={formId} name="item_description" label="간단 설명" defaultValue={item?.description ?? ""} placeholder="간단한 설명을 입력하세요" maxLength={MENU_FIELD_LIMITS.menuItems.description} helperText="재료, 맛, 추천 포인트를 짧게 적어주세요." />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>원산지 정보</FieldLabel>
            <TextArea
              name="item_origin_info"
              form={formId}
              defaultValue={item?.origin_info ?? ""}
              placeholder="원산지나 주요 재료 정보를 입력하세요"
              maxLength={MENU_FIELD_LIMITS.menuItems.originInfo}
              helperText="필요한 경우 원산지나 주요 재료 정보를 입력하세요. 예: 원두 브라질/콜롬비아, 돼지고기 국내산"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-100 bg-white p-4">
        <h4 className="text-sm font-black text-zinc-950">노출 설정</h4>
        <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
          공개 메뉴판에 표시를 끄면 손님 화면에서 보이지 않습니다. 메뉴명과 카테고리는 저장 전에 반드시 입력해야 합니다.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ValidatedTextInput form={formId} name="item_sort_order" label="정렬 순서" type="number" min={0} step={1} defaultValue={item?.sort_order ?? itemCount} placeholder="정렬 순서를 입력하세요" required helperText="숫자가 낮을수록 먼저 표시됩니다." />
          {capabilities.itemBadges ? (
            <div>
              <FieldLabel>메뉴 배지</FieldLabel>
              <BadgeSelect form={formId} defaultValue={item ? getMenuItemBadgeLabel(item) : "none"} />
              <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">
                선택한 배지는 공개 메뉴판의 메뉴 카드에 작게 표시됩니다.
              </p>
            </div>
          ) : (
            <input type="hidden" name="item_badge_label" value={item ? getMenuItemBadgeLabel(item) || "none" : "none"} form={formId} />
          )}
          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
            <Checkbox form={formId} name="item_visible" label="공개 메뉴판에 표시" defaultChecked={item?.visible ?? true} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-100 bg-white p-4">
        <h4 className="text-sm font-black text-zinc-950">가격 설정</h4>
        <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
          이 메뉴의 가격을 어떻게 보여줄지 선택하세요.
        </p>
        <div className="mt-4">
          <FieldLabel>가격 표시 방식</FieldLabel>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {(capabilities.priceOptions ? (["single", "options"] as const) : (["single"] as const)).map((mode) => (
            <label
              key={mode}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm font-bold ${
                currentPriceMode === mode ? "border-zinc-950 bg-zinc-50 text-zinc-950" : "border-zinc-200 bg-white text-zinc-500"
              }`}
            >
              <input
                type="radio"
                name="price_mode_selector"
                value={mode}
                checked={currentPriceMode === mode}
                onChange={() => setPriceMode(mode)}
                className="mt-1 accent-zinc-950"
              />
              <span>
                {mode === "single" ? "단일 가격" : "옵션별 가격"}
                <span className="mt-1 block text-xs font-semibold leading-relaxed text-zinc-400">
                  {mode === "single"
                    ? "기본 가격 또는 가격 표시 문구를 한 번만 보여줍니다."
                    : "HOT/ICE, 사이즈, 중량처럼 가격이 나뉘는 경우 사용합니다."}
                </span>
              </span>
            </label>
          ))}
        </div>
        {isSingleMode && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ValidatedTextInput
              form={formId}
              name="item_price"
              label="기본 가격"
              type="number"
              min={0}
              step={1}
              defaultValue={item?.price ?? ""}
              placeholder="가격을 입력하세요"
              requiredIndicator
              helperText="숫자만 입력해주세요. 예: 4500"
              errorText={singlePriceErrorText}
              onValueChange={setPriceValue}
            />
            <ValidatedTextInput
              form={formId}
              name="item_price_label"
              label="가격 표시 문구"
              defaultValue={item?.price_label ?? ""}
              placeholder="예: 4,500원, 시가, 변동가, 문의"
              maxLength={MENU_FIELD_LIMITS.menuItems.priceLabel}
              helperText="메뉴판에 그대로 보여줄 가격 문구입니다. 예: 4,500원, 시가, 변동가, 문의"
              onValueChange={setPriceLabelValue}
            />
          </div>
        )}
        {isOptionsMode && (
          <div className="mt-4">
            <p className="break-keep text-sm font-bold leading-relaxed text-zinc-500">
              HOT/ICE, 사이즈, 중량처럼 가격이 나뉘는 경우 사용합니다. 옵션별 가격을 사용하면 기본 가격은 공개 메뉴판에 표시되지 않습니다.
            </p>
            {item ? (
              <MenuItemPriceOptionsEditor menuId={menuId} itemId={item.id} priceOptions={priceOptions} />
            ) : (
              <DraftPriceOptionsEditor
                options={draftPriceOptions}
                label={draftPriceOptionLabel}
                price={draftPriceOptionPrice}
                priceLabel={draftPriceOptionPriceLabel}
                error={draftPriceOptionError || (optionsPriceInvalid ? "옵션별 가격을 1개 이상 추가해주세요." : "")}
                onLabelChange={setDraftPriceOptionLabel}
                onPriceChange={setDraftPriceOptionPrice}
                onPriceLabelChange={setDraftPriceOptionPriceLabel}
                onAdd={addDraftPriceOption}
                onRemove={removeDraftPriceOption}
              />
            )}
          </div>
        )}
        <div className="mt-4">
          <Checkbox
            form={formId}
            name="item_price_visible"
            label="공개 메뉴판에 가격 표시"
            description="끄면 공개 메뉴판에서 이 메뉴의 가격 정보가 숨겨집니다."
            defaultChecked={item?.price_visible ?? true}
          />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-100 bg-white p-4">
        <h4 className="text-sm font-black text-zinc-950">제공량</h4>
        <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
          가격 옆에 함께 보여줄 수 있는 용량, 중량, 구성 정보입니다.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ValidatedTextInput form={formId} name="item_portion_label" label="제공량 표시 문구" defaultValue={item?.portion_label ?? ""} placeholder="예: 150g, 1인분, 2pcs, 355ml, Small" maxLength={MENU_FIELD_LIMITS.menuItems.portionLabel} helperText="용량, 중량, 구성 정보를 짧게 입력하세요." onValueChange={setPortionLabelValue} />
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <Checkbox
              form={formId}
              name="item_portion_visible"
              label="공개 메뉴판에 제공량 표시"
              defaultChecked={Boolean((item?.portion_visible ?? true) && hasPortionData)}
              canTurnOn={hasPortionData}
              blockedMessage="제공량 표시 문구를 먼저 입력해주세요."
            />
          </div>
        </div>
      </section>

      {capabilities.itemTraits && (
        <section className="rounded-lg border border-zinc-100 bg-white p-4">
          <h4 className="text-sm font-black text-zinc-950">맛/특징 지표</h4>
          <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
            메뉴의 맛이나 특징을 간단히 보여주는 지표입니다. 최대 {MENU_LIMITS.maxTraitsPerItem}개까지 등록할 수 있습니다.
          </p>
          <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <Checkbox
              form={formId}
              name="item_traits_visible"
              label="공개 메뉴판에 맛/특징 지표 표시"
              defaultChecked={Boolean((item?.traits_visible ?? true) && hasTraitData)}
              canTurnOn={hasTraitData}
              blockedMessage="맛/특징 지표를 1개 이상 입력해주세요."
            />
          </div>
          <MenuItemTraitSlots formId={formId} traits={traits} onTraitLabelChange={handleTraitLabelChange} />
        </section>
      )}

      {capabilities.menuItemImages && (
        <section className="rounded-lg border border-zinc-100 bg-white p-4">
          <h4 className="text-sm font-black text-zinc-950">이미지</h4>
          <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
            이미지는 필수가 아닙니다. 이미지를 삭제하면 공개 메뉴판에서는 이미지 없는 형태로 표시됩니다.
          </p>
          <div className="mt-4">
          {item ? (
            <ImageUploadField label="메뉴 이미지" menuId={menuId} target="menu-item" recordId={item.id} currentUrl={item.image_url} />
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-4 text-sm font-bold leading-relaxed text-zinc-400">
              아이템을 먼저 추가한 뒤 이미지를 등록할 수 있습니다.
            </div>
          )}
          </div>
        </section>
      )}

      <div>
        <SubmitButton
          form={formId}
          tone={item ? "light" : "dark"}
          disabled={nameInvalid || categoryInvalid}
          onClick={(event) => {
            setAttemptedItemSubmit(true);
            if (singlePriceInvalid || optionsPriceInvalid) {
              event.preventDefault();
            }
          }}
        >
          {item ? "아이템 저장" : "아이템 추가"}
        </SubmitButton>
        <button type="button" onClick={onCancel} className="ml-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
          취소
        </button>
      </div>
    </div>
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
    .slice(0, MENU_LIMITS.maxTraitsPerItem)
    .map((trait) => `${trait.label} ${trait.value}/${trait.max_value}`)
    .join(" · ");
}

function formatPriceOption(option: Pick<MenuItemPriceOption, "price" | "price_label">) {
  if (option.price_label) return option.price_label;
  if (typeof option.price === "number") return new Intl.NumberFormat("ko-KR").format(option.price) + "원";
  return "";
}

function priceOptionSummary(options: MenuItemPriceOption[]) {
  return options
    .filter((option) => option.visible)
    .slice(0, MENU_LIMITS.maxPriceOptionsPerItem)
    .map((option) => `${option.label} ${formatPriceOption(option)}`.trim())
    .join(" · ");
}

function DraftPriceOptionsEditor({
  options,
  label,
  price,
  priceLabel,
  error,
  onLabelChange,
  onPriceChange,
  onPriceLabelChange,
  onAdd,
  onRemove,
}: {
  options: DraftPriceOption[];
  label: string;
  price: string;
  priceLabel: string;
  error?: string;
  onLabelChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onPriceLabelChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (optionId: string) => void;
}) {
  const reachedPriceOptionLimit = options.length >= MENU_LIMITS.maxPriceOptionsPerItem;

  return (
    <div className="mt-4 rounded-lg bg-zinc-50 p-4">
      <p className={`break-keep text-xs font-bold leading-relaxed ${error ? "text-red-600" : "text-zinc-400"}`}>
        {error || `옵션은 아이템당 최대 ${MENU_LIMITS.maxPriceOptionsPerItem}개까지 등록할 수 있습니다.`}
      </p>

      <div className="mt-4 rounded-lg border border-zinc-100 bg-white p-4">
        <h5 className="text-sm font-black text-zinc-950">새 가격 옵션 추가</h5>
        <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
          옵션별 가격을 사용하면 등록된 옵션이 공개 메뉴판에 표시됩니다. 옵션을 숨기려면 삭제해주세요.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_120px_160px_auto] lg:items-end">
          <div>
            <FieldLabel required>옵션명</FieldLabel>
            <TextInput value={label} onChange={(event) => onLabelChange(event.target.value)} placeholder="HOT" maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.label} helperText="예: HOT, ICE, 150g" />
          </div>
          <div>
            <FieldLabel required>가격</FieldLabel>
            <TextInput value={price} onChange={(event) => onPriceChange(event.target.value.replace(/[^0-9]/g, ""))} type="number" min={0} step={1} placeholder="4000" helperText="숫자만 입력하세요." />
          </div>
          <div>
            <FieldLabel>가격 표시 문구</FieldLabel>
            <TextInput value={priceLabel} onChange={(event) => onPriceLabelChange(event.target.value)} placeholder="4,000원" maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.priceLabel} helperText="있으면 이 문구를 우선 표시합니다." />
          </div>
          <div className="flex flex-col gap-2">
            <SubmitButton type="button" tone="light" disabled={reachedPriceOptionLimit} onClick={onAdd}>
              추가
            </SubmitButton>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h5 className="text-sm font-black text-zinc-950">등록 예정 옵션</h5>
        <div className="mt-3 space-y-3">
          {options.map((option) => (
            <div key={option.id} className="flex flex-col justify-between gap-3 rounded-lg border border-zinc-100 bg-white p-4 md:flex-row md:items-center">
              <div>
                <p className="text-base font-black text-zinc-950">{option.label}</p>
                <p className="mt-2 text-sm font-bold text-zinc-600">{option.priceLabel || `${new Intl.NumberFormat("ko-KR").format(Number(option.price))}원`}</p>
              </div>
              <button type="button" onClick={() => onRemove(option.id)} className="rounded-full border border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-700">
                제거
              </button>
            </div>
          ))}
          {options.length === 0 && <EmptyState>옵션별 가격을 1개 이상 추가해주세요. 예: HOT / ICE, Small / Large</EmptyState>}
        </div>
      </div>
    </div>
  );
}

export default function MenuManagementSection({ menuId, menuPages, categories, items, priceOptions, traits, capabilities }: MenuManagementSectionProps) {
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
  const [hasRestoredBuilderState, setHasRestoredBuilderState] = useState(false);
  const newItemFormRef = useRef<HTMLDivElement | null>(null);
  const selectedPage = sortedPages.find((page) => page.id === selectedPageId) ?? sortedPages[0] ?? null;
  const visiblePageId = selectedPage?.id ?? "";

  const categoriesForPage = useMemo(() => {
    if (!visiblePageId) return [];
    return sortCategories(categories.filter((category) => category.menu_page_id === visiblePageId));
  }, [categories, visiblePageId]);

  const firstCategoryId = categoriesForPage[0]?.id ?? "";
  const [selectedCategoryId, setSelectedCategoryId] = useState(firstCategoryId);
  const selectedCategory = categoriesForPage.find((category) => category.id === selectedCategoryId) ?? categoriesForPage[0] ?? null;
  const visibleCategoryId = selectedCategory?.id ?? "";
  const itemsForCategory = useMemo(() => sortItems(items.filter((item) => item.category_id === visibleCategoryId)), [items, visibleCategoryId]);
  const reachedPageLimit = sortedPages.length >= MENU_LIMITS.maxPagesPerSite;
  const reachedCategoryLimit = categoriesForPage.length >= MENU_LIMITS.maxCategoriesPerPage;
  const reachedItemsPerCategoryLimit = itemsForCategory.length >= MENU_LIMITS.maxItemsPerCategory;
  const reachedItemsPerSiteLimit = items.length >= MENU_LIMITS.maxItemsPerSite;
  const reachedItemLimit = reachedItemsPerCategoryLimit || reachedItemsPerSiteLimit;

  useEffect(() => {
    if (hasRestoredBuilderState) return;

    const savedBuilderState = readMenuBuilderState(menuId);
    const savedItem = savedBuilderState.editingItemId
      ? items.find((item) => item.id === savedBuilderState.editingItemId)
      : null;
    const savedItemCategory = savedItem ? categories.find((category) => category.id === savedItem.category_id) : null;

    const timeoutId = window.setTimeout(() => {
      if (savedItem && savedItemCategory) {
        setSelectedPageId(savedItemCategory.menu_page_id);
        setSelectedCategoryId(savedItemCategory.id);
        setEditingItemId(savedItem.id);
        setHasRestoredBuilderState(true);
        return;
      }

      const nextPageId =
        savedBuilderState.selectedPageId && sortedPages.some((page) => page.id === savedBuilderState.selectedPageId)
          ? savedBuilderState.selectedPageId
          : sortedPages[0]?.id ?? "";
      const categoriesForNextPage = nextPageId
        ? sortCategories(categories.filter((category) => category.menu_page_id === nextPageId))
        : [];
      const nextCategoryId =
        savedBuilderState.selectedCategoryId && categoriesForNextPage.some((category) => category.id === savedBuilderState.selectedCategoryId)
          ? savedBuilderState.selectedCategoryId
          : categoriesForNextPage[0]?.id ?? "";

      setSelectedPageId(nextPageId);
      setSelectedCategoryId(nextCategoryId);
      setHasRestoredBuilderState(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [categories, hasRestoredBuilderState, items, menuId, sortedPages]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        `${MENU_BUILDER_STATE_KEY_PREFIX}:${menuId}`,
        JSON.stringify({
          selectedPageId: visiblePageId,
          selectedCategoryId: visibleCategoryId,
          editingItemId,
        })
      );
    } catch {
      // Session storage can be unavailable in private browsing or strict modes.
    }
  }, [menuId, visiblePageId, visibleCategoryId, editingItemId]);

  useEffect(() => {
    if (!isCreatingItem) return;

    const formElement = newItemFormRef.current;
    if (!formElement) return;

    formElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const nameInput = formElement.querySelector<HTMLInputElement>('input[name="item_name"]');
    window.setTimeout(() => nameInput?.focus(), 120);
  }, [isCreatingItem]);

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

        {selectedCategory && isCreatingItem && (
          <div ref={newItemFormRef} className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 border-b border-zinc-100 pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">New Item</p>
              <h4 className="mt-1 text-2xl font-bold">새 아이템 추가</h4>
              <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                현재 선택한 메뉴 카테고리의 목록 위에 새 아이템을 추가합니다.
              </p>
            </div>
            <MenuItemForm
              menuId={menuId}
              categories={categoriesForPage}
              capabilities={capabilities}
              itemCount={itemsForCategory.length}
              selectedCategoryId={selectedCategory.id}
              onCancel={resetModes}
            />
          </div>
        )}

        <div className="mt-6 grid gap-4">
          {itemsForCategory.map((item) => (
            <MenuItemCard
              key={item.id}
              menuId={menuId}
              categories={categoriesForPage}
              item={item}
              priceOptions={priceOptions.filter((option) => option.menu_item_id === item.id)}
              traits={traits.filter((trait) => trait.menu_item_id === item.id)}
              capabilities={capabilities}
              isEditing={editingItemId === item.id}
              isConfirmingDelete={confirmingDeleteKey === `item:${item.id}`}
              onEdit={() => startEditItem(item.id)}
              onCancel={resetModes}
              onRequestDelete={() => startConfirmDelete(`item:${item.id}`)}
            />
          ))}
        </div>

        {selectedCategory && itemsForCategory.length === 0 && <EmptyState>이 메뉴 카테고리에 아이템이 없습니다.</EmptyState>}
        </div>
      </section>
    </div>
  );
}

function MenuItemCard({
  menuId,
  categories,
  item,
  priceOptions,
  traits,
  capabilities,
  isEditing,
  isConfirmingDelete,
  onEdit,
  onCancel,
  onRequestDelete,
}: {
  menuId: string;
  categories: MenuCategory[];
  item: MenuItem;
  priceOptions: MenuItemPriceOption[];
  traits: MenuItemTrait[];
  capabilities: TemplateCapabilities;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onRequestDelete: () => void;
}) {
  const badgeLabel = capabilities.itemBadges ? getMenuItemBadgeLabel(item) : null;
  const price = formatMenuPrice(item);
  const portion = formatPortionLabel(item);
  const priceOptionText = capabilities.priceOptions ? priceOptionSummary(priceOptions) : "";
  const traitText = capabilities.itemTraits ? traitSummary(traits) : "";
  const categoryName = categories.find((category) => category.id === item.category_id)?.name ?? "메뉴 카테고리";
  const [priceMode, setPriceMode] = useState<PriceMode>(capabilities.priceOptions && priceOptions.some((option) => option.visible) ? "options" : "single");

  return (
    <article className="rounded-lg border border-zinc-100 p-5">
      {isEditing ? (
        <>
          <div className="mb-4 border-b border-zinc-100 pb-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Item Detail</p>
            <h4 className="mt-1 text-2xl font-bold">아이템 수정</h4>
          </div>
          <MenuItemForm
            menuId={menuId}
            categories={categories}
            capabilities={capabilities}
            item={item}
            itemCount={0}
            selectedCategoryId={item.category_id ?? ""}
            priceOptions={priceOptions}
            traits={traits}
            priceMode={priceMode}
            onPriceModeChange={setPriceMode}
            onCancel={onCancel}
          />
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
            {[portion, priceOptionText || price, item.recommended ? "추천" : null].filter(Boolean).join(" · ") || "표시 정보 없음"}
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
            disabledReason={
              traits.length > 0 || priceOptions.length > 0
                ? "하위 가격 옵션 또는 맛/특징 지표가 있어 삭제할 수 없습니다. 삭제 대신 저장 시 메뉴판 표시를 끌 수 있습니다."
                : undefined
            }
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

function MenuItemPriceOptionsEditor({
  menuId,
  itemId,
  priceOptions,
}: {
  menuId: string;
  itemId: string;
  priceOptions: MenuItemPriceOption[];
}) {
  const reachedPriceOptionLimit = priceOptions.length >= MENU_LIMITS.maxPriceOptionsPerItem;
  const priceOptionLimitMessage = `옵션은 아이템당 최대 ${MENU_LIMITS.maxPriceOptionsPerItem}개까지 등록할 수 있습니다.`;
  const [editingPriceOptionId, setEditingPriceOptionId] = useState("");
  const [confirmingPriceOptionId, setConfirmingPriceOptionId] = useState("");

  return (
    <div className="mt-4 rounded-lg bg-zinc-50 p-4">
      <p className="break-keep text-xs font-semibold text-zinc-500">
        HOT / ICE, 사이즈, 중량처럼 공개 메뉴판에 보여줄 가격 문구를 관리합니다.
      </p>
      <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-500">
        옵션별 가격을 사용하면 등록된 옵션이 공개 메뉴판에 표시됩니다. 옵션을 숨기려면 삭제해주세요.
      </p>
      <p className={`mt-2 break-keep text-xs font-bold ${reachedPriceOptionLimit ? "text-amber-700" : "text-zinc-400"}`}>
        {priceOptionLimitMessage}
      </p>

      <div className="mt-4 rounded-lg border border-zinc-100 bg-white p-4">
        <h5 className="text-sm font-black text-zinc-950">새 가격 옵션 추가</h5>
        <p className="mt-1 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
          새로 등록할 옵션만 입력합니다. 옵션명은 필수이고, 가격 또는 가격 표시 문구 중 하나는 필요합니다.
        </p>
        <form action={createMenuItemPriceOptionAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_120px_160px_100px_auto] lg:items-end">
          <HiddenMenuId menuId={menuId} />
          <input type="hidden" name="itemId" value={itemId} />
          <div>
            <FieldLabel required>옵션명</FieldLabel>
            <TextInput name="price_option_label" placeholder="HOT" required maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.label} helperText="예: HOT, ICE, 150g" />
          </div>
          <div>
            <FieldLabel>가격</FieldLabel>
            <TextInput name="price_option_price" type="number" min={0} step={1} placeholder="4000" helperText="숫자만 입력하세요." />
          </div>
          <div>
            <FieldLabel>가격 표시 문구</FieldLabel>
            <TextInput name="price_option_price_label" placeholder="4,000원" maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.priceLabel} helperText="있으면 이 문구를 우선 표시합니다." />
          </div>
          <div>
            <FieldLabel>순서</FieldLabel>
            <TextInput name="price_option_sort_order" type="number" defaultValue={priceOptions.length + 1} min={0} step={1} helperText="낮을수록 먼저 표시됩니다." />
          </div>
          <div className="flex flex-col gap-2">
            <SubmitButton tone="light" disabled={reachedPriceOptionLimit}>
              추가
            </SubmitButton>
          </div>
        </form>
      </div>

      <div className="mt-5">
        <h5 className="text-sm font-black text-zinc-950">등록된 가격 옵션</h5>
        <div className="mt-3 space-y-3">
          {priceOptions.map((option) => {
            const isEditing = editingPriceOptionId === option.id;

            return (
            <div key={option.id} className="rounded-lg border border-zinc-100 bg-white p-4">
              {isEditing ? (
              <form action={updateMenuItemPriceOptionAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_120px_160px_100px_auto] lg:items-end">
                <HiddenMenuId menuId={menuId} />
                <input type="hidden" name="priceOptionId" value={option.id} />
                <div>
                  <FieldLabel required>옵션명</FieldLabel>
                  <TextInput name="price_option_label" defaultValue={option.label} required maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.label} helperText="예: HOT, ICE, 150g" />
                </div>
                <div>
                  <FieldLabel>가격</FieldLabel>
                  <TextInput name="price_option_price" type="number" min={0} step={1} defaultValue={option.price ?? ""} helperText="숫자만 입력하세요." />
                </div>
                <div>
                  <FieldLabel>가격 표시 문구</FieldLabel>
                  <TextInput name="price_option_price_label" defaultValue={option.price_label ?? ""} maxLength={MENU_FIELD_LIMITS.menuItemPriceOptions.priceLabel} helperText="있으면 이 문구를 우선 표시합니다." />
                </div>
                <div>
                  <FieldLabel>순서</FieldLabel>
                  <TextInput name="price_option_sort_order" type="number" defaultValue={option.sort_order} min={0} step={1} helperText="낮을수록 먼저 표시됩니다." />
                </div>
                <div className="flex flex-col gap-2">
                  <SubmitButton tone="light">저장</SubmitButton>
                  <button
                    type="button"
                    onClick={() => setEditingPriceOptionId("")}
                    className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700"
                  >
                    취소
                  </button>
                </div>
              </form>
              ) : (
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <p className="text-base font-black text-zinc-950">{option.label}</p>
                    <p className="mt-2 text-sm font-bold text-zinc-600">{formatPriceOption(option) || "가격 입력 전"}</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-400">정렬 순서 {option.sort_order}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingPriceOptionId("");
                        setEditingPriceOptionId(option.id);
                      }}
                      className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700"
                    >
                      수정
                    </button>
                    <DeleteConfirmForm
                      action={deleteMenuItemPriceOptionAction}
                      menuId={menuId}
                      hiddenName="priceOptionId"
                      hiddenValue={option.id}
                      isConfirming={confirmingPriceOptionId === option.id}
                      onRequestConfirm={() => {
                        setEditingPriceOptionId("");
                        setConfirmingPriceOptionId(option.id);
                      }}
                      onCancel={() => setConfirmingPriceOptionId("")}
                    />
                  </div>
                </div>
              )}
            </div>
            );
          })}
          {priceOptions.length === 0 && <EmptyState>아직 등록된 가격 옵션이 없습니다. 예: HOT / ICE, Small / Large, 150g / 300g</EmptyState>}
        </div>
      </div>
    </div>
  );
}

function MenuItemTraitSlots({
  formId,
  traits,
  onTraitLabelChange,
}: {
  formId: string;
  traits: MenuItemTrait[];
  onTraitLabelChange?: (index: number, value: string) => void;
}) {
  const orderedTraits = [...traits]
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    .slice(0, MENU_LIMITS.maxTraitsPerItem);
  const slots = Array.from({ length: MENU_LIMITS.maxTraitsPerItem }, (_, index) => orderedTraits[index] ?? null);
  const [slotLabelValues, setSlotLabelValues] = useState(() => slots.map((trait) => trait?.label ?? ""));

  function handleSlotLabelChange(index: number, value: string) {
    setSlotLabelValues((currentValues) => {
      const nextValues = [...currentValues];
      nextValues[index] = value;
      return nextValues;
    });
    onTraitLabelChange?.(index, value);
  }

  return (
    <div className="mt-4 grid gap-3">
      <p className="break-keep text-xs font-semibold leading-relaxed text-zinc-500">
        지표명을 비워두면 저장하지 않습니다. 강도는 1/5부터 5/5까지 선택할 수 있습니다.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {slots.map((trait, index) => {
          const slotNumber = index + 1;
          const slotLabel = slotLabelValues[index] ?? "";
          const hasSlotLabel = Boolean(slotLabel.trim());

          return (
            <div key={slotNumber} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <input type="hidden" name={`trait_slot_${index}_id`} value={trait?.id ?? ""} form={formId} />
              <input type="hidden" name={`trait_slot_${index}_sort_order`} value={index} form={formId} />
              <div className="flex items-center justify-between gap-3">
                <h5 className="text-sm font-black text-zinc-950">지표 {slotNumber}</h5>
                <SwitchField
                  name={`trait_slot_${index}_visible`}
                  form={formId}
                  label="표시"
                  defaultChecked={Boolean(trait?.visible && hasSlotLabel)}
                  canTurnOn={hasSlotLabel}
                  blockedMessage="지표명을 먼저 입력해주세요."
                  onText="표시 중"
                  offText="숨김"
                />
              </div>
              <div className="mt-4 grid gap-3">
                <div>
                  <FieldLabel>지표명</FieldLabel>
                  <TextInput
                    name={`trait_slot_${index}_label`}
                    form={formId}
                    defaultValue={trait?.label ?? ""}
                    placeholder={index === 0 ? "산미" : "고소함"}
                    maxLength={MENU_FIELD_LIMITS.menuItemTraits.label}
                    helperText="예: 산미, 바디감, 단맛, 고소함, 진함, 부드러움"
                    onChange={(event) => handleSlotLabelChange(index, event.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel>강도 1~5</FieldLabel>
                  <Select name={`trait_slot_${index}_value`} form={formId} defaultValue={String(trait?.value ?? MENU_FIELD_LIMITS.menuItemTraits.minValue)}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}/5
                      </option>
                    ))}
                  </Select>
                  <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">값이 높을수록 특징이 강하게 표시됩니다.</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {traits.length > MENU_LIMITS.maxTraitsPerItem && (
        <p className="break-keep text-xs font-bold leading-relaxed text-amber-700">
          기존 지표가 {MENU_LIMITS.maxTraitsPerItem}개를 초과해도 삭제하지 않습니다. 편집 화면과 공개 메뉴판에는 정렬순서 기준 앞 {MENU_LIMITS.maxTraitsPerItem}개만 사용됩니다.
        </p>
      )}
    </div>
  );
}
