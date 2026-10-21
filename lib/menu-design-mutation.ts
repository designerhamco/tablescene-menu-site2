import { getCatalogDesign } from './catalog-designs';
import { TYPOGRAPHY_ROLE_KEYS } from './template-typography-presets';
import { BADGE_STYLE_KEYS } from './template-badge-styles';
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?{...value as Record<string,unknown>}:{};
export function getNeutralDesignAppearance() {
  const roles=Object.fromEntries(TYPOGRAPHY_ROLE_KEYS.map(role=>[role,{font_ko_key:'pretendard',font_en_key:'pretendard',size:'inherit',weight:role==='brand'||role==='category'?'bold':role==='supporting'?'regular':'medium',color:role==='supporting'?'#606561':'#191c1b'}]));
  return {typography:{korean_font_key:'pretendard',english_font_key:'pretendard',font_size_scale_key:'m',typography_roles:roles},badge_styles:Object.fromEntries(BADGE_STYLE_KEYS.map(key=>[key,{background_color:'#191c1b',text_color:'#ffffff'}]))};
}
/** Presentation only. Menu items, categories, pages, addresses and subscription
 * fields are deliberately outside this mutation. The caller validates access. */
export function buildMenuDesignMutation(input:{settings:unknown;pageSettings:unknown;templateKey:string;brandColor:string|null;targetId:string}): {settings:Record<string,unknown>;pageSettings:Record<string,unknown>;brandColor:string|null} {
  const design=getCatalogDesign(input.targetId);if(!design)throw new Error('선택한 디자인을 찾을 수 없습니다.');
  const settings=record(input.settings),page=record(input.pageSettings),previous=String(settings.menu_design_id??input.templateKey);
  const snapshots=record(settings.menu_design_snapshots);
  snapshots[previous]={design:record(page.design),typography:settings.typography??null,badge_styles:settings.badge_styles??null,brand_color:input.brandColor};
  const saved=record(snapshots[design.id]),hasSaved=Object.keys(saved).length>0;
  const appearance=hasSaved?{typography:saved.typography,badge_styles:saved.badge_styles}:design.kind==='standard'?getNeutralDesignAppearance():{typography:null,badge_styles:null};
  return {settings:{...settings,...appearance,menu_design_id:design.id,menu_design_snapshots:snapshots},
    pageSettings:{...page,design:hasSaved?record(saved.design):design.kind==='standard'?{backgroundColor:'#ffffff'}:{}},
    brandColor:hasSaved?(typeof saved.brand_color==='string'?saved.brand_color:null):design.kind==='standard'?'#191c1b':null};
}
