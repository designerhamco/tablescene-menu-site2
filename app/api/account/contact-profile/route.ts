import { NextResponse } from "next/server";

import {
  CONTACT_PROFILE_MESSAGES,
  mapContactProfileStorageError,
  normalizeContactProfileInput,
  validateContactProfileInput,
} from "@/lib/contact-profile";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactProfileRow = {
  user_id: string;
  contact_name: string;
  contact_phone: string | null;
  notification_email: string;
  updated_at: string | null;
};

type SupabaseContactProfileClient = {
  from(table: "user_contact_profiles"): {
    upsert(
      values: {
        user_id: string;
        contact_name: string;
        contact_phone: string | null;
        notification_email: string;
      },
      options: { onConflict: string }
    ): {
      select(columns: string): {
        single(): Promise<{ data: ContactProfileRow | null; error: { code?: string; message?: string; details?: string; hint?: string } | null }>;
      };
    };
  };
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, message }, { status: 400 });
}

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: CONTACT_PROFILE_MESSAGES.unauthenticated }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return badRequest(CONTACT_PROFILE_MESSAGES.invalidRequest);
  }

  const input = normalizeContactProfileInput({
    contactName: body.contactName,
    contactPhone: body.contactPhone,
    notificationEmail: body.notificationEmail,
  });
  const validationError = validateContactProfileInput(input);

  if (validationError) {
    return badRequest(validationError);
  }

  const contactProfileClient = supabase as unknown as SupabaseContactProfileClient;
  const { data, error } = await contactProfileClient
    .from("user_contact_profiles")
    .upsert(
      {
        user_id: user.id,
        contact_name: input.contactName,
        contact_phone: input.contactPhone || null,
        notification_email: input.notificationEmail,
      },
      { onConflict: "user_id" }
    )
    .select("user_id, contact_name, contact_phone, notification_email, updated_at")
    .single();

  if (error) {
    const mappedError = mapContactProfileStorageError(error);
    const safeDebug = {
      step: "contact_profile_upsert",
      debugCode: mappedError.debugCode,
      supabaseCode: error.code,
      supabaseMessage: error.message,
      supabaseDetails: error.details,
      supabaseHint: error.hint,
      hasUserId: Boolean(user.id),
      hasContactName: Boolean(input.contactName),
      hasContactPhone: Boolean(input.contactPhone),
      hasNotificationEmail: Boolean(input.notificationEmail),
    };

    console.error("[account/contact-profile] update failed", {
      userId: user.id,
      ...safeDebug,
    });

    return NextResponse.json(
      {
        ok: false,
        message: mappedError.message,
        debugCode: mappedError.debugCode,
        ...(isDevelopment() ? { safeDebug } : {}),
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: CONTACT_PROFILE_MESSAGES.saved,
    contactProfile: data,
  });
}
