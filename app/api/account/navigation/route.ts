import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessibleMenuSiteList } from "@/lib/server/menu-site-access-service";
import { getNavigationRole } from "@/lib/site-navigation";
import { getAccountAvatarUrl } from "@/lib/account-profile";
import { getAiCreditBalanceForUser } from "@/lib/server/ai-credits-service";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const role = getNavigationRole(sites);
    let aiCredits: number | null = null;
    let staffCount: number | null = null;
    if (role !== "직원") {
      const ownedIds = sites.filter(site => site.isOwner).map(site => site.menuSiteId);
      const [credits, staff] = await Promise.allSettled([
        getAiCreditBalanceForUser(user.id),
        ownedIds.length ? createAdminClient().from("menu_site_members").select("user_id").in("menu_site_id", ownedIds).eq("status", "active") : Promise.resolve({ data: [], error: null }),
      ]);
      if (credits.status === "fulfilled") aiCredits = credits.value.totalRemainingCredits;
      if (staff.status === "fulfilled" && !staff.value.error) staffCount = new Set((staff.value.data ?? []).map(member => member.user_id).filter(id => id && id !== user.id)).size;
    }
    return NextResponse.json({ account: {
      name: business.data?.business_name || displayName || null, email: user.email ?? "", role,
      avatarUrl: getAccountAvatarUrl(user.id, user.user_metadata), menuCount: sites.length, aiCredits, staffCount,
    } }, { headers });
  } catch {
    return NextResponse.json({ account: null }, { status: 503, headers });
  }
}
