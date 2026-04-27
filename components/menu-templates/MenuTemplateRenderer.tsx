import type { TemplateKey } from "@/lib/templates";

import DesignA from "./DesignA";
import DesignB from "./DesignB";
import DesignC from "./DesignC";
import type { PublicMenuTemplateProps } from "./types";

function isTemplateKey(value: string): value is TemplateKey {
  return value === "design_a" || value === "design_b" || value === "design_c";
}

export default function MenuTemplateRenderer(props: PublicMenuTemplateProps) {
  const templateKey = isTemplateKey(props.menuSite.template_key) ? props.menuSite.template_key : "design_a";

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
