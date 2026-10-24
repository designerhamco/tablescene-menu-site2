"use client";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { useDefaultAlbum } from "../defaults/DefaultDesignScope";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import { isAubeTableTemplate } from "@/lib/aube-table";
import { menuAppearanceStyle, readMenuAppearance } from "@/lib/menu-appearance";
import { getMenuDesignBackgrounds } from "@/lib/template-background-colors";
import { menuColorContrast } from "@/lib/menu-interaction-theme";
import { getTypographyTitleColorOverrides } from "@/lib/template-typography-presets";
import { readPreviewChipColors, resolvePreviewChipColors } from "@/lib/menu-preview-chip-colors";
import { menuSurfaceRecord, readMenuSurfaceSettings } from "@/lib/menu-design-surfaces";
import { MENU_TEXT_COLOR_GROUPS, resolvedMenuTextColors } from "@/lib/menu-text-colors";
import { useRegularPriceColors } from "./useRegularPriceColors";
import styles from "./MenuAppearanceScope.module.css";
export default function MenuAppearanceScope({ pageSettings, templateKey, children }: { pageSettings: unknown; templateKey: string; children: ReactNode }) {
  const album = useDefaultAlbum(), basic = getTemplateCapabilities(templateKey).menuCover.coverMode === "section";
  const supportsShapes = basic || isAubeTableTemplate(templateKey);
  const scopeRef = useRef<HTMLDivElement>(null);
  const textColors = resolvedMenuTextColors(pageSettings);
  useRegularPriceColors(scopeRef, JSON.stringify(pageSettings), basic);
  const textColorStyle = Object.fromEntries(MENU_TEXT_COLOR_GROUPS.filter(group => textColors[group]).map(group => [`--menu-text-${group}`, textColors[group]]));
  const appearance = readMenuAppearance(pageSettings);
  const surfaces = readMenuSurfaceSettings(pageSettings);
  const alignment = basic ? surfaces.representativeAlignment : undefined;
  const previewChipColors = resolvePreviewChipColors(readPreviewChipColors(menuSurfaceRecord(menuSurfaceRecord(pageSettings).design).previewChipColors));
  const chipColorStyle = {
    ...(previewChipColors.generalBackground ? { "--menu-preview-chip-bg": previewChipColors.generalBackground } : {}),
    ...(previewChipColors.generalText ? { "--menu-preview-chip-text": previewChipColors.generalText } : {}),
    ...(previewChipColors.saleBackground ? { "--menu-preview-sale-chip-bg": previewChipColors.saleBackground } : {}),
    ...(previewChipColors.saleText ? { "--menu-preview-sale-chip-text": previewChipColors.saleText } : {}),
  };
  const backgrounds = getMenuDesignBackgrounds(templateKey,pageSettings);
  const titleColors = getTypographyTitleColorOverrides(templateKey,pageSettings);
  const sidebarInk = backgrounds.sidebar && menuColorContrast(backgrounds.sidebar,"#ffffff") >= 4.5 ? "#ffffff" : "#191c1b";
  const style = { ...textColorStyle, ...chipColorStyle, ...menuAppearanceStyle(appearance,supportsShapes,album), ...(alignment ? {"--menu-representative-align":alignment,"--menu-representative-justify":alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center","--menu-representative-logo-start":alignment === "left" ? "0px" : "auto","--menu-representative-logo-end":alignment === "right" ? "0px" : "auto"}:{}), ...(isAubeTableTemplate(templateKey) && surfaces.coverDescriptionColor ? {"--menu-cover-description-ink":surfaces.coverDescriptionColor}:{}), ...(titleColors.brand ? {"--menu-design-brand-ink":titleColors.brand}:{}), ...(titleColors.category ? {"--menu-design-category-ink":titleColors.category}:{}), ...(backgrounds.page ? {"--menu-design-page-bg":backgrounds.page}:{}), ...(backgrounds.auxiliary ? {"--menu-design-aux-bg":backgrounds.auxiliary}:{}), ...(backgrounds.sidebar ? {"--menu-design-sidebar-bg":backgrounds.sidebar,"--menu-design-sidebar-ink":sidebarInk}:{}) } as CSSProperties;
  return <div ref={scopeRef} className={styles.scope}
    data-text-color-brand={supportsShapes && textColors.brand ? "custom" : undefined} data-text-color-category={supportsShapes && textColors.category ? "custom" : undefined}
    data-text-color-product={supportsShapes && textColors.product ? "custom" : undefined} data-text-color-representative={supportsShapes && textColors.representative ? "custom" : undefined} data-text-color-supporting={supportsShapes && textColors.supporting ? "custom" : undefined} data-text-color-information={supportsShapes && textColors.information ? "custom" : undefined} style={style} data-menu-appearance-basic={basic ? "true" : undefined} data-representative-align={alignment} data-cover-description-ink={isAubeTableTemplate(templateKey) && surfaces.coverDescriptionColor ? "custom" : undefined}
    data-preview-chip-background={previewChipColors.generalBackground ? "custom" : undefined} data-preview-chip-text={previewChipColors.generalText ? "custom" : undefined}
    data-preview-sale-chip-background={previewChipColors.saleBackground ? "custom" : undefined} data-preview-sale-chip-text={previewChipColors.saleText ? "custom" : undefined}
    data-design-brand-ink={supportsShapes && titleColors.brand ? "custom" : undefined} data-design-category-ink={supportsShapes && titleColors.category ? "custom" : undefined}
    data-design-page-background={supportsShapes && backgrounds.page ? "custom" : undefined} data-design-aux-background={basic && backgrounds.auxiliary ? "custom" : undefined} data-design-colored-panel={basic && backgrounds.coloredPanel ? "true" : undefined} data-design-sidebar-background={!basic && backgrounds.sidebar ? "custom" : undefined}
    data-radius-cover={basic && appearance.imageRadii.cover != null ? "custom" : undefined} data-radius-item={supportsShapes && appearance.imageRadii.item != null ? "custom" : undefined}
    data-radius-widget={supportsShapes && appearance.imageRadii.widget != null ? "custom" : undefined} data-radius-logo={supportsShapes && appearance.imageRadii.logo != null ? "custom" : undefined}
    data-chip-shape={supportsShapes && appearance.chipShape !== "template" ? appearance.chipShape : undefined} data-album-image-ratio={album ? appearance.albumImageRatio : undefined}>{children}</div>;
}
