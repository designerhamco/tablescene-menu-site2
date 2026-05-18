import Footer from "@/app/components/layout/Footer";
import ApplyOrderForm from "@/components/apply/ApplyOrderForm";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { getPublicPortOneConfig } from "@/lib/portone";
import { createClient } from "@/lib/supabase/server";
import { getAvailableTemplatesForService } from "@/lib/templates";
import { redirect } from "next/navigation";

type PaidApplyService = "menu" | "screen" | "order";

const PAID_APPLY_COPY: Record<
  PaidApplyService,
  {
    eyebrow: string;
    title: string;
    description: string;
    note?: string;
  }
> = {
  menu: {
    eyebrow: "TableScene Basic",
    title: "테이블씬 베이직 신청/결제",
    description:
      "개인 1개월 체험, 사업자 월 결제, 사업자 연 결제 중 이용 방식을 선택해 Basic 메뉴판을 신청합니다.",
    note:
      "개인 체험은 1회 결제로 바로 이용할 수 있고, 사업자 월/연 결제는 사업자 인증과 자동결제 연결을 기준으로 설계되어 있습니다.",
  },
  screen: {
    eyebrow: "TableScene Display",
    title: "테이블씬 디스플레이 신청/결제",
    description:
      "매장 화면을 감각적인 디지털 메뉴보드로 운영할 수 있는 결제형 신청 페이지입니다.",
    note:
      "현재는 기존 메뉴판 생성 흐름을 재사용해 준비되며, 추후 디스플레이 전용 템플릿과 데이터 구조로 분리할 수 있습니다.",
  },
  order: {
    eyebrow: "TableScene QR Order",
    title: "테이블씬 오더 1.0 신청/결제",
    description:
      "QR로 주문하고 주방까지 바로 연결되는 오더 시스템 도입을 위한 결제신청형 페이지입니다.",
    note:
      "현재는 기존 신청/결제 흐름을 기반으로 접수되며, POS 사용 여부, 테이블 수, 주방 대시보드 등 오더 전용 입력 항목은 다음 단계에서 확장할 수 있습니다.",
  },
};

type PaidApplyPageProps = {
  serviceType: PaidApplyService;
  nextPath?: string;
};

export default async function PaidApplyPage({ serviceType, nextPath }: PaidApplyPageProps) {
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

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
                {copy.eyebrow}
              </p>
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
            templates={getAvailableTemplatesForService(templateServiceType)}
            userEmail={user.email ?? ""}
            userId={user.id}
            storeId={portOneConfig.storeId}
            channelKey={portOneConfig.channelKey}
            mockEnabled={portOneConfig.mockEnabled}
            serviceType={serviceType}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
