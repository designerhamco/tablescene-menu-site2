"use client";
import type { CSSProperties, ReactNode } from "react";
import { useDefaultAlbum } from "../defaults/DefaultDesignScope";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import { isAubeTableTemplate } from "@/lib/aube-table";
import { menuAppearanceStyle, readMenuAppearance } from "@/lib/menu-appearance";
import { getMenuDesignBackgrounds } from "@/lib/template-background-colors";
import { menuColorContrast } from "@/lib/menu-interaction-theme";
import { getTypographyTitleColorOverrides } from "@/lib/template-typography-presets";
import styles from "./MenuAppearanceScope.module.css";
export default function MenuAppearanceScope({ pageSettings, templateKey, children }: { pageSettings: unknown; templateKey: string; children: ReactNode }) {
  const album = useDefaultAlbum(), basic = getTemplateCapabilities(templateKey).menuCover.coverMode === "section";
  const supportsShapes = basic || isAubeTableTemplate(templateKey);
  const appearance = readMenuAppearance(pageSettings);
  const backgrounds = getMenuDesignBackgrounds(templateKey,pageSettings);
  const titleColors = getTypographyTitleColorOverrides(templateKey,pageSettings);
  const sidebarInk = backgrounds.sidebar && menuColorContrast(backgrounds.sidebar,"#ffffff") >= 4.5 ? "#ffffff" : "#191c1b";
  const style = { ...menuAppearanceStyle(appearance,supportsShapes,album), ...(titleColors.brand ? {"--menu-design-brand-ink":titleColors.brand}:{}), ...(titleColors.category ? {"--menu-design-category-ink":titleColors.category}:{}), ...(backgrounds.page ? {"--menu-design-page-bg":backgrounds.page}:{}), ...(backgrounds.auxiliary ? {"--menu-design-aux-bg":backgrounds.auxiliary}:{}), ...(backgrounds.sidebar ? {"--menu-design-sidebar-bg":backgrounds.sidebar,"--menu-design-sidebar-ink":sidebarInk}:{}) } as CSSProperties;
  return <div className={styles.scope} style={style} data-menu-appearance-basic={basic ? "true" : undefined}
    data-design-brand-ink={supportsShapes && titleColors.brand ? "custom" : undefined} data-design-category-ink={supportsShapes && titleColors.category ? "custom" : undefined}
    data-design-page-background={supportsShapes && backgrounds.page ? "custom" : undefined} data-design-aux-background={basic && backgrounds.auxiliary ? "custom" : undefined} data-design-colored-panel={basic && backgrounds.coloredPanel ? "true" : undefined} data-design-sidebar-background={!basic && backgrounds.sidebar ? "custom" : undefined}
    data-radius-cover={supportsShapes && appearance.imageRadii.cover != null ? "custom" : undefined} data-radius-item={supportsShapes && appearance.imageRadii.item != null ? "custom" : undefined}
    data-radius-widget={supportsShapes && appearance.imageRadii.widget != null ? "custom" : undefined} data-radius-logo={supportsShapes && appearance.imageRadii.logo != null ? "custom" : undefined}
    data-chip-shape={supportsShapes && appearance.chipShape !== "template" ? appearance.chipShape : undefined} data-album-image-ratio={album ? appearance.albumImageRatio : undefined}>{children}</div>;
}
