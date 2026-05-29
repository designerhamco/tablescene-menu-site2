import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import BusinessPlanConvertPanel from "@/components/mypage/BusinessPlanConvertPanel";
import { getPublicMenuUrl } from "@/lib/menu-url";
import { getPublicPortOneConfig } from "@/lib/portone";
import { createClient } from "@/lib/supabase/server";
import { getTemplateDisplayName } from "@/lib/templates";
import type { Json } from "@/lib/supabase/types";

type PageProps = {
  params: Promise<{ menuId: string }>;
};

type MenuSite = {
  id: string;
  user_id: string;
  name: string | null;
  slug: string | null;
  template_key: string | null;
  status: string | null;
  settings: Json | null;
};

type ServiceEntitlement = {
  id: string | null;
  menu_site_id: string | null;
  plan_type: string | null;
  billing_type: string | null;
  billing_cycle?: string | null;
  status: string | null;
  access_expires_at: string | null;
  expired_at: string | null;
  data_retention_until: string | null;
  deleted_scheduled_at: string | null;
};

type TrialInfo = {
  source: "service_entitlements" | "settings";
  planType: string;
  billingType: string;
  status: string;
  accessExpiresAt: string;
  dataRetentionUntil: string;
  deletedScheduledAt: string;
};

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getRecordString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function formatDate(date: string | null | undefined) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function getStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    draft: "작성중",
    published: "공개중",
    private: "비공개",
    unpublished: "비공개",
    archived: "보관됨",
    expired: "만료됨",
  };

  return status ? labels[status] ?? status : "상태 미확인";
}

function getEntitlementString(entitlement: ServiceEntitlement | undefined, key: keyof ServiceEntitlement) {
  const value = entitlement?.[key];
  return typeof value === "string" ? value : "";
}

function getTrialInfo(menuSite: MenuSite, entitlement?: ServiceEntitlement): TrialInfo | null {
  const entitlementPlanType = getEntitlementString(entitlement, "plan_type");

  if (entitlementPlanType) {
    return {
      source: "service_entitlements",
      planType: entitlementPlanType,
      billingType: getEntitlementString(entitlement, "billing_type"),
      status: getEntitlementString(entitlement, "status"),
      accessExpiresAt: getEntitlementString(entitlement, "access_expires_at"),
      dataRetentionUntil: getEntitlementString(entitlement, "data_retention_until"),
      deletedScheduledAt: getEntitlementString(entitlement, "deleted_scheduled_at"),
    };
  }

  const settings = getRecord(menuSite.settings);
  const planType = getRecordString(settings, "plan_type");

  if (!planType) {
    return null;
  }

  return {
    source: "settings",
    planType,
    billingType: getRecordString(settings, "payment_type"),
    status: "",
    accessExpiresAt: getRecordString(settings, "access_expires_at"),
    dataRetentionUntil: getRecordString(settings, "data_retention_until"),
    deletedScheduledAt: "",
  };
}

async function getServiceEntitlements(supabase: Awaited<ReturnType<typeof createClient>>, menuId: string) {
  const result = await supabase
    .from("service_entitlements")
    .select("id, menu_site_id, plan_type, billing_type, billing_cycle, status, access_expires_at, expired_at, data_retention_until, deleted_scheduled_at")
    .eq("menu_site_id", menuId);

  if (!result.error || !result.error.message.includes("billing_cycle")) {
    return {
      data: (result.data ?? []) as ServiceEntitlement[],
      error: result.error,
    };
  }

  const fallbackResult = await supabase
    .from("service_entitlements")
    .select("id, menu_site_id, plan_type, billing_type, status, access_expires_at, expired_at, data_retention_until, deleted_scheduled_at")
    .eq("menu_site_id", menuId);

  return {
    data: (fallbackResult.data ?? []) as ServiceEntitlement[],
    error: fallbackResult.error,
  };
}

export default async function ConvertPersonalTrialPage({ params }: PageProps) {
  const { menuId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/mypage/menus/${menuId}/convert`);
  }

  const { data: menuSite } = await supabase
    .from("menu_sites")
    .select("id, user_id, name, slug, template_key, status, settings")
    .eq("id", menuId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!menuSite) {
    redirect("/mypage?error=menu-convert-not-allowed");
  }

  const typedMenuSite = menuSite as MenuSite;
  const { data: entitlements, error: entitlementsError } = await getServiceEntitlements(supabase, menuId);
  const businessEntitlement = entitlements.find((entitlement) => entitlement.plan_type === "business_basic");

  if (businessEntitlement) {
    redirect("/mypage?info=already-business-plan");
  }

  const personalTrialEntitlement = entitlements.find((entitlement) => entitlement.plan_type === "personal_trial");
  const trialInfo = getTrialInfo(typedMenuSite, personalTrialEntitlement);

  if (!trialInfo || trialInfo.planType !== "personal_trial") {
    redirect("/mypage?error=not-personal-trial");
  }

  const isPendingDelete = trialInfo.status === "pending_delete" || Boolean(trialInfo.deletedScheduledAt);
  const publicUrl = typedMenuSite.slug ? getPublicMenuUrl(typedMenuSite.slug) : "공개 주소 미설정";
  const portOneConfig = getPublicPortOneConfig();

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">사업자 플랜 전환</h1>
              <p className="mt-4 break-keep text-base font-bold leading-relaxed text-zinc-500">
                새 메뉴판을 만들지 않고, 기존 개인 체험 메뉴판을 그대로 이어서 사업자 플랜으로 전환합니다.
              </p>
            </div>
            <Link href="/mypage" className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100">
              마이페이지로 돌아가기
            </Link>
          </div>

          <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{typedMenuSite.name || "이름 없는 메뉴판"}</h2>
                <p className="mt-2 break-all text-sm font-bold text-zinc-500">{publicUrl}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
                {isPendingDelete ? "복구 가능 기간 종료" : trialInfo.status === "expired" ? "체험 기간 종료" : "개인 체험"}
              </span>
            </div>
            <dl className="mt-6 grid gap-4 md:grid-cols-4">
              <InfoItem label="현재 상태" value={getStatusLabel(typedMenuSite.status)} />
              <InfoItem label="템플릿" value={typedMenuSite.template_key ? getTemplateDisplayName(typedMenuSite.template_key) : "-"} />
              <InfoItem label="체험 만료일" value={formatDate(trialInfo.accessExpiresAt)} />
              <InfoItem label="보관 만료일" value={formatDate(trialInfo.dataRetentionUntil)} />
            </dl>
            {entitlementsError && (
              <p className="mt-4 break-keep rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                이용 상태 정보를 완전히 불러오지 못해 일부 정보는 메뉴판 저장값 기준으로 표시됩니다: {entitlementsError.message}
              </p>
            )}
          </section>

          {isPendingDelete ? (
            <section className="rounded-3xl border border-amber-100 bg-amber-50 p-8 text-center">
              <h2 className="text-2xl font-black tracking-tight text-amber-900">고객지원 문의가 필요합니다</h2>
              <p className="mx-auto mt-3 max-w-2xl break-keep text-sm font-bold leading-relaxed text-amber-800">
                복구 가능 기간이 종료되었습니다. 데이터 복구 가능 여부는 고객지원으로 문의해주세요.
              </p>
              <Link href="/mypage/inquiries" className="mt-6 inline-flex items-center justify-center rounded-full bg-amber-900 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-800">
                고객지원 문의
              </Link>
            </section>
          ) : (
            <BusinessPlanConvertPanel
              menuSiteId={menuId}
              storeId={portOneConfig.storeId}
              billingChannelKey={portOneConfig.billingChannelKey}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{label}</dt>
      <dd className="mt-2 break-keep text-sm font-black text-zinc-900">{value}</dd>
    </div>
  );
}
