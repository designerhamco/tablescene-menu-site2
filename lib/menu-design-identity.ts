import { getCatalogDesign } from "./catalog-designs";
import { getTemplateDisplayName } from "./templates";

/** Renderer keys can serve several catalog designs. Never infer a purchase from a renderer label. */
export function getSavedMenuDesign(templateKey: string | null | undefined, settings: unknown) {
  const id = settings && typeof settings === "object" && !Array.isArray(settings)
    ? (settings as Record<string, unknown>).menu_design_id : undefined;
  const design = getCatalogDesign(id);
  return design?.templateKey === templateKey ? design : null;
}
export function getMenuDesignDisplayName(templateKey?: string | null, templateCategory?: string | null, settings?: unknown) {
  const design = getSavedMenuDesign(templateKey, settings);
  return design?.kind === "standard" ? `기본 디자인 / ${design.name}` : getTemplateDisplayName(templateKey, templateCategory);
}
