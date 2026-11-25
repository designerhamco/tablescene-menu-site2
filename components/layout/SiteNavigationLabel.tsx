import { Badge } from "@/app/components/ui/badge";
import type { SiteNavItem } from "@/lib/site-navigation";

/** Keep navigation accessories beside the label in both the header and full menu. */
export default function SiteNavigationLabel({ item }: { item: SiteNavItem }) {
  return <span className="site-nav-label"><span>{item.label}</span>{item.chip ? <Badge tone={item.chip.tone}>{item.chip.label}</Badge> : null}</span>;
}
