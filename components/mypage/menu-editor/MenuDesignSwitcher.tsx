'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { catalogDesigns, getCatalogDesign } from '@/lib/catalog-designs';
import type { MenuDesignAccess, MenuService } from '@/lib/menu-design-policy';
export default function MenuDesignSwitcher({menuId,current,service,access}:{menuId:string;current:string;service:MenuService;access:MenuDesignAccess}) {
  const [selection,setSelection]=useState(current),[pending,setPending]=useState(false),[message,setMessage]=useState('');
  const router=useRouter(),design=getCatalogDesign(selection);
  return <section className="site-section site-editor-subpanel mb-5 p-5"><h3 className="type-content-title">디자인 교체</h3><p className="site-body-support mt-2 mb-4 text-zinc-600">{access==='all'?'같은 서비스의 기본 디자인과 디자인 템플릿을 교체할 수 있습니다.':'같은 서비스의 기본 디자인끼리 교체할 수 있습니다.'} 메뉴·사진·공개 주소는 유지됩니다.</p>
    <form className="flex flex-wrap items-end gap-3" onSubmit={async event=>{event.preventDefault();if(pending||selection===current)return;setPending(true);setMessage('');try{const response=await fetch('/api/menu-design',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({menuId,designId:selection})});const data=await response.json();if(!response.ok)throw new Error(data.message);setMessage('디자인이 변경되었습니다.');router.refresh();}catch(error){setMessage(error instanceof Error?error.message:'변경에 실패했습니다.');}finally{setPending(false);}}}>
      <label className="type-label grid min-w-0 gap-2">디자인<select className="site-field site-input" value={selection} onChange={e=>setSelection(e.target.value)} disabled={pending}>{catalogDesigns.filter(d=>d.service===service&&(access==='all'||d.kind==='standard')).map(d=><option key={d.id} value={d.id}>{d.kind==='standard'?'기본 · ':''}{d.name}</option>)}</select></label>
      {design?<Link href={design.previewHref} target="_blank" className="site-button site-button-rounded site-button-outline">미리보기</Link>:null}
      <button type="submit" className="site-button site-button-rounded site-button-primary" disabled={pending||selection===current}>{pending?'변경 중…':'선택한 디자인 적용'}</button>
    </form><p role="status" className="type-body-sm mt-3">{message}</p>
  </section>;
}
