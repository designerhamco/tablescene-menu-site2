'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
export default function useTemplateFavorites(initial?:readonly string[]) {
  const router=useRouter();
  const [favorites,setFavorites]=useState<string[]>(()=>[...(initial??[])]);
  const [authenticated,setAuthenticated]=useState(initial!==undefined);
  const [ready,setReady]=useState(initial!==undefined);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const reload=useCallback(async()=>{
    try{const response=await fetch('/api/template-favorites',{cache:'no-store'});if(!response.ok)throw new Error();
      const data=await response.json();setFavorites(data.favorites??[]);setAuthenticated(data.authenticated===true);setReady(true);
    }catch{setMessage('좋아요 목록을 불러오지 못했습니다. 새로고침해 주세요.');}
  },[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{void reload();},0);const refresh=()=>{void reload();};window.addEventListener('focus',refresh);return()=>{window.clearTimeout(timer);window.removeEventListener('focus',refresh);};},[reload]);
  async function toggle(id:string) {
    if(busy||!ready)return;
    if(!authenticated){router.push(`/sign-in?next=${encodeURIComponent(location.pathname+location.search)}`);return;}
    const previous=favorites,liked=!favorites.includes(id);
    setBusy(true);setMessage('');setFavorites(liked?[id,...favorites]:favorites.filter(key=>key!==id));
    try{
      const response=await fetch('/api/template-favorites',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,liked})});
      const data=await response.json();if(!response.ok)throw new Error(data.message||'좋아요를 저장하지 못했습니다.');
      if(!Array.isArray(data.favorites)||data.favorites.some((value:unknown)=>typeof value!=='string'))throw new Error('좋아요 저장 결과를 확인하지 못했습니다. 다시 시도해 주세요.');
      setFavorites(data.favorites);
      toast.success(data.favorites.includes(id)?'템플릿을 좋아요 목록에 등록했습니다.':'템플릿 좋아요를 취소했습니다.');
      router.refresh();
    }catch(error){setFavorites(previous);setMessage(error instanceof Error?error.message:'좋아요를 저장하지 못했습니다.');}
    finally{setBusy(false);}
  }
  return {favorites,toggle,busy:busy||!ready,message};
}
