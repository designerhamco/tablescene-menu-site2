import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import MenuAppearanceSettingsForm from "../components/mypage/menu-editor/MenuAppearanceSettingsForm";
import PreviewDesignOptions from "../components/menu/PreviewDesignOptions";
import { buildTemplatePreviewUrl } from "./menu-preview-devices";
import { IMAGE_RADIUS_KEYS, IMAGE_RADIUS_PRESETS, imageRadiusPreset, menuAppearanceFromForm, menuAppearancePreview, menuAppearanceStyle, normalizeMenuAppearance, readMenuAppearance } from "./menu-appearance";
function form(radii: Record<string,string> = {}) { const f=new FormData(); f.set("menu_appearance_present","1"); f.set("chip_shape","template"); f.set("album_image_ratio","1:1");for(const [key,value]of Object.entries(radii))f.set(`image_radius_${key}`,value);return f; }
test("absent appearance leaves every native radius and chip shape in control",()=>{const a=readMenuAppearance({design:{backgroundColor:'#123456'}});assert.deepEqual(a.imageRadii,{});assert.equal(a.chipShape,'template');assert.deepEqual(menuAppearanceStyle(a,true,false),{});assert.equal(menuAppearanceFromForm(new FormData()),undefined);});
test("appearance round-trips zero and maximum radii through the saved JSON without modifying unrelated design",()=>{const f=form({item:'0',cover:'32',advertisement:'16',widget:'8',logo:'4'});f.set('chip_shape','pill');f.set('album_image_ratio','4:5');const appearance=menuAppearanceFromForm(f)!;const original={design:{backgroundColor:'#abcdef',typographyRoles:{supporting:{color:'#345678'}}},other:{enabled:true}};const saved={...original,design:{...original.design,appearance}};assert.deepEqual(readMenuAppearance(JSON.parse(JSON.stringify(saved))),appearance);assert.deepEqual(original.design,{backgroundColor:'#abcdef',typographyRoles:{supporting:{color:'#345678'}}});assert.equal(appearance.imageRadii.item,0);assert.equal(appearance.imageRadii.cover,32);});
test("invalid posted radii/shapes cannot reach persistence",()=>{for(const radius of ['-1','33','1.5','NaN','Infinity','1px','<script>'])assert.throws(()=>menuAppearanceFromForm(form({item:radius})));const f=form();f.set('chip_shape','unknown');assert.throws(()=>menuAppearanceFromForm(f));f.set('chip_shape','soft');f.set('album_image_ratio','16:9');assert.throws(()=>menuAppearanceFromForm(f));});
test("malformed stored data falls back safely and unsupported renderers opt out of shapes",()=>{const a=normalizeMenuAppearance({imageRadii:{item:999,cover:-1,widget:'12',advertisement:NaN,logo:4},chipShape:'oops',albumImageRatio:'oops'});assert.deepEqual(a.imageRadii,{logo:4});assert.equal(a.chipShape,'template');assert.deepEqual(menuAppearanceStyle(a,false,false),{});assert.deepEqual(menuAppearanceStyle({...a,albumImageRatio:'5:4'},false,true),{'--menu-album-image-ratio':'5 / 4'});});
test("catalog album choices preserve shapes and source and cannot affect lists",()=>{const original={design:{appearance:{imageRadii:{item:7},chipShape:'soft',albumImageRatio:'1:1'}}};assert.equal(readMenuAppearance(menuAppearancePreview(original,{albumImageRatio:'4:5'},true)).albumImageRatio,'4:5');assert.equal(readMenuAppearance(menuAppearancePreview(original,{albumImageRatio:'4:5'},false)).albumImageRatio,'1:1');assert.equal(readMenuAppearance(original).imageRadii.item,7);const zero=readMenuAppearance(menuAppearancePreview(original,{appearanceQa:'zero'},false));for(const key of IMAGE_RADIUS_KEYS)assert.equal(zero.imageRadii[key],0);});
test("Basic and Dining editors submit every radius while Dining keeps its full-bleed cover out of the controls",()=>{for(const basic of [true,false]){const html=renderToStaticMarkup(createElement(MenuAppearanceSettingsForm,{initial:normalizeMenuAppearance({imageRadii:{item:12,cover:16}}),basic,album:true,formId:'design-settings-form'}));for(const key of IMAGE_RADIUS_KEYS)assert.ok(html.includes(`name="image_radius_${key}"`));assert.ok(!html.includes('type="number"'));assert.ok(!html.includes('type="range"'));for(const preset of IMAGE_RADIUS_PRESETS)assert.ok(html.includes(preset.label));assert.ok(html.includes('기존 설정 유지'));assert.ok(html.includes('value="12"'));assert.ok(html.includes('name="chip_shape"'));assert.ok(html.includes('name="album_image_ratio"'));assert.ok(html.includes('value="4:5"'));assert.ok(html.includes('value="5:4"'));assert.equal(html.includes('대표 이미지 라운드'),basic);assert.ok(!html.includes('커버 이미지 라운드'));}});
test("save and reset remain inside the existing authorized menu Design path",()=>{const source=fs.readFileSync('app/mypage/menus/actions.ts','utf8');const save=source.slice(source.indexOf('export async function updateDesignSettingsAction'),source.indexOf('export async function resetMenuCoverToPresetAction'));assert.ok(save.indexOf('requireOwnedMenuSite(menuId)')<save.indexOf('menuAppearanceFromForm(formData)'));assert.ok(save.includes('.eq("id", menuId)'));assert.ok(save.includes('page_settings: pageSettings'));const reset=source.slice(source.indexOf('export async function resetDesignSettingsToTemplateDefaultAction'),source.indexOf('async function assertCategoryBelongsToMenuSite'));assert.ok(reset.includes('delete designSettings.appearance'));});

test("album ratio survives frame, feature and tablet orientation navigation",()=>{const url=new URL(buildTemplatePreviewUrl('cafe_design_a',{design:'basic-first-column-album',albumImageRatio:'4:5',appearanceQa:'custom',imagesPreview:'on'},{device:'tablet',orientation:'portrait',actual:true}),'https://example.test');assert.equal(url.searchParams.get('albumImageRatio'),'4:5');assert.equal(url.searchParams.get('appearanceQa'),'custom');assert.equal(url.searchParams.get('orientation'),'portrait');assert.equal(url.searchParams.get('view'),'actual');});

test("shared image presets preserve native defaults and legacy saved radii",()=>{
 assert.equal(imageRadiusPreset(undefined),'template');
 for(const preset of IMAGE_RADIUS_PRESETS){assert.equal(imageRadiusPreset(preset.radius),preset.value);if(preset.radius!==undefined){const saved=menuAppearanceFromForm(form({item:String(preset.radius)}))!;assert.equal(saved.imageRadii.item,preset.radius);}}
 for(const radius of [4,7,12,20,32])assert.equal(imageRadiusPreset(radius),'saved');
});


test("list editors retain a saved album ratio without presenting an inactive ratio selector",()=>{
 const html=renderToStaticMarkup(createElement(MenuAppearanceSettingsForm,{initial:normalizeMenuAppearance({albumImageRatio:'4:5'}),basic:true,album:false,formId:'design-settings-form'}));
 assert.ok(html.includes('type="hidden" form="design-settings-form" name="album_image_ratio" value="4:5"'));
 assert.ok(!html.includes('앨범형 상품 이미지 비율'));
});

test("Dining preview keeps its full-bleed cover square and places cover copy color before shape controls",()=>{
 const html=renderToStaticMarkup(createElement(PreviewDesignOptions,{value:{},defaults:{fonts:{brand:{ko:'pretendard',en:'outfit',color:'#111111'},category:{ko:'pretendard',en:'outfit',color:'#222222'},other:{ko:'pretendard',en:'outfit',color:'#333333'}},colors:{page:'#FFFFFF',auxiliary:'#FFFFFF',cover:'#FFFFFF',sidebar:'#F4F5F3',coverDescription:'#606561'},appearance:normalizeMenuAppearance({})},templateKey:'dining_aube_table_a',album:false,dining:true,disabled:false,onChange:()=>{}}));
 assert.ok(html.indexOf('커버 소개 글자색')>0);
 assert.ok(html.indexOf('커버 소개 글자색')<html.indexOf('이미지 라운드'));
 assert.ok(!html.includes('aria-label="커버 이미지 라운드"'));
});

test("album preview presents image ratio as its own section before image radii",()=>{
 const html=renderToStaticMarkup(createElement(PreviewDesignOptions,{value:{},defaults:{fonts:{brand:{ko:'pretendard',en:'outfit',color:'#111111'},category:{ko:'pretendard',en:'outfit',color:'#222222'},other:{ko:'pretendard',en:'outfit',color:'#333333'}},colors:{page:'#FFFFFF',auxiliary:'#FFFFFF',cover:'#FFFFFF',sidebar:'#F4F5F3',coverDescription:'#606561'},appearance:normalizeMenuAppearance({})},templateKey:'cafe_design_a',album:true,dining:false,disabled:false,onChange:()=>{}}));
 assert.ok(html.includes('앨범형 상품 이미지'));
 assert.ok(html.indexOf('앨범형 상품 이미지')<html.indexOf('이미지 라운드'));
 assert.ok(html.includes('aria-label="앨범형 상품 이미지 비율"'));
});
