import { Coffee, Fish, LayoutGrid, Sandwich, UtensilsCrossed, Wine } from "lucide-react";
import type { CatalogIndustry } from "@/lib/catalog-designs";

const INDUSTRY_ICONS = {
  all: LayoutGrid,
  cafe_bakery: Coffee,
  restaurant_dining: UtensilsCrossed,
  japanese: Fish,
  pub_bar: Wine,
  quick_meal: Sandwich,
} satisfies Record<CatalogIndustry, typeof LayoutGrid>;

export default function CatalogIndustryIcon({ industry }: { industry: CatalogIndustry }) {
  const Icon = INDUSTRY_ICONS[industry];
  return <Icon aria-hidden="true" />;
}
