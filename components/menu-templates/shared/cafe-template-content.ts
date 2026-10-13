// Extracted without changing the existing rendering or fit formulas.
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import { type TemplateCapabilities } from "@/lib/template-capabilities";
import { type MenuLayoutDensity } from "@/lib/template-layout-rules";
import { type MenuItem } from "@/components/menu-templates/shared/cafe-template-types";


export function hasVisibleMenuItemImage(item: MenuItem) {
  return item.visible !== false && Boolean(item.image_url?.trim());
}


// -----------------------------------------------------------------------------
// Basic engine candidate: data filtering, price rendering, and grouping helpers
// -----------------------------------------------------------------------------

export function getDisplayName(site: PublicMenuTemplateProps["menuSite"]) {
  return site.restaurant_name || site.name || "ArtiMenu";
}


export function getMenuSiteSettings(site: PublicMenuTemplateProps["menuSite"]) {
  return site.settings && typeof site.settings === "object" && !Array.isArray(site.settings) ? (site.settings as Record<string, unknown>) : {};
}


export function shouldUseBrandLogo(site: PublicMenuTemplateProps["menuSite"], capabilities: TemplateCapabilities) {
  return Boolean(capabilities.brandLogo && capabilities.brandLogoReplacesName && site.logo_url && getMenuSiteSettings(site).logo_replaces_name === true);
}


export function getMenuDescriptionSizeClassName(density: MenuLayoutDensity) {
  return {
    spacious: "cafe-a-menu-description-size-spacious",
    default: "cafe-a-menu-description-size-default",
    compact: "cafe-a-menu-description-size-compact",
    ultraCompact: "cafe-a-menu-description-size-ultra-compact",
  }[density];
}
