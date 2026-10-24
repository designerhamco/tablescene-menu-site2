import assert from "node:assert/strict";
import test from "node:test";
import { MENU_TEXT_COLOR_GROUPS, resolvedMenuTextColors, normalizeMenuTextColors, readMenuTextColors, setMenuTextColorsFromForm, getMutedMenuPriceColor } from "./menu-text-colors";
import { menuColorContrast } from "./menu-interaction-theme";
import { applyPreviewDesign, readPreviewDesign, serializePreviewDesign, previewDesignDefaults } from "./menu-preview-design";
import type { MenuPageData } from "./menu-page-data";

test("only the six registered color groups accept validated opaque colors", () => {
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
 const reset=new FormData();reset.set("text_colors_present","1");for(const group of MENU_TEXT_COLOR_GROUPS)reset.set(`text_color_${group}`,"");setMenuTextColorsFromForm(design,reset);assert.equal(design.textColors,undefined);assert.equal(design.typographyRoles,roles);
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


test("price-note labels stay distinct from real options even when their displayed text is identical", async () => {
 const {getItemPriceTokensForCategory}=await import("../components/menu-templates/shared/cafe-menu-pricing");
 const item={id:"item",price:5,price_label:null,price_visible:true,priceNote:"HOT",priceColumnValues:[]} as unknown as import("../components/menu-templates/types").PublicMenuItem;
 const category={priceColumns:[]} as unknown as import("../components/menu-templates/types").PublicMenuCategory;
 const capabilities={priceOptions:true,maxPriceOptionsPerItem:3} as import("./template-capabilities").TemplateCapabilities;
 const option={id:"option",menu_item_id:"item",label:"HOT",price:6,price_label:null,visible:true,sort_order:0};
 const note=getItemPriceTokensForCategory(item,category,[],capabilities);
 assert.equal(note.priceTokens[0].label,"HOT");assert.equal(note.priceTokens[0].labelKind,"note");
 const actual=getItemPriceTokensForCategory(item,category,[option],capabilities);
 assert.equal(actual.priceTokens[0].label,"HOT");assert.equal(actual.priceTokens[0].labelKind,"option");
 const hidden=getItemPriceTokensForCategory(item,category,[{...option,visible:false}],capabilities);
 assert.equal(hidden.priceTokens[0].labelKind,"note");
 const columns=getItemPriceTokensForCategory({...item,priceColumnValues:[{id:"value",priceColumnId:"hot",price:7,priceLabel:null,visible:true}]},{...category,priceColumns:[{id:"hot",categoryId:"category",key:"hot",label:"HOT",sortOrder:0,visible:true}]},[],capabilities);
 assert.equal(columns.usesPriceColumns,true);assert.equal(columns.priceTokens[0].labelKind,"option");
 assert.equal(item.priceNote,"HOT");assert.deepEqual(item.priceColumnValues,[]);
});


test("notice and widget colors split independently while existing combined saved colors stay intact", () => {
 const legacy={design:{textColors:{supporting:"#2255AA"}}};
 assert.deepEqual(resolvedMenuTextColors(legacy),{supporting:"#2255AA",information:"#2255AA"});
 const design:Record<string,unknown>={...legacy.design};
 const form=new FormData();form.set("text_colors_present","1");form.set("text_color_supporting","#AA2255");form.set("text_color_information","");
 setMenuTextColorsFromForm(design,form);
 assert.equal(design.textColorGroupsVersion,2);
 assert.deepEqual(resolvedMenuTextColors({design}),{supporting:"#AA2255"});
 form.set("text_color_information","#246824");setMenuTextColorsFromForm(design,form);
 assert.deepEqual(resolvedMenuTextColors({design}),{supporting:"#AA2255",information:"#246824"});
 const olderForm=new FormData();olderForm.set("text_colors_present","1");olderForm.set("text_color_supporting","#123456");setMenuTextColorsFromForm(design,olderForm);
 assert.equal(readMenuTextColors({design}).information,"#246824");
 const source={menuSite:{template_key:"cafe_design_a",settings:{},page_settings:{}},pageSettings:{}} as unknown as MenuPageData;
 const preview=applyPreviewDesign(source,readPreviewDesign(serializePreviewDesign({textColorGroupsVersion:2,textColors:{supporting:"#AA2255",information:"#246824"}})),false);
 assert.deepEqual(resolvedMenuTextColors(preview.menuSite.page_settings),{supporting:"#AA2255",information:"#246824"});
 assert.deepEqual(source.menuSite.page_settings,{});
 const native=applyPreviewDesign(source,{textColorGroupsVersion:2,textColors:{supporting:"#AA2255"}},false);
 assert.equal(resolvedMenuTextColors(native.menuSite.page_settings).information,undefined);
});
