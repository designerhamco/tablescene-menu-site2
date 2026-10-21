"use client";
import type { ReactNode } from "react";
import { useDefaultAlbum } from "../defaults/DefaultDesignScope";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import { isAubeTableTemplate } from "@/lib/aube-table";
import { menuAppearanceStyle, readMenuAppearance } from "@/lib/menu-appearance";
import styles from "./MenuAppearanceScope.module.css";
export default function MenuAppearanceScope({ pageSettings, templateKey, children }: { pageSettings: unknown; templateKey: string; children: ReactNode }) {
  const album = useDefaultAlbum(), basic = getTemplateCapabilities(templateKey).menuCover.coverMode === "section";
  const supportsShapes = basic || isAubeTableTemplate(templateKey);
  const appearance = readMenuAppearance(pageSettings);
  return <div className={styles.scope} style={menuAppearanceStyle(appearance,supportsShapes,album)} data-menu-appearance-basic={basic ? "true" : undefined}
    data-radius-cover={supportsShapes && appearance.imageRadii.cover != null ? "custom" : undefined} data-radius-item={supportsShapes && appearance.imageRadii.item != null ? "custom" : undefined}
    data-radius-widget={supportsShapes && appearance.imageRadii.widget != null ? "custom" : undefined} data-radius-logo={supportsShapes && appearance.imageRadii.logo != null ? "custom" : undefined}
    data-chip-shape={supportsShapes && appearance.chipShape !== "template" ? appearance.chipShape : undefined} data-album-image-ratio={album ? appearance.albumImageRatio : undefined}>{children}</div>;
}
