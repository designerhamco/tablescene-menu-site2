import { isAubeTableTemplate } from "@/lib/aube-table";
import { getTemplateCapabilities } from "@/lib/template-capabilities";

export type MenuLocalizationStructure = "basic" | "display" | "default";

export function getMenuLocalizationStructure(templateKey?: string | null): MenuLocalizationStructure {
  if (isAubeTableTemplate(templateKey)) return "default";
  if (templateKey === "display_menu_a") return "display";
  if (getTemplateCapabilities(templateKey).footerStoreInfo) return "basic";
  return "default";
}
