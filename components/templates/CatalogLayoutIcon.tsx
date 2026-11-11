import { Album, LayoutGrid, List } from "@/app/components/ui/site-icon";
import type { CatalogLayoutFilter } from "@/lib/catalog-designs";

export default function CatalogLayoutIcon({ layout, className }: {
  layout: CatalogLayoutFilter;
  className?: string;
}) {
  const Glyph = layout === "all" ? LayoutGrid : layout === "list" ? List : Album;
  return <Glyph className={className} aria-hidden="true" data-catalog-layout-icon={layout} />;
}
