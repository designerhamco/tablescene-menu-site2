"use client";

import { useState } from "react";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Switch } from "@/app/components/ui/switch";
import {
  MENU_PATTERN_BAND_THICKNESSES,
  MENU_PATTERN_DEFAULT_THICKNESS,
  type MenuPatternBands,
} from "@/lib/menu-pattern-bands";
import ImageUploadField from "./ImageUploadField";

export default function MenuPatternBandsForm({ menuId, initial, hasDefault, disabled, basic = false }: {
  menuId: string;
  initial: MenuPatternBands;
  hasDefault: boolean;
  disabled: boolean;
  basic?: boolean;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [enabledChanged, setEnabledChanged] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const usage = (
    <div className="site-action-row" data-wrap="nowrap">
      <label htmlFor="menu-pattern-bands-enabled" className="type-label">{basic ? "사용 여부" : "패턴 띠 사용"}</label>
      <Switch id="menu-pattern-bands-enabled" size="sm" checked={enabled} disabled={disabled} onCheckedChange={value => { setEnabled(value); setEnabledChanged(true); }} />
    </div>
  );
  const fields = (
    <fieldset disabled={disabled} className={basic ? "site-basic-editor-fields site-content-divider site-editor-section-rule" : "site-field-stack"}>
      <input type="hidden" name="pattern_bands_present" value="1" />
      <input type="hidden" name="pattern_bands_enabled" value={enabled ? "1" : "0"} />
      <input type="hidden" name="pattern_bands_enabled_changed" value={enabledChanged ? "1" : "0"} />
      <input type="hidden" name="pattern_bands_upload_pending" value={uploadPending ? "1" : "0"} />
      {!basic && usage}
      <ImageUploadField
        label={basic ? "패턴 띠 이미지" : "패턴 이미지"}
        editorLayout={basic}
        labelAction={basic ? usage : undefined}
        menuId={menuId}
        target="menu-pattern-band-draft"
        currentUrl={initial.image?.imageUrl}
        deferredDeleteName="pattern_bands_remove_image"
        draftImagePathInputName="pattern_bands_image_path"
        description={basic ? "메뉴판 위아래에 반복해서 표시할 패턴 이미지입니다." : undefined}
        optimizationGuidance={basic ? undefined : ""}
        emptyPreview={hasDefault ? <span className="type-label">기본 체크무늬</span> : undefined}
        onUploadPendingChange={setUploadPending}
        onDraftImageChange={({ imageAction }) => { if (imageAction === "delete" && !hasDefault) { setEnabled(false); setEnabledChanged(true); } }}
      />
      <label className="site-field-stack type-label">
        <span className={basic ? "site-basic-editor-label-row" : undefined}>띠 두께</span>
        <select name="pattern_bands_thickness" className="site-field" defaultValue={initial.thickness ?? ""}>
          <option value="">{hasDefault ? "템플릿 기본값" : `기본값 · ${MENU_PATTERN_DEFAULT_THICKNESS}px`}</option>
          {MENU_PATTERN_BAND_THICKNESSES.map(thickness => <option key={thickness} value={thickness}>{thickness}px</option>)}
        </select>
      </label>
    </fieldset>
  );
  return basic ? (
    <section className="site-stack-copy" data-menu-pattern-editor aria-labelledby="menu-pattern-bands-title">
      <h3 id="menu-pattern-bands-title" className="type-subsection-title">상·하단 패턴 띠</h3>
      {fields}
    </section>
  ) : (
    <ContentPanel surface="muted" aria-labelledby="menu-pattern-bands-title" data-menu-pattern-editor>
      <h3 id="menu-pattern-bands-title" className="type-content-title">상·하단 패턴 띠</h3>
      {fields}
    </ContentPanel>
  );
}
