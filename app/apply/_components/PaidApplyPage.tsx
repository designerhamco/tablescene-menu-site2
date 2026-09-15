import Footer from "@/app/components/layout/Footer";
import ApplyOrderForm from "@/components/apply/ApplyOrderForm";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { getDisplayCheckoutQaTemplates, isDisplayCheckoutQaEnabled } from "@/lib/display-checkout-qa";
import { getPublicPortOneConfig } from "@/lib/portone";
import {
  getCheckoutTemplatesWithMochaForestQa,
  isMochaForestCheckoutSafeMockEnabled,
} from "@/lib/server/mocha-forest-checkout-qa";
import { createClient } from "@/lib/supabase/server";
import { getAvailableTemplatesForService } from "@/lib/templates";
import { businessBasicMonthlyProduct, type BasicProductKey } from "@/lib/payments";
import {
  formatBusinessFreeTrialFirstBillingDate,
  getBusinessFreeTrialPeriod,
} from "@/lib/business-free-trial";
import { getBusinessFreeTrialEligibility } from "@/lib/server/business-free-trial-eligibility";
import { redirect } from "next/navigation";

type PaidApplyService = "menu" | "screen" | "order";

const PAID_APPLY_COPY: Record<
  PaidApplyService,
  {
    title: string;
    description: string;
    note?: string;
  }
> = {
  menu: {
    title: "아티메뉴 다이닝 신청",
    description: "요금제와 템플릿을 선택하고 매장 정보를 확인해 주세요.",
  },
  screen: {
    title: "아티메뉴 디스플레이 신청",
    description: "요금제와 템플릿을 선택하고 설치할 매장 정보를 확인해 주세요.",
  },
  order: {
    title: "아티메뉴 오더 1.0 신청/결제",
    description:
      "QR로 주문하고 주방까지 바로 연결되는 오더 시스템 도입을 위한 결제신청형 페이지입니다.",
    note:
      "현재는 기존 신청/결제 흐름을 기반으로 접수되며, POS 사용 여부, 테이블 수, 주방 대시보드 등 오더 전용 입력 항목은 다음 단계에서 확장할 수 있습니다.",
  },
};

type PaidApplyPageProps = {
  serviceType: PaidApplyService;
  nextPath?: string;
  initialRecoverPaymentId?: string;
  initialRecoverSubscriptionId?: string;
  initialBasicProductKey?: BasicProductKey;
  initialTemplateKey?: string;
};

export default async function PaidApplyPage({
  serviceType,
  nextPath,
  initialRecoverPaymentId,
  initialRecoverSubscriptionId,
  initialBasicProductKey,
  initialTemplateKey,
}: PaidApplyPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath ?? `/apply/${serviceType}`)}`);
  }

  const copy = PAID_APPLY_COPY[serviceType];
  const portOneConfig = getPublicPortOneConfig();
  const templateServiceType = serviceType === "screen" ? "display" : "basic";
  const displayCheckoutQaEnabled = serviceType === "screen" && isDisplayCheckoutQaEnabled();
  const availableTemplates = getAvailableTemplatesForService(templateServiceType);
  const templates = displayCheckoutQaEnabled
    ? getDisplayCheckoutQaTemplates()
    : serviceType === "menu"
      ? getCheckoutTemplatesWithMochaForestQa(availableTemplates, templateServiceType)
      : availableTemplates;
  let singleMonthlyFreeTrialAvailable = false;

  if (serviceType === "menu") {
    try {
      const eligibility = await getBusinessFreeTrialEligibility(user.id);
      singleMonthlyFreeTrialAvailable = eligibility.eligible;
    } catch (error) {
      console.error("[paid-apply] free trial eligibility check failed", {
        userId: user.id,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  const freeTrialPeriod = getBusinessFreeTrialPeriod();

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 py-14 text-zinc-950 md:py-16">
        <div className="site-container max-w-[1200px]">
          <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <h1 className="type-page-title">{copy.title}</h1>
              <p className="site-body mt-4 max-w-2xl text-zinc-500">
                {copy.description}
              </p>
            </div>
          </header>

          <ApplyOrderForm
            templates={templates}
            userEmail={user.email ?? ""}
            userId={user.id}
            storeId={portOneConfig.storeId}
            channelKey={portOneConfig.channelKey}
            billingChannelKey={portOneConfig.billingChannelKey}
            mockEnabled={portOneConfig.mockEnabled}
            mochaForestCheckoutSafeMockEnabled={serviceType === "menu" && isMochaForestCheckoutSafeMockEnabled()}
            serviceType={serviceType}
            displayCheckoutQaEnabled={displayCheckoutQaEnabled}
            initialBasicProductKey={initialBasicProductKey}
            initialTemplateKey={initialTemplateKey}
            singleMonthlyFreeTrialAvailable={singleMonthlyFreeTrialAvailable}
            singleMonthlyFreeTrialFirstBillingDate={formatBusinessFreeTrialFirstBillingDate(freeTrialPeriod.endsAt)}
            singleMonthlyFreeTrialProductKey={businessBasicMonthlyProduct.product_key}
            initialRecoverPaymentId={initialRecoverPaymentId}
            initialRecoverSubscriptionId={initialRecoverSubscriptionId}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
