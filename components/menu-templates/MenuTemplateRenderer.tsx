import { getTemplateDesignKey } from "@/lib/templates";

import DesignA from "./DesignA";
import DesignB from "./DesignB";
import DesignC from "./DesignC";
import type { PublicMenuTemplateProps } from "./types";

export default function MenuTemplateRenderer(props: PublicMenuTemplateProps) {
  const templateKey = getTemplateDesignKey(props.menuSite.template_key, props.menuSite.template_category);

  switch (templateKey) {
    case "design_b":
      return <DesignB {...props} />;
    case "design_c":
      return <DesignC {...props} />;
    case "design_a":
    default:
      return <DesignA {...props} />;
  }
}

export type { PublicMenuTemplateProps } from "./types";
