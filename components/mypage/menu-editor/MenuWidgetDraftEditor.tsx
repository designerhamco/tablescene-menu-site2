"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import MenuWidgetImageField from "@/components/mypage/menu-editor/MenuWidgetImageField";
import MenuWidgetTypePicker from "@/components/mypage/menu-editor/MenuWidgetTypePicker";
import {
  MAX_MENU_WIDGET_ALT_TEXT_LENGTH,
  MAX_MENU_WIDGET_DESCRIPTION_LENGTH,
  MAX_MENU_WIDGET_TITLE_LENGTH,
  MENU_WIDGET_ASPECT_RATIOS,
  MENU_WIDGET_OBJECT_FITS,
  MENU_WIDGET_TEXT_ALIGNS,
  type MenuWidgetDraft,
  type MenuWidgetType,
  validateMenuWidgetDraft,
} from "@/lib/menu-widgets";

type MenuWidgetDraftEditorMode = "create" | "copy" | "edit";

type MenuWidgetDraftEditorProps = {
  mode: MenuWidgetDraftEditorMode;
  menuSiteId: string;
  draft: MenuWidgetDraft;
  persistedImagePath: string | null;
  widgetCount: number;
  maxWidgetCount: number;
  isConfirmingDelete?: boolean;
  hasChanges?: boolean;
  onChange: (draft: MenuWidgetDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onCopy?: () => void;
  onRequestDelete?: () => void;
  onCancelDelete?: () => void;
  onConfirmDelete?: () => void;
};

const ASPECT_RATIO_LABELS: Record<string, string> = {
  "2:1": "가로형 2:1",
  "3:2": "가로형 3:2",
  "4:3": "기본 4:3",
  "1:1": "정사각형",
  "3:4": "세로형 3:4",
};

const OBJECT_FIT_LABELS: Record<string, string> = {
  cover: "채우기",
  contain: "전체 보이기",
};

const TEXT_ALIGN_LABELS: Record<string, string> = {
  left: "왼쪽",
  center: "가운데",
  right: "오른쪽",
};

export default function MenuWidgetDraftEditor({
  mode,
  menuSiteId,
  draft,
  persistedImagePath,
  widgetCount,
  maxWidgetCount,
  isConfirmingDelete = false,
  hasChanges = true,
  onChange,
  onSave,
  onCancel,
  onCopy,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: MenuWidgetDraftEditorProps) {
  const validation = useMemo(() => validateMenuWidgetDraft(draft), [draft]);
  const validationErrors = validation.valid ? [] : validation.errors;
  const usesImage = draft.type === "image" || draft.type === "image_text";
  const usesText = draft.type === "text" || draft.type === "image_text";
  const heading = mode === "create" ? "새 위젯 추가" : mode === "copy" ? "위젯 복사" : "위젯 수정";
  const saveLabel = mode === "create" ? "위젯 추가" : mode === "copy" ? "복사본 반영" : "수정 내용 반영";
  const countExceeded = widgetCount > maxWidgetCount;
  const saveDisabled = validationErrors.length > 0 || countExceeded || !hasChanges;

  function patchDraft(patch: Partial<MenuWidgetDraft>) {
    onChange({ ...draft, ...patch });
  }

  function patchSettings(patch: Partial<MenuWidgetDraft["settings"]>) {
    onChange({ ...draft, settings: { ...draft.settings, ...patch } });
  }

  function changeType(type: MenuWidgetType) {
    if (type === draft.type) return;

    const nextDraft: MenuWidgetDraft = {
      ...draft,
      type,
      title: type === "image" ? "" : draft.title,
      description: type === "image" ? "" : draft.description,
      imageUrl: type === "text" ? null : draft.imageUrl,
      imagePath: type === "text" ? null : draft.imagePath,
      settings: {
        aspectRatio: type === "image" ? draft.settings.aspectRatio || "2:1" : draft.settings.aspectRatio || "4:3",
        objectFit: draft.settings.objectFit || "cover",
        textAlign: draft.settings.textAlign || "left",
        altText: type === "text" ? "" : draft.settings.altText,
      },
    };
    onChange(nextDraft);
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Widget Detail</p>
        <h3 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{heading}</h3>
        <p className="mt-2 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
          위젯은 카테고리와 같은 최상위 콘텐츠입니다. 여기서 반영한 뒤 하단의 최종 저장을 눌러야 공개 메뉴판에 반영됩니다.
        </p>
      </div>

      <div className="grid gap-5">
        <FieldBlock label="위젯 유형">
          <MenuWidgetTypePicker value={draft.type} onChange={changeType} />
        </FieldBlock>

        <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-black text-zinc-950">메뉴판에 표시</span>
              <span className="mt-1 block text-xs font-bold text-zinc-400">{draft.visible ? "표시함" : "표시 안 함"}</span>
            </span>
            <input
              type="checkbox"
              checked={draft.visible}
              onChange={(event) => patchDraft({ visible: event.currentTarget.checked })}
              className="h-5 w-5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
            />
          </label>
        </div>

        {usesImage && (
          <MenuWidgetImageField
            menuSiteId={menuSiteId}
            menuPageId={draft.menuPageId}
            widgetId={draft.id}
            widgetType={draft.type === "image_text" ? "image_text" : "image"}
            imageUrl={draft.imageUrl}
            imagePath={draft.imagePath}
            persistedImagePath={persistedImagePath}
            onChange={(image) => patchDraft(image)}
          />
        )}

        {usesText && (
          <div className="grid gap-4">
            <FieldBlock label="제목">
              <input
                type="text"
                value={draft.title}
                maxLength={MAX_MENU_WIDGET_TITLE_LENGTH}
                onChange={(event) => patchDraft({ title: event.currentTarget.value })}
                placeholder="예: 오늘의 안내"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
              />
            </FieldBlock>
            <FieldBlock label="본문">
              <textarea
                value={draft.description}
                maxLength={MAX_MENU_WIDGET_DESCRIPTION_LENGTH}
                onChange={(event) => patchDraft({ description: event.currentTarget.value })}
                placeholder="메뉴판에 함께 보여줄 문구를 입력해주세요."
                rows={5}
                className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-zinc-900 outline-none transition focus:border-zinc-950"
              />
            </FieldBlock>
          </div>
        )}

        {usesImage && (
          <div className="grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-2">
            <FieldBlock label="이미지 비율">
              <select
                value={draft.settings.aspectRatio}
                onChange={(event) => patchSettings({ aspectRatio: event.currentTarget.value as MenuWidgetDraft["settings"]["aspectRatio"] })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-950"
              >
                {MENU_WIDGET_ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio}>{ASPECT_RATIO_LABELS[ratio] ?? ratio}</option>
                ))}
              </select>
            </FieldBlock>
            <FieldBlock label="이미지 맞춤">
              <select
                value={draft.settings.objectFit}
                onChange={(event) => patchSettings({ objectFit: event.currentTarget.value as MenuWidgetDraft["settings"]["objectFit"] })}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-bold text-zinc-800 outline-none focus:border-zinc-950"
              >
                {MENU_WIDGET_OBJECT_FITS.map((fit) => (
                  <option key={fit} value={fit}>{OBJECT_FIT_LABELS[fit] ?? fit}</option>
                ))}
              </select>
            </FieldBlock>
            <div className="md:col-span-2">
              <FieldBlock label="이미지 대체 텍스트">
                <input
                  type="text"
                  value={draft.settings.altText}
                  maxLength={MAX_MENU_WIDGET_ALT_TEXT_LENGTH}
                  onChange={(event) => patchSettings({ altText: event.currentTarget.value })}
                  placeholder="이미지를 설명하는 짧은 문구"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
                />
              </FieldBlock>
            </div>
          </div>
        )}

        {usesText && (
          <FieldBlock label="텍스트 정렬">
            <div className="flex flex-wrap gap-2">
              {MENU_WIDGET_TEXT_ALIGNS.map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => patchSettings({ textAlign: align })}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                    draft.settings.textAlign === align
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {TEXT_ALIGN_LABELS[align] ?? align}
                </button>
              ))}
            </div>
          </FieldBlock>
        )}

        {(validationErrors.length > 0 || countExceeded) && (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-700">
            {countExceeded && <p>한 페이지에는 위젯을 최대 {maxWidgetCount}개까지 등록할 수 있습니다.</p>}
            {validationErrors.map((error) => (
              <p key={`${error.field}:${error.code}`}>{error.message}</p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-100 pt-5">
          {mode === "edit" && onCopy && (
            <button
              type="button"
              onClick={onCopy}
              disabled={widgetCount >= maxWidgetCount}
              className="mr-auto rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              복사
            </button>
          )}
          {mode === "edit" && onRequestDelete && onConfirmDelete ? (
            isConfirmingDelete ? (
              <span className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-xs font-bold text-red-600">이 위젯을 삭제할까요?</span>
                <button type="button" onClick={onConfirmDelete} className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white">삭제</button>
                <button type="button" onClick={onCancelDelete} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-600">취소</button>
              </span>
            ) : (
              <button type="button" onClick={onRequestDelete} className="rounded-full border border-red-100 bg-white px-5 py-3 text-sm font-bold text-red-600">
                삭제
              </button>
            )
          ) : null}
          <button type="button" onClick={onCancel} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700">
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="block">
      <span className="mb-2 block text-xs font-black text-zinc-500">{label}</span>
      {children}
    </div>
  );
}
