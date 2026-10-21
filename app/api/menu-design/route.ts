import { isSameOriginRequest } from '@/lib/same-origin-request';
import { isDeletedAccountStatus } from '@/lib/account-status';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { switchContractMenuDesign } from '@/lib/server/menu-plan-design-service';
export async function PATCH(request:Request) {
  if(!isSameOriginRequest(request))return NextResponse.json({message:'잘못된 요청입니다.'},{status:403});
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user||isDeletedAccountStatus(user.app_metadata))return NextResponse.json({message:'로그인이 필요합니다.'},{status:401});
  let body:Record<string,unknown>;try{body=await request.json();}catch{return NextResponse.json({message:'요청 형식이 올바르지 않습니다.'},{status:400});}
  if(!body||typeof body!=='object'||typeof body.menuId!=='string'||!(/^[0-9a-f-]{36}$/i.test(body.menuId))||typeof body.designId!=='string')return NextResponse.json({message:'선택한 디자인을 확인해 주세요.'},{status:400});
  try {
    const site=await switchContractMenuDesign(createAdminClient(),user.id,body.menuId,body.designId);
    revalidatePath(`/mypage/menus/${site.id}/edit`);revalidatePath(`/mypage/menus/${site.id}/preview`);if(site.slug)revalidatePath(`/menu/${site.slug}`);
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({message:error instanceof Error?error.message:'디자인을 변경하지 못했습니다.'},{status:409});}
}
