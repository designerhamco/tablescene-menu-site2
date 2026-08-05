import { normalizeTemplateKey } from "@/lib/templates";
import PublicMenuExperienceShell from "@/components/public-menu/PublicMenuExperienceShell";

import BasicMenuTemplate from "./BasicMenuTemplate";
import CafeBrewChapterA from "./CafeBrewChapterA";
import CafeRoundFocusA from "./CafeRoundFocusA";
import CafeSundayLineA from "./CafeSundayLineA";
import CafeDesignA from "./CafeDesignA";
import CafeMochaForestA from "./CafeMochaForestA";
import DisplayMenuA from "./DisplayMenuA";
import MultiPageMenuEngine from "./multi-page/MultiPageMenuEngine";
import type { PublicMenuTemplateProps } from "./types";

export default function MenuTemplateRenderer(props: PublicMenuTemplateProps) {
  const templateKey = normalizeTemplateKey(props.menuSite.template_key, props.menuSite.template_category);
  const storeName = props.menuSite.restaurant_name || props.menuSite.business_name || props.menuSite.name;

  switch (templateKey) {
    case "cafe_design_a":
      if (props.pagePresentation === "multi") {
        return (
          <PublicMenuExperienceShell templateKey={templateKey} storeName={storeName}>
            <MultiPageMenuEngine {...props} />
          </PublicMenuExperienceShell>
        );
      }
      return (
        <PublicMenuExperienceShell templateKey={templateKey} storeName={storeName}>
          <CafeDesignA {...props} />
        </PublicMenuExperienceShell>
      );
    case "cafe_mocha_forest_a":
      return (
        <PublicMenuExperienceShell templateKey={templateKey} storeName={storeName}>
          <CafeMochaForestA {...props} />
        </PublicMenuExperienceShell>
      );
    case "cafe_sunday_line_a":
      return (
        <PublicMenuExperienceShell templateKey={templateKey} storeName={storeName}>
          <CafeSundayLineA {...props} />
        </PublicMenuExperienceShell>
      );
    case "cafe_round_focus_a":
      return (
        <PublicMenuExperienceShell templateKey={templateKey} storeName={storeName}>
          <CafeRoundFocusA {...props} />
        </PublicMenuExperienceShell>
      );
    case "cafe_brew_chapter_a":
      return (
        <PublicMenuExperienceShell templateKey={templateKey} storeName={storeName}>
          <CafeBrewChapterA {...props} />
        </PublicMenuExperienceShell>
      );
    case "cafe_noir_a":
      return (
        <PublicMenuExperienceShell templateKey={templateKey} storeName={storeName}>
          <CafeDesignA {...props} />
        </PublicMenuExperienceShell>
      );
    case "display_menu_a":
      return <DisplayMenuA {...props} />;
    case "cafe_design_b":
    case "cafe_design_c":
    case "fine_dining_design_a":
    case "fine_dining_design_b":
    case "casual_dining_design_a":
    case "casual_dining_design_b":
    case "fast_food_design_a":
    case "fast_food_design_b":
    case "brunch_design_a":
    case "brunch_design_b":
    default:
      return (
        <PublicMenuExperienceShell templateKey={templateKey} storeName={storeName}>
          <BasicMenuTemplate {...props} />
        </PublicMenuExperienceShell>
      );
  }
}

export type { PublicMenuTemplateProps } from "./types";
