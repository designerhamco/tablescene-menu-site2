import Image from "next/image";

import { getTemplatePreviewRouteKey, type TemplateCatalogItem } from "@/lib/templates";
import { TemplateThumbnail } from "./TemplateCard";

const previewKeys = new Set([
  "cafe_real_matcha_a", "cafe_mocha_forest_a", "cafe_sunday_roasters_a",
  "cafe_van_gogh_a", "cafe_round_focus_a", "fast_food_loop_bagel_a",
  "restaurant_onue_a", "dining_aube_table_a", "dining_aube_table_b", "display_menu_a",
]);

export default function TemplateCatalogMedia({ template }: { template: TemplateCatalogItem }) {
  const key = getTemplatePreviewRouteKey(template.key);
  if (!previewKeys.has(key)) return <TemplateThumbnail template={template} />;

  return (
    <Image
      src={`/template-previews/${key}.jpg`}
      alt={`${template.name} 메뉴판 디자인`}
      width={1200}
      height={900}
      sizes="(min-width: 1600px) 410px, (min-width: 1280px) 28vw, (min-width: 1024px) 38vw, (min-width: 640px) 48vw, 100vw"
      className="site-catalog-image"
    />
  );
}
