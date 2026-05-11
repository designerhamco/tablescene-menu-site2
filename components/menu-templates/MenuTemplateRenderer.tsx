import { normalizeTemplateKey } from "@/lib/templates";

import BasicMenuTemplate from "./BasicMenuTemplate";
import CafeDesignA from "./CafeDesignA";
import type { PublicMenuTemplateProps } from "./types";

export default function MenuTemplateRenderer(props: PublicMenuTemplateProps) {
  const templateKey = normalizeTemplateKey(props.menuSite.template_key, props.menuSite.template_category);

  switch (templateKey) {
    case "cafe_design_a":
      return <CafeDesignA {...props} />;
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
      return <BasicMenuTemplate {...props} />;
  }
}

export type { PublicMenuTemplateProps } from "./types";
