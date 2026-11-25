import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { alimtalkRefundExecutionEnabled,processAlimtalkRefundJobs } from "@/lib/server/alimtalk-refund-worker";

export const runtime="nodejs";
export const maxDuration=300;
// Prepared for contract-stage activation; deliberately absent from vercel.json.
// POST only: simply opening the URL can never submit a refund.
export async function POST(request:NextRequest) {
  const secret=process.env.CRON_SECRET?.trim();
  if(!secret)return NextResponse.json({ok:false},{status:503});
  const expected=Buffer.from(`Bearer ${secret}`),actual=Buffer.from(request.headers.get("authorization")??"");
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({ok:false},{status:401});
  if(!(await alimtalkRefundExecutionEnabled()))return NextResponse.json({ok:true,disabled:true},{headers:{"Cache-Control":"no-store"}});
  try{return NextResponse.json({ok:true,...await processAlimtalkRefundJobs()},{headers:{"Cache-Control":"no-store"}});}
  catch{return NextResponse.json({ok:false},{status:500,headers:{"Cache-Control":"no-store"}});}
}
