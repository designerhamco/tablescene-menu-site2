import { normalizeTemplateKey } from "@/lib/templates";
import PublicMenuExperienceShell from "@/components/public-menu/PublicMenuExperienceShell";

import BasicMenuTemplate from "./BasicMenuTemplate";
import CafeBrewChapterA from "./CafeBrewChapterA";
import CafeRoundFocusA from "./CafeRoundFocusA";
import CafeSundayLineA from "./CafeSundayLineA";
import CafeDesignA from "./CafeDesignA";
import CafeMochaForestA from "./CafeMochaForestA";
import DisplayMenuA from "./DisplayMenuA";
import DiningAubeTableA from "./DiningAubeTableA";
import MultiPageMenuEngine from "./multi-page/MultiPageMenuEngine";
import type { PublicMenuTemplateProps } from "./types";
import type { ReactNode } from "react";

export default function MenuTemplateRenderer(props: PublicMenuTemplateProps) {
  const templateKey = normalizeTemplateKey(props.menuSite.template_key, props.menuSite.template_category);
  const storeName = props.menuSite.restaurant_name || props.menuSite.business_name || props.menuSite.name;
  const withPublicMenuShell = (children: ReactNode) => (
    <PublicMenuExperienceShell
      templateKey={templateKey}
      storeName={storeName}
      currentLocale={props.locale}
      enabledLocales={props.enabledLocales}
      orderCallConfig={props.orderCallConfig}
    >
      {children}
    </PublicMenuExperienceShell>
  );

  switch (templateKey) {
    case "cafe_design_a":
      if (props.pagePresentation === "multi") {
        return withPublicMenuShell(<MultiPageMenuEngine {...props} />);
      }
      return withPublicMenuShell(<CafeDesignA {...props} />);
    case "cafe_mocha_forest_a":
      return withPublicMenuShell(<CafeMochaForestA {...props} />);
    case "cafe_sunday_line_a":
      return withPublicMenuShell(<CafeSundayLineA {...props} />);
    case "cafe_round_focus_a":
      return withPublicMenuShell(<CafeRoundFocusA {...props} />);
    case "cafe_brew_chapter_a":
      return withPublicMenuShell(<CafeBrewChapterA {...props} />);
    case "dining_aube_table_a":
      return withPublicMenuShell(<DiningAubeTableA {...props} />);
    case "cafe_noir_a":
      return withPublicMenuShell(<CafeDesignA {...props} />);
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
      return withPublicMenuShell(<BasicMenuTemplate {...props} />);
  }
}

export type { PublicMenuTemplateProps } from "./types";
