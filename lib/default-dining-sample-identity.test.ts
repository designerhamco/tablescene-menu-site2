import { getStandardDesignSampleTemplateKey } from "./standard-design-copy";
import assert from "node:assert/strict";
import test from "node:test";
import { getStarterPreset } from "./menu-starter-presets";
import { getDefaultDesignReview } from "./menu-design-policy";
import { buildDefaultDesignPreview } from "./default-design-preview";
import type { MenuPageData } from "./menu-page-data";

for (const id of ["dining-sidebar", "dining-sidebar-album"] as const) {
  for (const locale of ["ko", "en", "zh", "ja"] as const) {
    test(`${id}/${locale}: use the approved shared Dining sample and neutral identity`, () => {
      const design = getDefaultDesignReview(id,"dining_aube_table_b")!;
      const preset = getStarterPreset(getStandardDesignSampleTemplateKey(design));
      const categories = preset.pages.flatMap((page, pageIndex) => page.categories.map((category, index) => ({...category,id:`category-${pageIndex}-${index}`,menu_page_id:`page-${pageIndex}`,priceColumns:[]})));
      const items = categories.flatMap(category => category.items.map((item,index)=>({...item,id:`${category.id}-item-${index}`,category_id:category.id,priceColumnValues:[]})));
      const source = {locale,menuSite:{template_key:"dining_aube_table_b",settings:{},page_settings:{}},pageSettings:{},pages:preset.pages.map((page,index)=>({...page,id:`page-${index}`})),categories,items,featuredSlides:[],timeSales:[],priceOptions:[],widgets:[],traits:[],events:[],chefs:[],socialLinks:[]} as unknown as MenuPageData;
      const data = buildDefaultDesignPreview(source, design);
      assert.ok(data.items.every(item=>item.set_name),"all neutral sidebar items have English secondary names");
      const copy = JSON.stringify({pages:data.pages.map(p=>({title:p.title,description:p.description})),categories:data.categories.map(c=>({name:c.name,description:c.description}))});
      assert.doesNotMatch(copy,/메종 마레|오브 테이블|Maison Marais|Aube Table|Marais evening|马雷晚宴|マレ・イブニング/i);
      if (locale === "en") {
        assert.doesNotMatch(copy,/[가-힣]/,"translation must follow the approved shared menu sample");
        assert.equal(data.items[0].name,"Amuse-bouche");
      }
    });
  }
}

test("both Dining basic layouts create the same approved samples without changing Maison Marais", () => {
  const native = structuredClone(getStarterPreset("dining_aube_table_b"));
  const full = getStarterPreset("dining_aube_table_a", null, null, "dining-full-page");
  const side = getStarterPreset("dining_aube_table_b", null, null, "dining-sidebar");
  assert.deepEqual(side.pages, full.pages);
  assert.equal(side.pages[0].categories[0].course_price, 185000);
  assert.equal(side.template_key, "dining_aube_table_b");
  assert.deepEqual(getStarterPreset("dining_aube_table_b"), native);
});
