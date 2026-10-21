// Copied to an ephemeral app route by qa-menu-surfaces.mjs; never a production route.
import { Children, isValidElement, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import PreviewPage from '@/app/templates/[templateKey]/preview/page';
import MenuPageRenderer from '@/components/menu/MenuPageRenderer';
import { menuSurfaceSettingsFromForm, withMenuSurfaceSettings } from '@/lib/menu-design-surfaces';
import { getDefaultDesignReview } from '@/lib/menu-design-policy';
import { mergePageSettings } from '@/types/menu';
function findRenderer(node: ReactNode): Record<string,unknown> | null {
  for (const child of Children.toArray(node)) if (isValidElement<{children?:ReactNode}>(child)) {
    if (child.type === MenuPageRenderer) return child.props as Record<string,unknown>;
    const found=findRenderer(child.props.children);if(found)return found;
  }
  return null;
}
export default async function SurfaceQaPage({searchParams}:{searchParams:Promise<Record<string,string>>}) {
  if(process.env.NODE_ENV === 'production')notFound();
  const query=await searchParams,key=query.template??'cafe_design_a';
  const tree=await PreviewPage({params:Promise.resolve({templateKey:key}),searchParams:Promise.resolve({view:'actual',device:query.device??'pc',design:query.design,logoPreview:query.logo??'off',coverImagesPreview:'off',coverPreview:'on',imagesPreview:'on',priceOptionsPreview:'on',callPreview:'on',orderPreview:'on'})});
  const props=findRenderer(tree) as unknown as Parameters<typeof MenuPageRenderer>[0];if(!props)throw new Error('QA renderer missing');
  const data=structuredClone(props),settings={...data.menuSite.settings as Record<string,unknown>};
  if(getDefaultDesignReview(query.design,data.menuSite.template_key))settings.menu_design_id=query.design;
  data.menuSite.settings=settings as typeof data.menuSite.settings;
  if(query.choice !== 'native') {
    const form=new FormData();form.set('menu_surfaces_present','1');
    if(query.choice !== 'reset') {
      for(const[k,v]of Object.entries({surface_pageBackground:'#FAF7F2',surface_auxiliaryBackground:'#E9D4BA',surface_coverBackground:'#223344',surface_sidebarBackground:'#E6DCD1',surface_coverDescriptionColor:'#E0D1BB',representative_alignment:query.align??'right'}))form.set(k,v);
    }
    const choices=menuSurfaceSettingsFromForm(form,data.menuSite.template_key)!;
    const page=withMenuSurfaceSettings(data.menuSite.page_settings,settings,data.menuSite.template_key,choices);
    data.menuSite.page_settings=JSON.parse(JSON.stringify(page));
    data.pageSettings=mergePageSettings({...data.pageSettings,...page});
  }
  return <MenuPageRenderer {...data} mode="public" />;
}
