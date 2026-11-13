/** Public designer-template titles; independent from editable customer store names. */
export const CATALOG_TEMPLATE_NAMES: Readonly<Record<string, { english: string; korean: string }>> = {
  cafe_design_a: { english: "REAL MATCHA", korean: "리얼맛차" },
  cafe_mocha_forest_a: { english: "MELLOW", korean: "멜로우" },
  cafe_sunday_line_a: { english: "MELLO CREMA", korean: "멜로크레마" },
  cafe_van_gogh_a: { english: "VAN GOGH", korean: "반고흐" },
  cafe_round_focus_a: { english: "ROSY ORANGE", korean: "로지오렌지" },
  fast_food_loop_bagel_a: { english: "LOOP BAGEL", korean: "루프베이글" },
  restaurant_onue_a: { english: "ONUE TABLE", korean: "온유 테이블" },
  dining_aube_table_a: { english: "AUBE TABLE", korean: "오브 테이블" },
  dining_aube_table_b: { english: "MAISON MARAIS", korean: "메종 마레" },
  display_menu_a: { english: "SUMMER BLUE", korean: "썸머 블루" },
};

export function getCatalogTemplateName(templateKey: string, fallback: string) {
  const name = CATALOG_TEMPLATE_NAMES[templateKey];
  return name ? `${name.english}(${name.korean})` : fallback;
}
