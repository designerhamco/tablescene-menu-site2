import { catalogDesigns, getCatalogDesign } from './catalog-designs';
export const TEMPLATE_FAVORITES_KEY='favorite_menu_templates';
export function readTemplateFavorites(metadata: unknown): string[] {
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))return [];
  const ids=(metadata as Record<string,unknown>)[TEMPLATE_FAVORITES_KEY];
  if(!Array.isArray(ids))return [];
  return [...new Set(ids.filter((id):id is string=>typeof id==='string'&&!!getCatalogDesign(id)).map(id=>getCatalogDesign(id)!.id))].slice(0,catalogDesigns.length);
}
export function setTemplateFavorite(current: readonly string[], id: string, liked: boolean) {
  const design=getCatalogDesign(id);
  if(!design)throw new Error('선택한 디자인을 찾을 수 없습니다.');
  const next=current.filter(key=>key!==design.id);
  return liked?[design.id,...next]:next;
}
