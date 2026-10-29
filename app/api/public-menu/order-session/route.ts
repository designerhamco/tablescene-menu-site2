import { NextRequest, NextResponse } from "next/server";
import { isUuid } from "@/lib/postpay-order-runtime";
import { TABLE_VISIT_SESSION_COOKIE, TABLE_VISIT_SESSION_COOKIE_SECURITY, getTableVisitSessionCookieMaxAge } from "@/lib/table-qr-session-tokens";
import { resolveTableVisitSession, extendTableOrderAccess, renewTableTerminalConnection } from "@/lib/server/table-visit-session-service";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
function response(body: unknown, status = 200) {
  return NextResponse.json(body, {status, headers:{"Cache-Control":"no-store","Vary":"Cookie"}});
}
async function visit(request: NextRequest, id: unknown) {
  if (!isUuid(id)) return null;
  return resolveTableVisitSession({expectedMenuSiteId:id,sessionToken:request.cookies.get(TABLE_VISIT_SESSION_COOKIE)?.value,userAgent:request.headers.get("user-agent")});
}
export async function GET(request: NextRequest) {
  const session = await visit(request, request.nextUrl.searchParams.get("menuSiteId"));
  return session ? response({ok:true,channel:session.channel,orderExpiresAt:session.orderExpiresAt,serverNow:new Date().toISOString()})
    : response({ok:false,message:"방문 확인 시간이 만료되었습니다. 테이블 QR을 다시 스캔해 주세요."},401);
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return response({ok:false},403);
  if (Number(request.headers.get("content-length"))>1024) return response({ok:false},413);
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length>1024) return response({ok:false},413);
    const body = JSON.parse(raw), session = await visit(request,body?.menuSiteId);
    if (body?.intent === "terminal-keepalive") {
      if (!session || session.channel !== "terminal") return response({ok:false},401);
      const renewed = await renewTableTerminalConnection(session)
        // A concurrent refresh may have won the conditional write. Revalidate before reusing it.
        ?? await visit(request, body.menuSiteId);
      if (!renewed || renewed.channel !== "terminal") return response({ok:false},401);
      const result = response({ok:true,channel:"terminal",expiresAt:renewed.expiresAt,serverNow:new Date().toISOString()});
      result.cookies.set(TABLE_VISIT_SESSION_COOKIE,request.cookies.get(TABLE_VISIT_SESSION_COOKIE)!.value,{
        ...TABLE_VISIT_SESSION_COOKIE_SECURITY,expires:new Date(renewed.expiresAt),
        maxAge:getTableVisitSessionCookieMaxAge(renewed.expiresAt,new Date(),"terminal"),
      });
      return result;
    }
    if (!session || session.channel !== "customer") return response({ok:false},401);
    const renewed = await extendTableOrderAccess(session);
    return response({ok:true,orderExpiresAt:renewed.orderExpiresAt,serverNow:new Date().toISOString()});
  } catch { return response({ok:false,message:"주문 이용 시간이 만료되었습니다. 테이블 QR을 다시 스캔해 주세요."},409); }
}
