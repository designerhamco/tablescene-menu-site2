import type { CSSProperties } from "react";

import type { FontLoadAssets } from "@/lib/font-options";
import {
  getCustomTypographySettings,
  getEnglishFontLoadAssets,
  getKoreanFontLoadAssets,
  getTypographyCssVariables,
  mergeTypographySettings,
} from "@/lib/template-typography-presets";

export type PickupBoardTheme = {
  key: "summer_blue" | "neutral";
  templateKey: string;
  fontAssets: FontLoadAssets[];
  typographyStyle: Record<string, string | number>;
  palette: {
    canvas: string;
    surface: string;
    text: string;
    mutedText: string;
    accent: string;
    accentSoft: string;
    accentBorder: string;
    inverseText: string;
  };
};

type PickupBoardThemeDefinition = Pick<PickupBoardTheme, "key" | "palette">;

const NEUTRAL_THEME: PickupBoardThemeDefinition = {
  key: "neutral",
  palette: {
    canvas: "#F5F3EE",
    surface: "#FFFFFF",
    text: "#18181B",
    mutedText: "#71717A",
    accent: "#18181B",
    accentSoft: "#F4F4F5",
    accentBorder: "#D4D4D8",
    inverseText: "#FFFFFF",
  },
};

const PICKUP_BOARD_TEMPLATE_THEMES: Readonly<Record<string, PickupBoardThemeDefinition>> = {
  display_menu_a: {
    key: "summer_blue",
    palette: {
      canvas: "#EFF7F6",
      surface: "#FFFFFF",
      text: "#17211F",
      mutedText: "#5F6F6B",
      accent: "#007C89",
      accentSoft: "#D7F4F3",
      accentBorder: "#88DAD7",
      inverseText: "#FFFFFF",
    },
  },
};

function toSerializableTypographyStyle(style: CSSProperties) {
  return Object.entries(style).reduce<Record<string, string | number>>((result, [key, value]) => {
    if (typeof value === "string" || typeof value === "number") result[key] = value;
    return result;
  }, {});
}

export function resolvePickupBoardTheme({
  templateKey,
  settings,
  pageSettings,
}: {
  templateKey: string | null | undefined;
  settings?: unknown;
  pageSettings?: unknown;
}): PickupBoardTheme {
  const normalizedTemplateKey = templateKey?.trim() || "unknown";
  const definition = PICKUP_BOARD_TEMPLATE_THEMES[normalizedTemplateKey] ?? NEUTRAL_THEME;
  const customTypography = getCustomTypographySettings(settings, pageSettings);
  const typography = mergeTypographySettings(normalizedTemplateKey, customTypography);

  return {
    key: definition.key,
    templateKey: normalizedTemplateKey,
    palette: { ...definition.palette },
    typographyStyle: toSerializableTypographyStyle(
      getTypographyCssVariables(typography, normalizedTemplateKey),
    ),
    fontAssets: [
      getKoreanFontLoadAssets(typography.korean_font_key),
      getEnglishFontLoadAssets(typography.english_font_key),
    ],
  };
}
