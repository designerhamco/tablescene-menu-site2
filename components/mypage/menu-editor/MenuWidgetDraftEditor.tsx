"use client";

import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Switch } from "@/app/components/ui/switch";
import { AlignLeft, AlignCenter, AlignRight } from "@/app/components/ui/site-icon";
import HelpTooltip from "@/components/ui/HelpTooltip";

import MenuWidgetImageField from "@/components/mypage/menu-editor/MenuWidgetImageField";
import MenuWidgetTypePicker from "@/components/mypage/menu-editor/MenuWidgetTypePicker";
import {
  MAX_MENU_WIDGET_ALT_TEXT_LENGTH,
  MAX_MENU_WIDGET_DESCRIPTION_LENGTH,
  MAX_MENU_WIDGET_TITLE_LENGTH,
  MENU_WIDGET_ASPECT_RATIOS,
  MENU_WIDGET_OBJECT_FITS,
  MENU_WIDGET_OBJECT_POSITIONS,
  MENU_WIDGET_TEXT_ALIGNS,
  type MenuWidgetDraft,
  type MenuWidgetType,
  validateMenuWidgetDraft,
} from "@/lib/menu-widgets";

type MenuWidgetDraftEditorMode = "create" | "copy" | "edit";

type MenuWidgetDraftEditorProps = {
  mode: MenuWidgetDraftEditorMode;
  basicEditor?: boolean;
  finalSaveDisabled?: boolean;
  finalSavePending?: boolean;
  finalSaveError?: string | null;
  onFinalSave?: () => void;
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
  "3:1": "가로형 3:1",
  "2:1": "가로형 2:1",
  "4:3": "가로형 4:3",
  "1:1": "정사각형 1:1",
  "3:4": "세로형 3:4",
  "1:2": "세로형 1:2",
  "1:3": "세로형 1:3",
};

const OBJECT_FIT_LABELS: Record<string, string> = {
  cover: "채우기",
  contain: "전체 보이기",
};

const OBJECT_POSITION_LABELS: Record<string, string> = {
  "top-left": "상단 왼쪽",
  "top-center": "상단 가운데",
  "top-right": "상단 오른쪽",
  "center-left": "가운데 왼쪽",
  center: "정중앙",
  "center-right": "가운데 오른쪽",
  "bottom-left": "하단 왼쪽",
  "bottom-center": "하단 가운데",
  "bottom-right": "하단 오른쪽",
};

const TEXT_ALIGN_LABELS: Record<string, string> = {
  left: "왼쪽",
  center: "가운데",
  right: "오른쪽",
};

export default function MenuWidgetDraftEditor({
  mode,
  basicEditor = false,
  finalSaveDisabled = false,
  finalSavePending = false,
  finalSaveError,
  onFinalSave,
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
  const fieldId = useId();
  const [imagePending, setImagePending] = useState(false);
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
        objectPosition: draft.settings.objectPosition || "center",
        textAlign: draft.settings.textAlign || "left",
        placement: draft.settings.placement || "flow",
        altText: type === "text" ? "" : draft.settings.altText,
      },
    };
    onChange(nextDraft);
  }

  if (basicEditor) {
    const busy = imagePending || finalSavePending;
    return <div className="site-stack-block" data-basic-widget-form>
      <h3 className="type-subsection-title">위젯 설정</h3>
      <fieldset disabled={busy} className="site-stack-group site-content-divider site-editor-section-rule" aria-busy={busy}>
        <div className="site-field-stack">
          <div className="site-content-heading-row" data-layout="toolbar">
            <div className="site-action-row">
              <span className="type-label" id={`${fieldId}-type`}>위젯 유형</span>
              <HelpTooltip label="위젯 유형 도움말" hover>이미지, 텍스트 또는 이미지와 텍스트를 함께 표시할 수 있습니다.</HelpTooltip>
            </div>
            <label className="site-action-row"><span className="type-label">사용 여부</span>
              <Switch size="sm" aria-label="위젯 사용 여부" checked={draft.visible} onCheckedChange={visible => patchDraft({ visible })} />
            </label>
          </div>
          <MenuWidgetTypePicker value={draft.type} onChange={changeType} compact />
        </div>
        {usesImage && <>
          <MenuWidgetImageField menuSiteId={menuSiteId} menuPageId={draft.menuPageId} widgetId={draft.id}
            widgetType={draft.type === "image_text" ? "image_text" : "image"} imageUrl={draft.imageUrl}
            imagePath={draft.imagePath} persistedImagePath={persistedImagePath} editorLayout
            onPendingChange={setImagePending} onChange={image => patchDraft(image)} />
          <div className="site-basic-editor-fields">
            <div className="site-field-stack">
              <div className="site-action-row"><span className="type-label">이미지 기준 위치</span>
                <HelpTooltip label="이미지 기준 위치 도움말" hover>채우기에서는 잘리는 영역의 기준을, 전체 보이기에서는 여백 안의 이미지 위치를 정합니다.</HelpTooltip>
              </div>
              <div className="site-editor-image-position" role="group" aria-label="이미지 기준 위치">
                {MENU_WIDGET_OBJECT_POSITIONS.map(position => <button key={position} type="button"
                  aria-label={OBJECT_POSITION_LABELS[position]} aria-pressed={(draft.settings.objectPosition ?? "center") === position}
                  title={OBJECT_POSITION_LABELS[position]} onClick={() => patchSettings({ objectPosition: position })}>
                  <span aria-hidden="true" />
                </button>)}
              </div>
              <p className="type-caption site-copy-muted">이미지가 보여질 기준 위치를 선택하세요.</p>
            </div>
            <div className="site-stack-group">
              <div className="site-field-stack">
                <div className="site-action-row"><label htmlFor={`${fieldId}-ratio`} className="type-label">이미지 비율</label>
                  <HelpTooltip label="이미지 비율 도움말" hover>선택한 비율이 PC·태블릿·모바일에 동일하게 적용됩니다.</HelpTooltip>
                </div>
                <select id={`${fieldId}-ratio`} className="site-field site-select" value={draft.settings.aspectRatio}
                  onChange={event => patchSettings({ aspectRatio: event.currentTarget.value as MenuWidgetDraft["settings"]["aspectRatio"] })}>
                  {!MENU_WIDGET_ASPECT_RATIOS.some(ratio => ratio === draft.settings.aspectRatio) && <option value={draft.settings.aspectRatio}>{draft.settings.aspectRatio}</option>}
                  {MENU_WIDGET_ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ASPECT_RATIO_LABELS[ratio]}</option>)}
                </select>
              </div>
              <div className="site-field-stack">
                <div className="site-action-row"><label htmlFor={`${fieldId}-fit`} className="type-label">이미지 맞춤</label>
                  <HelpTooltip label="이미지 맞춤 도움말" hover>채우기는 영역을 빈틈없이 채우며 이미지 일부가 잘릴 수 있습니다. 전체 보이기는 이미지 전체를 표시합니다.</HelpTooltip>
                </div>
                <select id={`${fieldId}-fit`} className="site-field site-select" value={draft.settings.objectFit}
                  onChange={event => patchSettings({ objectFit: event.currentTarget.value as MenuWidgetDraft["settings"]["objectFit"] })}>
                  {MENU_WIDGET_OBJECT_FITS.map(fit => <option key={fit} value={fit}>{OBJECT_FIT_LABELS[fit]}</option>)}
                </select>
              </div>
            </div>
          </div>
        </>}
        {usesText && <>
          <div className="site-field-stack">
            <label htmlFor={`${fieldId}-title`} className="type-label">위젯 제목 텍스트</label>
            <input id={`${fieldId}-title`} className="site-field site-input" value={draft.title} maxLength={MAX_MENU_WIDGET_TITLE_LENGTH}
              onChange={event => patchDraft({ title: event.currentTarget.value })} placeholder="예: 매장 이용 안내" />
            <p className="type-caption site-copy-muted text-right">{draft.title.length}/{MAX_MENU_WIDGET_TITLE_LENGTH}</p>
          </div>
          <div className="site-field-stack">
            <label htmlFor={`${fieldId}-body`} className="type-label">위젯 본문 텍스트</label>
            <textarea id={`${fieldId}-body`} className="site-field site-textarea" rows={3} value={draft.description} maxLength={MAX_MENU_WIDGET_DESCRIPTION_LENGTH}
              onChange={event => patchDraft({ description: event.currentTarget.value })} placeholder="예: 계절 메뉴와 매장 소식을 확인해 주세요." />
            <p className="type-caption site-copy-muted text-right">{draft.description.length}/{MAX_MENU_WIDGET_DESCRIPTION_LENGTH}</p>
          </div>
          <div className="site-field-stack">
            <span className="type-label">텍스트 정렬</span>
            <div className="site-action-row site-editor-widget-choices" role="group" aria-label="텍스트 정렬">
              {MENU_WIDGET_TEXT_ALIGNS.map(align => {
                const Icon = { left: AlignLeft, center: AlignCenter, right: AlignRight }[align];
                return <button key={align} type="button" className="site-choice site-choice-control"
                  aria-pressed={draft.settings.textAlign === align} onClick={() => patchSettings({ textAlign: align })}>
                  <Icon />{TEXT_ALIGN_LABELS[align]} 정렬
                </button>;
              })}
            </div>
          </div>
        </>}
        {(validationErrors.length > 0 || countExceeded) && <div role="alert" className="site-notice site-notice-warning type-body-sm">
          {countExceeded && <p>한 페이지에는 위젯을 최대 {maxWidgetCount}개까지 등록할 수 있습니다.</p>}
          {validationErrors.map(error => <p key={`${error.field}:${error.code}`}>{error.message}</p>)}
        </div>}
        <div className="site-action-row site-editor-action-row">
          <button type="button" className="site-button site-button-primary" disabled={finalSaveDisabled || validationErrors.length > 0 || countExceeded}
            onClick={onFinalSave}>{finalSavePending ? "저장 중…" : "최종 저장"}</button>
          {mode === "edit" && onCopy && <button type="button" className="site-button site-button-outline"
            disabled={widgetCount >= maxWidgetCount} onClick={onCopy}>복사</button>}
          {mode === "edit" && onRequestDelete && !isConfirmingDelete && <button type="button"
            className="site-button site-button-outline-danger" onClick={onRequestDelete}>삭제</button>}
          {mode !== "edit" && <button type="button" className="site-button site-button-outline" onClick={onCancel}>취소</button>}
        </div>
        {isConfirmingDelete && <div className="site-action-row" role="alert">
          <span className="type-body-sm">이 위젯을 삭제할까요?</span>
          <button type="button" className="site-button site-button-danger" onClick={onConfirmDelete}>삭제</button>
          <button type="button" className="site-button site-button-outline" onClick={onCancelDelete}>취소</button>
        </div>}
        {finalSaveError && <p role="alert" className="type-body-sm text-red-600">{finalSaveError}</p>}
      </fieldset>
    </div>;
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-support font-medium uppercase text-zinc-600">Widget Detail</p>
        <h3 className="type-subsection-title mt-2 text-zinc-950">{heading}</h3>
        <p className="mt-2 break-keep text-copy font-semibold leading-relaxed text-zinc-600">
          위젯은 카테고리와 같은 최상위 콘텐츠입니다. 여기서 반영한 뒤 하단의 최종 저장을 눌러야 공개 메뉴판에 반영됩니다.
        </p>
      </div>

      <div className="grid gap-5">
        <FieldBlock label="위젯 유형">
          <MenuWidgetTypePicker value={draft.type} onChange={changeType} />
        </FieldBlock>

        <div className="site-section site-editor-subpanel p-4">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-copy font-medium text-zinc-950">메뉴판에 표시</span>
              <span className="mt-1 block text-support font-medium text-zinc-600">{draft.visible ? "표시함" : "표시 안 함"}</span>
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
                className="site-field w-full border-zinc-200 px-4 py-3 text-zinc-900 transition"
              />
              <CharacterCounter value={draft.title} maxLength={MAX_MENU_WIDGET_TITLE_LENGTH} />
            </FieldBlock>
            <FieldBlock label="본문">
              <textarea
                value={draft.description}
                maxLength={MAX_MENU_WIDGET_DESCRIPTION_LENGTH}
                onChange={(event) => patchDraft({ description: event.currentTarget.value })}
                placeholder="메뉴판에 함께 보여줄 문구를 입력해주세요."
                rows={5}
                className="site-field w-full resize-y border-zinc-200 px-4 py-3 leading-relaxed text-zinc-900 transition"
              />
              <CharacterCounter value={draft.description} maxLength={MAX_MENU_WIDGET_DESCRIPTION_LENGTH} />
            </FieldBlock>
          </div>
        )}

        {usesImage && (
          <div className="site-section site-editor-subpanel grid gap-4 p-4 md:grid-cols-2">
            <FieldBlock label="이미지 비율">
              <select
                value={draft.settings.aspectRatio}
                onChange={(event) => patchSettings({ aspectRatio: event.currentTarget.value as MenuWidgetDraft["settings"]["aspectRatio"] })}
                className="site-field w-full border-zinc-200 px-3 py-2.5 text-zinc-800"
              >
                {MENU_WIDGET_ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio} value={ratio}>{ASPECT_RATIO_LABELS[ratio] ?? ratio}</option>
                ))}
              </select>
              <p className="mt-2 break-keep text-support font-semibold leading-relaxed text-zinc-600">
                선택한 비율이 PC·태블릿·모바일에 동일하게 적용됩니다.
              </p>
            </FieldBlock>
            <FieldBlock label="이미지 맞춤">
              <select
                value={draft.settings.objectFit}
                onChange={(event) => patchSettings({ objectFit: event.currentTarget.value as MenuWidgetDraft["settings"]["objectFit"] })}
                className="site-field w-full border-zinc-200 px-3 py-2.5 text-zinc-800"
              >
                {MENU_WIDGET_OBJECT_FITS.map((fit) => (
                  <option key={fit} value={fit}>{OBJECT_FIT_LABELS[fit] ?? fit}</option>
                ))}
              </select>
            </FieldBlock>
            <div className="md:col-span-2">
              <FieldBlock label="이미지 기준 위치">
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="이미지 기준 위치">
                  {MENU_WIDGET_OBJECT_POSITIONS.map((position) => {
                    const selected = (draft.settings.objectPosition ?? "center") === position;
                    return (
                      <button
                        key={position}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => patchSettings({ objectPosition: position })}
                        className="site-choice site-choice-control"
                      >
                        {OBJECT_POSITION_LABELS[position] ?? position}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 break-keep text-support font-semibold leading-relaxed text-zinc-600">
                  채우기에서는 잘리는 영역의 기준을, 전체 보이기에서는 남는 여백의 위치를 정합니다.
                </p>
              </FieldBlock>
            </div>
            <div className="md:col-span-2">
              <FieldBlock label="이미지 대체 텍스트">
                <input
                  type="text"
                  value={draft.settings.altText}
                  maxLength={MAX_MENU_WIDGET_ALT_TEXT_LENGTH}
                  onChange={(event) => patchSettings({ altText: event.currentTarget.value })}
                  placeholder="이미지를 설명하는 짧은 문구"
                  className="site-field w-full border-zinc-200 px-4 py-3 text-zinc-900 transition"
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
                  className={`site-button ${draft.settings.textAlign === align ? "site-button-primary" : "site-button-secondary"}`} aria-pressed={draft.settings.textAlign === align}
                >
                  {TEXT_ALIGN_LABELS[align] ?? align}
                </button>
              ))}
            </div>
          </FieldBlock>
        )}

        {(validationErrors.length > 0 || countExceeded) && (
          <div className="site-notice site-notice-warning px-4 py-3 text-support font-medium leading-relaxed">
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
              className="site-button site-button-outline mr-auto"
            >
              복사
            </button>
          )}
          {mode === "edit" && onRequestDelete && onConfirmDelete ? (
            isConfirmingDelete ? (
              <span className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-support font-medium text-red-600">이 위젯을 삭제할까요?</span>
                <button type="button" onClick={onConfirmDelete} className="site-button site-button-danger">삭제</button>
                <button type="button" onClick={onCancelDelete} className="site-button site-button-outline">취소</button>
              </span>
            ) : (
              <button type="button" onClick={onRequestDelete} className="site-button site-button-outline-danger">
                삭제
              </button>
            )
          ) : null}
          <button type="button" onClick={onCancel} className="site-button site-button-outline">
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="site-button site-button-primary"
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
      <span className="mb-2 block text-support font-medium text-zinc-600">{label}</span>
      {children}
    </div>
  );
}

function CharacterCounter({ value, maxLength }: { value: string; maxLength: number }) {
  const isTooLong = value.length > maxLength;

  return (
    <p className={`mt-1.5 text-right text-support font-medium ${isTooLong ? "text-red-600" : "text-zinc-600"}`}>
      {value.length} / {maxLength}
    </p>
  );
}
