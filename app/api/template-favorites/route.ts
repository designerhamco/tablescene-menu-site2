import { isSameOriginRequest } from '@/lib/same-origin-request';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCatalogDesign } from '@/lib/catalog-designs';
import { readTemplateFavorites, setTemplateFavorite, TEMPLATE_FAVORITES_KEY } from '@/lib/template-favorites';
import { isDeletedAccountStatus } from '@/lib/account-status';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET() {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user||isDeletedAccountStatus(user.app_metadata))return json({authenticated:false,favorites:[]});
  return json({authenticated:true,favorites:readTemplateFavorites(user.user_metadata)});
}
export async function PATCH(request:Request) {
  if(!isSameOriginRequest(request))return json({message:'잘못된 요청입니다.'},403);
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user||isDeletedAccountStatus(user.app_metadata))return json({message:'로그인 후 좋아요를 저장할 수 있습니다.'},401);
  let body:Record<string,unknown>;
  try{body=await request.json();}catch{return json({message:'요청 형식이 올바르지 않습니다.'},400);}
  if(!body||typeof body!=='object'||typeof body.liked!=='boolean'||!getCatalogDesign(body.id))return json({message:'선택한 디자인이 올바르지 않습니다.'},400);
  const favorites=setTemplateFavorite(readTemplateFavorites(user.user_metadata),String(body.id),body.liked);
  const result=await supabase.auth.updateUser({data:{[TEMPLATE_FAVORITES_KEY]:favorites}});
  if(result.error)return json({message:'좋아요를 저장하지 못했습니다. 다시 시도해 주세요.'},503);
  return json({authenticated:true,favorites:readTemplateFavorites(result.data.user.user_metadata)});
}
