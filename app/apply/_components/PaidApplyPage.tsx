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
import type { BasicProductKey } from "@/lib/payments";
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
    title: "아티메뉴 다이닝 신청/결제",
    description:
      "개인 1개월 체험 또는 단일·멀티페이지 월결제/연결제 중 이용 방식을 선택해 아티메뉴 다이닝 메뉴판을 신청합니다.",
    note:
      "신규 구매 또는 신규 구독 1건당 다이닝 메뉴판 1개가 제공됩니다. 추가 메뉴판은 별도로 구매하며, 정기 결제 갱신 시에는 기존 메뉴판의 이용기간만 연장됩니다.",
  },
  screen: {
    title: "아티메뉴 디스플레이 신청/결제",
    description:
      "매장 화면을 감각적인 디지털 메뉴보드로 운영할 수 있는 결제형 신청 페이지입니다.",
    note:
      "신규 Display 구독 1건당 Display 메뉴판 1개가 제공됩니다. 정기 결제 갱신 시에는 기존 메뉴판의 이용기간만 연장되며, 현재는 전용 템플릿 준비 중입니다.",
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
};

export default async function PaidApplyPage({
  serviceType,
  nextPath,
  initialRecoverPaymentId,
  initialRecoverSubscriptionId,
  initialBasicProductKey,
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

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{copy.title}</h1>
              <p className="mt-4 max-w-2xl break-keep text-base font-medium leading-relaxed text-zinc-500">
                {copy.description}
              </p>
              {copy.note ? (
                <p className="mt-3 max-w-2xl break-keep text-sm font-medium leading-relaxed text-zinc-400">
                  {copy.note}
                </p>
              ) : null}
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
            initialRecoverPaymentId={initialRecoverPaymentId}
            initialRecoverSubscriptionId={initialRecoverSubscriptionId}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
