import assert from "node:assert/strict";
import test from "node:test";
import { MENU_TEXT_COLOR_GROUPS, normalizeMenuTextColors, readMenuTextColors, setMenuTextColorsFromForm, getMutedMenuPriceColor } from "./menu-text-colors";
import { menuColorContrast } from "./menu-interaction-theme";
import { applyPreviewDesign, readPreviewDesign, serializePreviewDesign, previewDesignDefaults } from "./menu-preview-design";
import type { MenuPageData } from "./menu-page-data";

test("only the five registered color groups accept validated opaque colors", () => {
 assert.deepEqual(normalizeMenuTextColors({brand:"#abcdef",supporting:"url(evil)",product:42,unknown:"#ffffff"}),{brand:"#ABCDEF"});
 assert.deepEqual(normalizeMenuTextColors(null),{});
});
test("independent colors round-trip through submitted saved Design JSON, preserving older roles and content", () => {
 const roles={supporting:{color:"#112233"}},design:Record<string,unknown>={typographyRoles:roles,commonFonts:true,unknown:"keep"};
 const form=new FormData();form.set("text_colors_present","1");
 const colors=Object.fromEntries(MENU_TEXT_COLOR_GROUPS.map((key,i)=>[key,`#${String(i+1).repeat(6)}`]));
 for(const [key,value] of Object.entries(colors))form.set(`text_color_${key}`,value);
 setMenuTextColorsFromForm(design,form);
 assert.deepEqual(readMenuTextColors(JSON.parse(JSON.stringify({design}))),colors);
 assert.equal(design.typographyRoles,roles);assert.equal(design.unknown,"keep");
 const old=structuredClone(design);setMenuTextColorsFromForm(design,new FormData());assert.deepEqual(design,old);
 form.set("text_color_product","");setMenuTextColorsFromForm(design,form);
 assert.equal(readMenuTextColors({design}).product,undefined);assert.equal(readMenuTextColors({design}).supporting,colors.supporting);
 form.set("text_color_product","red");const snapshot=structuredClone(design);assert.throws(()=>setMenuTextColorsFromForm(design,form));assert.deepEqual(design,snapshot);
 const reset=new FormData();reset.set("text_colors_present","1");setMenuTextColorsFromForm(design,reset);assert.equal(design.textColors,undefined);assert.equal(design.typographyRoles,roles);
});
test("preview edits preserve source, legacy colors, font roles and other groups across serialized navigation", () => {
 const source={menuSite:{template_key:"cafe_design_a",settings:{},page_settings:{design:{typographyRoles:{supporting:{color:"#123456"}},textColors:{representative:"#FFFFFF"}}}},pageSettings:{},items:[{name:"고객 상품"}]} as unknown as MenuPageData;
 const snapshot=structuredClone(source);
 const value={textColors:{product:"#AA2255",supporting:"#2255AA"}};
 const result=applyPreviewDesign(source,readPreviewDesign(serializePreviewDesign(value)),false);
 assert.deepEqual(source,snapshot);assert.deepEqual(result.items,source.items);
 assert.deepEqual(readMenuTextColors(result.menuSite.page_settings),{representative:"#FFFFFF",product:"#AA2255",supporting:"#2255AA"});
 assert.deepEqual((result.menuSite.page_settings as {design:{typographyRoles:unknown}}).design.typographyRoles,(source.menuSite.page_settings as {design:{typographyRoles:unknown}}).design.typographyRoles);
});
test("original prices retain the price hue and stop fading when readable contrast requires it", () => {
 assert.equal(getMutedMenuPriceColor("#000000","#FFFFFF"),"#666666");
 assert.equal(getMutedMenuPriceColor("rgb(255, 255, 255)","#000000"),"#999999");
 for(const [ink,bg] of [["#191C1B","#FFFFFF"],["#FFF9EE","#852322"],["#713F36","#F7F2EA"],["#336699","#FFFFFF"]]) {
  const muted=getMutedMenuPriceColor(ink,bg);assert.ok(menuColorContrast(muted,bg)>=4.5);
  assert.ok(menuColorContrast(muted,bg)<=menuColorContrast(ink,bg)+.03);
 }
 assert.equal(getMutedMenuPriceColor("#EEEEEE","#FFFFFF"),"#eeeeee");
});

test("product color defaults follow name/price instead of the supporting description role", () => {
 const source={menuSite:{id:"preview",template_key:"cafe_design_a",settings:{},page_settings:{design:{typographyRoles:{itemName:{color:"#191C1B"},price:{color:"#191C1B"},supporting:{color:"#606561"}}}}},pageSettings:{}} as unknown as MenuPageData;
 const defaults=previewDesignDefaults(source);
 assert.equal(defaults.textColorDefaults.product,"#191C1B");
 assert.equal(defaults.textColorDefaults.representative,"#606561");
 assert.equal(defaults.textColorDefaults.supporting,"#606561");
});
