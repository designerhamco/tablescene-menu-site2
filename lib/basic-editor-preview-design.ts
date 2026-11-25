import { normalizeMenuAppearance, readMenuAppearance } from "./menu-appearance";
import { menuSurfaceRecord, readMenuSurfaceSettings, withMenuSurfaceSettings } from "./menu-design-surfaces";
import { readPreviewDesign } from "./menu-preview-design";
import { readPreviewChipColors } from "./menu-preview-chip-colors";
import { resolvedMenuTextColors } from "./menu-text-colors";
import { getSafeEnglishFontValueForTemplate } from "./font-options";

/** Use the same settings for the editable preview and its final save. */
export function applyBasicEditorPreviewDesign(pageSettings: unknown, settings: unknown, templateKey: string, raw: unknown, album: boolean) {
  const draft = readPreviewDesign(raw);
  let page = menuSurfaceRecord(pageSettings);
  if (draft.pageBackground || draft.auxiliaryBackground || draft.representativeAlignment) {
    page = withMenuSurfaceSettings(page, settings, templateKey, {
      ...readMenuSurfaceSettings(page),
      ...(draft.pageBackground && { pageBackground: draft.pageBackground }),
      ...(draft.auxiliaryBackground && { auxiliaryBackground: draft.auxiliaryBackground }),
      ...(draft.representativeAlignment && { representativeAlignment: draft.representativeAlignment }),
    });
  }

  const design = menuSurfaceRecord(page.design);
  if (draft.fontFamily) {
    design.commonFonts = true;
    if (draft.fontFamily.ko) design.koreanFont = draft.fontFamily.ko;
    if (draft.fontFamily.en) design.englishFont = getSafeEnglishFontValueForTemplate(templateKey, draft.fontFamily.en);
  }
  if (draft.textColors) {
    design.textColors = { ...resolvedMenuTextColors(page, false), ...draft.textColors };
    design.textColorGroupsVersion = 2;
  }
  if (draft.chipColors) {
    design.chipColors = { ...readPreviewChipColors(design.chipColors), ...draft.chipColors };
  }
  if (draft.imageRadii || draft.chipShape || (album && draft.albumImageRatio)) {
    const saved = readMenuAppearance(page);
    design.appearance = normalizeMenuAppearance({
      imageRadii: { ...saved.imageRadii, ...draft.imageRadii },
      chipShape: draft.chipShape ?? saved.chipShape,
      albumImageRatio: album ? draft.albumImageRatio ?? saved.albumImageRatio : saved.albumImageRatio,
    });
  }
  return Object.keys(design).length ? { ...page, design } : page;
}
