import { NextResponse } from "next/server";
import { isAlimtalkPaymentId } from "@/lib/alimtalk-wallet";
import { reconcileAlimtalkTopup } from "@/lib/server/alimtalk-wallet-service";

export async function POST(request: Request) {
  // Never trust webhook amounts, identities, status or event type.
  // The service checks a known intent, then verifies the payment directly with PortOne.
  const text = await request.text();
  if (text.length > 4096) return new NextResponse(null, { status: 413 });
  let paymentId: unknown;
  try { paymentId = JSON.parse(text)?.data?.paymentId; } catch { return new NextResponse(null, { status: 400 }); }
  if (!isAlimtalkPaymentId(paymentId)) return NextResponse.json({ received: true });
  try { await reconcileAlimtalkTopup(paymentId); }
  catch { return new NextResponse(null, { status: 503 }); } // Provider retries; no acknowledgement before durable settlement.
  return NextResponse.json({ received: true });
}
