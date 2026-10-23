import assert from "node:assert/strict";
import test from "node:test";
import {applyPreviewDesign,readPreviewDesign,serializePreviewDesign,previewDesignDefaults} from "./menu-preview-design";
import {buildTemplatePreviewUrl} from "./menu-preview-devices";
import {readPreviewChipColors,resolvePreviewChipColors} from "./menu-preview-chip-colors";
import {getMenuDesignBackgrounds} from "./template-background-colors";
import {getCustomTypographySettings,mergeTypographySettings,getTypographyTitleColorOverrides,withCommonTypographyFonts,normalizeTypographyRoleSettings} from "./template-typography-presets";
import type {MenuPageData} from "./menu-page-data";
const fixture=()=>({menuSite:{template_key:"cafe_design_a",settings:{},page_settings:{design:{appearance:{imageRadii:{logo:4},chipShape:"soft",albumImageRatio:"1:1"}},unrelated:"keep"}},pageSettings:{multi_page_cover_background_color:"#ffffff"},items:[{id:"saved-item",name:"고객 메뉴"}]} as unknown as MenuPageData);
test("preview design accepts only registered fonts, colors, bounded image radii and shape choices",()=>{
 assert.deepEqual(readPreviewDesign('{bad'),{});assert.deepEqual(readPreviewDesign('x'.repeat(4001)),{});
 assert.deepEqual(readPreviewDesign({pageBackground:'url(javascript:bad)',auxiliaryBackground:'#abcdef',imageRadii:{item:33,logo:0,cover:1.5},fonts:{brand:{ko:'unknown',en:'unknown',color:'#234567'},other:{ko:'pretendard'}},chipShape:'bad',albumImageRatio:'16:9',unknown:'bad'}),{auxiliaryBackground:'#ABCDEF',fontFamily:{ko:'pretendard'},fonts:{brand:{color:'#234567'}},imageRadii:{logo:0}});
});
test("catalog design is isolated and uses the shared saved Design configuration",()=>{
 const original=fixture(),snapshot=structuredClone(original);
 const result=applyPreviewDesign(original,{pageBackground:'#123456',auxiliaryBackground:'#eeeeee',coverBackground:'#654321',sidebarBackground:'#999999',fonts:{category:{ko:'noto-serif-kr',en:'carme',color:'#987654'},other:{ko:'noto-serif-kr',en:'carme'}},imageRadii:{item:12},chipShape:'pill',albumImageRatio:'4:5'},true);
 assert.deepEqual(original,snapshot);assert.deepEqual(result.items,original.items);assert.equal(result.pageSettings.multi_page_cover_background_color,'#654321');
 const backgrounds=getMenuDesignBackgrounds('cafe_design_a',result.menuSite.page_settings);assert.equal(backgrounds.page,'#123456');assert.equal(backgrounds.auxiliary,'#EEEEEE');assert.equal(backgrounds.sidebar,'#999999');assert.equal(backgrounds.coloredPanel,true);
 const typography=mergeTypographySettings('cafe_design_a',getCustomTypographySettings(result.menuSite.settings,result.menuSite.page_settings));assert.equal(typography.korean_font_key,'noto-serif-kr');assert.equal(typography.typography_roles.brand.font_ko_key,null);assert.equal(typography.korean_font_key,'noto-serif-kr');assert.equal(typography.english_font_key,'carme');assert.equal(typography.typography_roles.category.font_en_key,null);assert.equal(typography.typography_roles.price.font_en_key,null);
 const page=result.menuSite.page_settings as {design:{appearance:{imageRadii:{logo:number;item:number};albumImageRatio:string}}};assert.equal(page.design.appearance.imageRadii.logo,4);assert.equal(page.design.appearance.imageRadii.item,12);assert.equal(page.design.appearance.albumImageRatio,'4:5');
 assert.equal((applyPreviewDesign(original,{albumImageRatio:'5:4'},false).menuSite.page_settings as typeof page).design.appearance.albumImageRatio,'1:1');
});
test("absent overrides preserve identity and equal panel/page colors release colored geometry",()=>{const original=fixture();assert.equal(applyPreviewDesign(original,{},false),original);assert.equal(getMenuDesignBackgrounds('cafe_design_a',{design:{backgroundColor:'#abcdef',auxiliaryBackgroundColor:'#ABCDEF'}}).coloredPanel,false);assert.equal(getMenuDesignBackgrounds('cafe_mocha_forest_a',{design:{auxiliaryBackgroundColor:'#F4EDDC'}}).coloredPanel,false);const display=fixture();display.menuSite.template_key='display_menu_a';assert.equal(applyPreviewDesign(display,{pageBackground:'#123456'},false),display);});
test("design values survive feature/device/detached links while option tabs stay outside the iframe URL",()=>{const design=serializePreviewDesign({fonts:{category:{en:'carme'}},imageRadii:{item:12},pageBackground:'#123456'});for(const actual of [false,true]){const url=new URL(buildTemplatePreviewUrl('cafe_design_a',{designPreview:design,previewOptions:'design',imagesPreview:'on'},{device:'tablet',orientation:'portrait',actual}),'https://example.test');assert.equal(url.searchParams.get('designPreview'),design);assert.equal(url.searchParams.get('previewOptions'),actual?null:'design');assert.equal(url.searchParams.get('imagesPreview'),'on');assert.equal(url.searchParams.get('orientation'),'portrait');}});
test("native contrast defaults remain intact while explicit title color edits win",()=>{assert.deepEqual(getTypographyTitleColorOverrides('restaurant_onue_a',{design:{typographyRoles:{brand:{color:'#FFF9EE'},category:{color:'#713F36'}}}}),{});assert.deepEqual(getTypographyTitleColorOverrides('cafe_van_gogh_a',{design:{typographyRoles:{brand:{color:'#172A60'},category:{color:'#704020'}}}}),{brand:'#172A60',category:'#704020'});});
test("font-only preview edits preserve automatic cover title contrast",()=>{const original=fixture();original.menuSite.settings={typography:{typography_roles:{brand:{color:'#191c1b'}}}};const result=applyPreviewDesign(original,{fonts:{other:{en:'carme'},category:{en:'mogra'}}},false);assert.deepEqual(getTypographyTitleColorOverrides('cafe_design_a',result.menuSite.page_settings),{});});


test("preview chip colors validate independently, survive navigation and never mutate customer data", () => {
 const chipColors={generalBackground:"#123456",generalText:"#ffffff",saleBackground:"#abcdef",saleText:"#191c1b"};
 assert.deepEqual(readPreviewChipColors({...chipColors,unknown:"#000000"}),{generalBackground:"#123456",generalText:"#FFFFFF",saleBackground:"#ABCDEF",saleText:"#191C1B"});
 assert.deepEqual(readPreviewChipColors({generalBackground:"url(evil)",saleText:"red",generalText:1}),{});
 const original=fixture(),snapshot=structuredClone(original);
 const result=applyPreviewDesign(original,{chipColors},false);
 assert.deepEqual(original,snapshot);
 assert.deepEqual(result.items,original.items);
 assert.deepEqual((result.menuSite.page_settings as unknown as {design:{previewChipColors:unknown}}).design.previewChipColors,readPreviewChipColors(chipColors));
 const encoded=serializePreviewDesign({chipColors});
 for(const actual of [false,true]){
  const link=new URL(buildTemplatePreviewUrl("cafe_design_a",{designPreview:encoded},{device:"mobile",actual}),"https://example.test");
  assert.deepEqual(readPreviewDesign(link.searchParams.get("designPreview")).chipColors,readPreviewChipColors(chipColors));
 }
 assert.equal(resolvePreviewChipColors({generalBackground:"#FFFFFF"}).generalText,"#191C1B");
 assert.equal(resolvePreviewChipColors({saleBackground:"#000000"}).saleText,"#FFF8EA");
 assert.equal(resolvePreviewChipColors({saleBackground:"#000000",saleText:"#ABCDEF"}).saleText,"#ABCDEF");
});

test("absent auxiliary color stays distinct from explicit white and native panels", () => {
 const data=fixture();data.menuSite.id="preview";
 assert.equal(previewDesignDefaults(data).colors.auxiliary,null);
 assert.equal(previewDesignDefaults(applyPreviewDesign(data,{pageBackground:"#EED2D2"},false)).colors.auxiliary,null);
 const white=applyPreviewDesign(data,{auxiliaryBackground:"#FFFFFF"},false);
 assert.equal(previewDesignDefaults(white).colors.auxiliary,"#FFFFFF");
 data.menuSite.template_key="cafe_mocha_forest_a";
 assert.equal(previewDesignDefaults(data).colors.auxiliary,"#852322");
 data.menuSite.template_key="cafe_round_focus_a";
 assert.notEqual(previewDesignDefaults(data).colors.auxiliary,null);
});


test("common font selection clears legacy face overrides while retaining role appearance", () => {
 const legacy=normalizeTypographyRoleSettings({brand:{font_ko_key:"jua",font_en_key:"mogra",color:"#123456",weight:"bold",size:"large"},category:{font_en_key:"carme",color:"#654321"}});
 const snapshot=structuredClone(legacy), common=withCommonTypographyFonts(legacy);
 assert.deepEqual(legacy,snapshot);
 for(const role of Object.keys(common) as (keyof typeof common)[]) {
  assert.equal(common[role].font_ko_key,null);assert.equal(common[role].font_en_key,null);
  assert.equal(common[role].color,legacy[role].color);assert.equal(common[role].size,legacy[role].size);assert.equal(common[role].weight,legacy[role].weight);
 }
 const source=fixture();source.menuSite.settings={typography:{typography_roles:legacy}};
 const saved=applyPreviewDesign(source,{fontFamily:{ko:"pretendard",en:"alata"}},false);
 const reloaded=mergeTypographySettings("cafe_design_a",getCustomTypographySettings(JSON.parse(JSON.stringify(saved.menuSite.settings)),JSON.parse(JSON.stringify(saved.menuSite.page_settings))));
 assert.equal(reloaded.english_font_key,"alata");assert.equal(reloaded.korean_font_key,"pretendard");
 assert.equal(reloaded.typography_roles.brand.font_en_key,null);assert.equal(reloaded.typography_roles.category.font_en_key,null);
 assert.equal(reloaded.typography_roles.brand.color,"#123456");
 assert.equal(mergeTypographySettings("cafe_design_a",getCustomTypographySettings(source.menuSite.settings,{})).typography_roles.brand.font_en_key,"mogra");
});
