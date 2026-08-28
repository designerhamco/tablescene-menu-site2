import { NextResponse } from "next/server";

import { getStoreOperationsContext } from "@/lib/server/store-operations-context";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { available: false },
      { status: 401, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }

  try {
    const { sites } = await getStoreOperationsContext();

    return NextResponse.json(
      { available: sites.length > 0 },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("[account/store-operations-access] check failed", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { available: false },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}
