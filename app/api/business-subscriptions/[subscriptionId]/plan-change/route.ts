import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isDeletedAccountStatus } from '@/lib/account-status';
import { isSameOriginRequest } from '@/lib/same-origin-request';
import { getMenuPlanChangeDetail,reserveMenuPlanChange,cancelMenuPlanChange,menuPlanChangesEnabled,menuPlanChangeLedgerReady,menuPlanChangeRenewalsEnabled,MenuPlanChangeError } from '@/lib/server/menu-plan-change-service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{subscriptionId:string}>};
async function handle(request:Request,context:Context,method:'GET'|'POST'|'DELETE') {
  if(method!=='GET'&&!isSameOriginRequest(request))return NextResponse.json({ok:false,message:'잘못된 요청입니다.'},{status:403});
  const client=await createClient();const {data:{user}}=await client.auth.getUser();
  if(!user||isDeletedAccountStatus(user.app_metadata))return NextResponse.json({ok:false,message:'로그인이 필요합니다.'},{status:401});
  if(!menuPlanChangeLedgerReady())return method==='GET'?NextResponse.json({ok:true,enabled:false}):NextResponse.json({ok:false,message:'이용권 변경을 아직 준비 중입니다.'},{status:503});
  if(method==='POST'&&!menuPlanChangesEnabled())return NextResponse.json({ok:false,message:'새 변경 접수가 일시 중지되었습니다. 기존 예약 확인과 취소는 가능합니다.'},{status:503});
  const {subscriptionId}=await context.params;
  if(!/^[0-9a-f-]{36}$/i.test(subscriptionId))return NextResponse.json({ok:false,message:'구독을 확인해 주세요.'},{status:400});
  try {
    const admin=createAdminClient();let detail;
    if(method==='GET')detail=await getMenuPlanChangeDetail(admin,subscriptionId,user.id);
    else {
      const body:unknown=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({ok:false,message:'입력 내용을 확인해 주세요.'},{status:400});
      const input=body as Record<string,unknown>;
      detail=method==='POST'?await reserveMenuPlanChange(admin,subscriptionId,user.id,input):await cancelMenuPlanChange(admin,subscriptionId,user.id,input.changeId);
    }
    if (!menuPlanChangesEnabled()) {
      detail = {...detail, eligible:false, reason:menuPlanChangeRenewalsEnabled()?'새 변경 접수가 일시 중지되었습니다. 기존 예약은 예정대로 처리되며 결제 전 취소할 수 있습니다.':'이용권 변경 결제를 점검 중입니다. 기존 예약은 보존되며 결제 처리 전 취소할 수 있습니다.'};
    }
    return NextResponse.json({ok:true,enabled:menuPlanChangesEnabled()||Boolean(detail.pending),detail});
  }catch(error){return NextResponse.json({ok:false,message:error instanceof MenuPlanChangeError?error.message:error instanceof SyntaxError?'요청 형식을 확인해 주세요.':'구독 변경을 처리하지 못했습니다. 새로고침 후 확인해 주세요.'},{status:error instanceof MenuPlanChangeError?error.status:error instanceof SyntaxError?400:500});}
}
export function GET(request:Request,context:Context){return handle(request,context,'GET');}
export function POST(request:Request,context:Context){return handle(request,context,'POST');}
export function DELETE(request:Request,context:Context){return handle(request,context,'DELETE');}
