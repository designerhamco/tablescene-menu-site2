import { NextResponse } from "next/server";

import { getRestorePreflightSummary, MenuSiteRestorePreflightError } from "@/lib/server/menu-site-restore-service";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RestorePreflightBody = {
  restoreMenuSiteId?: unknown;
  selectedProductKey?: unknown;
};

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function parseBody(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      restoreMenuSiteId: null,
      selectedProductKey: null,
    };
  }

  const body = value as RestorePreflightBody;
  const restoreMenuSiteId = typeof body.restoreMenuSiteId === "string" && body.restoreMenuSiteId.trim()
    ? body.restoreMenuSiteId.trim()
    : null;
  const selectedProductKey = typeof body.selectedProductKey === "string" && body.selectedProductKey.trim()
    ? body.selectedProductKey.trim()
    : null;

  return { restoreMenuSiteId, selectedProductKey };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { restoreMenuSiteId, selectedProductKey } = parseBody(body);
  if (!restoreMenuSiteId) {
    return jsonError("RESTORE_MENU_SITE_ID_REQUIRED", "복구할 메뉴판 정보를 확인할 수 없습니다.");
  }

  if (!selectedProductKey) {
    return jsonError("RESTORE_PRODUCT_KEY_REQUIRED", "복구할 구독 상품을 선택해주세요.");
  }

  try {
    const preflight = await getRestorePreflightSummary({
      userId: user.id,
      restoreMenuSiteId,
      selectedProductKey,
    });

    return NextResponse.json({ ok: true, preflight });
  } catch (error) {
    if (error instanceof MenuSiteRestorePreflightError) {
      return jsonError(error.code, error.message, error.status);
    }

    return jsonError("RESTORE_PREFLIGHT_FAILED", "복구 가능 상태를 확인하지 못했습니다.", 500);
  }
}
