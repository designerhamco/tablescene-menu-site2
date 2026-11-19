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

export default function MenuPatternBandsForm({ menuId, initial, hasDefault, disabled }: {
  menuId: string;
  initial: MenuPatternBands;
  hasDefault: boolean;
  disabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [uploadPending, setUploadPending] = useState(false);
  return (
    <ContentPanel surface="muted" aria-labelledby="menu-pattern-bands-title" data-menu-pattern-editor>
      <h3 id="menu-pattern-bands-title" className="type-content-title">상·하단 패턴 띠</h3>
      <fieldset disabled={disabled} className="site-field-stack">
        <input type="hidden" name="pattern_bands_present" value="1" />
        <input type="hidden" name="pattern_bands_enabled" value={enabled ? "1" : "0"} />
        <input type="hidden" name="pattern_bands_upload_pending" value={uploadPending ? "1" : "0"} />
        <div className="site-form-row" data-alignment="center">
          <label htmlFor="menu-pattern-bands-enabled" className="type-label">패턴 띠 사용</label>
          <Switch id="menu-pattern-bands-enabled" size="sm" checked={enabled} disabled={disabled} onCheckedChange={setEnabled} />
        </div>
        <ImageUploadField
          label="패턴 이미지"
          menuId={menuId}
          target="menu-pattern-band-draft"
          currentUrl={initial.image?.imageUrl}
          deferredDeleteName="pattern_bands_remove_image"
          draftImagePathInputName="pattern_bands_image_path"
          optimizationGuidance=""
          emptyPreview={hasDefault ? <span className="type-label">기본 체크무늬</span> : undefined}
          onUploadPendingChange={setUploadPending}
          onDraftImageChange={({ imageAction }) => { if (imageAction === "delete" && !hasDefault) setEnabled(false); }}
        />
        <label className="site-field-stack type-label">띠 두께
          <select name="pattern_bands_thickness" className="site-field" defaultValue={initial.thickness ?? ""}>
            <option value="">{hasDefault ? "템플릿 기본값" : `기본값 · ${MENU_PATTERN_DEFAULT_THICKNESS}px`}</option>
            {MENU_PATTERN_BAND_THICKNESSES.map(thickness => <option key={thickness} value={thickness}>{thickness}px</option>)}
          </select>
        </label>
      </fieldset>
    </ContentPanel>
  );
}
