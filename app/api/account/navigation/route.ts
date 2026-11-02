import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessibleMenuSiteList } from "@/lib/server/menu-site-access-service";
import { getNavigationRole } from "@/lib/site-navigation";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ account: null }, { status: 401, headers });
  try {
    const [sites, business] = await Promise.all([
      getAccessibleMenuSiteList(),
      supabase.from("business_profiles").select("business_name").eq("user_id", user.id).eq("verification_status", "verified").order("last_verified_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const displayName = [user.user_metadata?.display_name, user.user_metadata?.full_name, user.user_metadata?.name].find(value => typeof value === "string" && value.trim());
    return NextResponse.json({ account: { name: business.data?.business_name || displayName || null, email: user.email ?? "", role: getNavigationRole(sites) } }, { headers });
  } catch {
    return NextResponse.json({ account: null }, { status: 503, headers });
  }
}
