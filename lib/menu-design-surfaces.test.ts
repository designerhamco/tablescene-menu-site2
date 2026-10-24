import assert from 'node:assert/strict';
import test from 'node:test';
import {hasFixedHeaderAlignment,menuSurfaceSettingsFromForm,readMenuSurfaceSettings,withMenuSurfaceSettings,menuSurfaceDefaults} from './menu-design-surfaces';
import {getMenuDesignBackgrounds} from './template-background-colors';
import {buildMenuDesignMutation} from './menu-design-mutation';
const form=(values:Record<string,string>)=>{const data=new FormData();for(const[key,value]of Object.entries(values))data.set(key,value);return data;};

test('Basic surface save round-trips colors/alignment and preserves content-related JSON',()=>{
 const original={menu_cover_enabled:true,unrelated:{keep:1},design:{appearance:{chipShape:'pill'},typographyRoles:{brand:{color:'#123456'}}}};
 const snapshot=structuredClone(original);
 const input=form({menu_surfaces_present:'1',surface_pageBackground:'#fefefe',surface_auxiliaryBackground:'#efddcb',representative_alignment:'right'});
 const choice=menuSurfaceSettingsFromForm(input,'cafe_design_a')!;
 const saved=withMenuSurfaceSettings(original,{},'cafe_design_a',choice);
 assert.deepEqual(readMenuSurfaceSettings(JSON.parse(JSON.stringify(saved))),{pageBackground:'#FEFEFE',auxiliaryBackground:'#EFDDCB',representativeAlignment:'right'});
 assert.deepEqual(original,snapshot);assert.deepEqual(saved.unrelated,{keep:1});assert.equal(saved.menu_cover_enabled,true);
 assert.deepEqual((saved.design as Record<string,unknown>).appearance,original.design.appearance);
 assert.deepEqual((saved.design as Record<string,unknown>).typographyRoles,original.design.typographyRoles);
 assert.equal(getMenuDesignBackgrounds('cafe_design_a',saved).coloredPanel,true);
 const same=withMenuSurfaceSettings(saved,{},'cafe_design_a',{pageBackground:'#EFDDCB',auxiliaryBackground:'#EFDDCB'});
 assert.equal(getMenuDesignBackgrounds('cafe_design_a',same).coloredPanel,false);
 const reset=withMenuSurfaceSettings(saved,{},'cafe_design_a',{});
 assert.deepEqual(readMenuSurfaceSettings(reset),{});assert.deepEqual((reset.design as Record<string,unknown>).appearance,original.design.appearance);
});
test('native and saved center panels switch geometry from their visible background',()=>{
 assert.equal(getMenuDesignBackgrounds('cafe_round_focus_a',{}).coloredPanel,true);
 assert.equal(getMenuDesignBackgrounds('cafe_round_focus_a',{design:{backgroundColor:'#FFFFFF',auxiliaryBackgroundColor:'#FFFFFF'}}).coloredPanel,false);
 assert.equal(getMenuDesignBackgrounds('cafe_round_focus_a',{design:{backgroundColor:'#FFFFFF',auxiliaryBackgroundColor:'#F4E7CF'}}).coloredPanel,true);
 assert.equal(getMenuDesignBackgrounds('cafe_design_a',{}).coloredPanel,false);
 assert.equal(getMenuDesignBackgrounds('cafe_design_a',{design:{backgroundColor:'#FFFFFF',auxiliaryBackgroundColor:'#F4E7CF'}}).coloredPanel,true);
});
test('older forms preserve settings; invalid color/alignment fail before a write',()=>{
 assert.equal(menuSurfaceSettingsFromForm(form({}),'cafe_design_a'),undefined);
 for(const value of ['#fff','url(https://evil.test)','transparent'])assert.throws(()=>menuSurfaceSettingsFromForm(form({menu_surfaces_present:'1',surface_pageBackground:value}),'cafe_design_a'));
 assert.throws(()=>menuSurfaceSettingsFromForm(form({menu_surfaces_present:'1',representative_alignment:'absolute'}),'cafe_design_a'));
 assert.equal(menuSurfaceSettingsFromForm(form({menu_surfaces_present:'1',surface_pageBackground:'#abcdef'}),'display_menu_a'),undefined);
 assert.deepEqual(menuSurfaceSettingsFromForm(form({menu_surfaces_present:'1',surface_pageBackground:'#abcdef',surface_sidebarBackground:'#123456'}),'dining_aube_table_a'),{pageBackground:'#ABCDEF'});
});
test('Dining colors are independent; cover opacity/content survive save and template reset',()=>{
 const original={multi_page_cover_background_color:'#AA0011',multi_page_cover_background_opacity:61,cover_image_visible:true,design:{appearance:{chipShape:'soft'}},unrelated:'keep'};
 const values=menuSurfaceSettingsFromForm(form({menu_surfaces_present:'1',surface_pageBackground:'#fffaff',surface_coverBackground:'#102030',surface_sidebarBackground:'#302010',surface_coverDescriptionColor:'#edecea'}),'dining_aube_table_b')!;
 const saved=withMenuSurfaceSettings(original,{},'dining_aube_table_b',values);
 assert.deepEqual(readMenuSurfaceSettings(saved),{pageBackground:'#FFFAFF',sidebarBackground:'#302010',coverBackground:'#102030',coverDescriptionColor:'#EDECEA'});
 assert.equal(saved.multi_page_cover_background_opacity,61);assert.equal(saved.cover_image_visible,true);assert.equal(saved.unrelated,'keep');
 const reset=withMenuSurfaceSettings(saved,{},'dining_aube_table_b',{});
 assert.equal(reset.multi_page_cover_background_color,'#401E24');assert.equal(reset.multi_page_cover_background_opacity,61);assert.equal(readMenuSurfaceSettings(reset).sidebarBackground,undefined);
 const neutral=withMenuSurfaceSettings(saved,{menu_design_id:'dining-sidebar'},'dining_aube_table_b',{});
 assert.equal(neutral.multi_page_cover_background_color,'#FFFFFF');
 assert.equal(menuSurfaceDefaults('cafe_mocha_forest_a').pageBackground,'#F4EDDC');
});
test('Dining design round-trip restores cover and sidebar colors without replacing content settings',()=>{
 const original={settings:{menu_design_id:'dining_aube_table_b'},templateKey:'dining_aube_table_b',brandColor:'#112233',pageSettings:{menu_cover_enabled:true,multi_page_cover_background_color:'#301122',multi_page_cover_background_opacity:62,design:{sidebarBackgroundColor:'#ABCDEF',coverDescriptionColor:'#EEDDCC'}}};
 const neutral=buildMenuDesignMutation({...original,targetId:'dining-full-page'});
 assert.equal(neutral.pageSettings.multi_page_cover_background_color,'#FFFFFF');
 const back=buildMenuDesignMutation({settings:neutral.settings,pageSettings:neutral.pageSettings,templateKey:'dining_aube_table_a',brandColor:neutral.brandColor,targetId:'dining_aube_table_b'});
 assert.equal(back.pageSettings.multi_page_cover_background_color,'#301122');assert.equal(back.pageSettings.multi_page_cover_background_opacity,62);
 assert.deepEqual(back.pageSettings.design,original.pageSettings.design);assert.equal(back.pageSettings.menu_cover_enabled,true);
});


test('editor auxiliary defaults distinguish no fill from explicit white and native colors',()=>{
 assert.equal(menuSurfaceDefaults('cafe_design_a').auxiliaryBackground,null);
 assert.equal(menuSurfaceDefaults('cafe_sunday_line_a').auxiliaryBackground,null);
 const white=withMenuSurfaceSettings({}, {}, 'cafe_design_a', {auxiliaryBackground:'#FFFFFF'});
 assert.equal(readMenuSurfaceSettings(white).auxiliaryBackground,'#FFFFFF');
 const cleared=withMenuSurfaceSettings(white, {}, 'cafe_design_a', {});
 assert.equal(readMenuSurfaceSettings(cleared).auxiliaryBackground,undefined);
 assert.equal(getMenuDesignBackgrounds('cafe_design_a',cleared).coloredPanel,false);
 assert.equal(getMenuDesignBackgrounds('cafe_mocha_forest_a',{}).coloredPanel,true);
});


test('top-row alignment locking follows the saved design before the native shell',()=>{
 assert.equal(hasFixedHeaderAlignment('cafe_design_a',{menu_design_id:'basic-top-row'}),true);
 assert.equal(hasFixedHeaderAlignment('cafe_design_a',{menu_design_id:'basic-top-row-album'}),true);
 assert.equal(hasFixedHeaderAlignment('cafe_sunday_line_a'),true);
 assert.equal(hasFixedHeaderAlignment('cafe_van_gogh_a'),true);
 assert.equal(hasFixedHeaderAlignment('cafe_design_a',{menu_design_id:'basic-first-column'}),false);
 assert.equal(hasFixedHeaderAlignment('restaurant_onue_a'),false);
 assert.equal(hasFixedHeaderAlignment('dining_aube_table_a'),false);
});

test('a fixed-header editor submits the stored mobile alignment while its desktop control is disabled',async()=>{
 const {createElement}=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 const {default:MenuSurfaceSettingsForm}=await import('../components/mypage/menu-editor/MenuSurfaceSettingsForm');
 const html=renderToStaticMarkup(createElement(MenuSurfaceSettingsForm,{pageSettings:{design:{representativeAlignment:'right'}},settings:{menu_design_id:'basic-top-row'},templateKey:'cafe_design_a',formId:'design'}));
 assert.match(html,/<input[^>]*type="hidden"[^>]*name="representative_alignment"[^>]*value="right"/);
 assert.match(html,/<select[^>]*name="representative_alignment"[^>]*disabled=""/);
 const ordinary=renderToStaticMarkup(createElement(MenuSurfaceSettingsForm,{pageSettings:{},settings:{menu_design_id:'basic-first-column'},templateKey:'cafe_design_a',formId:'design'}));
 assert.doesNotMatch(ordinary,/<select[^>]*name="representative_alignment"[^>]*\sdisabled=/);
});
