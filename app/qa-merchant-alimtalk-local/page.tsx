import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import SitePage from "@/components/layout/SitePage";
import OrderSettingsCategories from "@/components/mypage/OrderSettingsCategories";
import OrderReadyNotificationSettings from "@/components/mypage/OrderReadyNotificationSettings";
import { Button } from "@/app/components/ui/button";
import type { MerchantChannelAction, MerchantChannelPage } from "@/lib/merchant-alimtalk-channel";
import { loadMerchantDemoCategories, merchantDemo, readMerchantDemo } from "./state";

export const dynamic = "force-dynamic";
const path = "/qa-merchant-alimtalk-local";
async function connect(input: Parameters<MerchantChannelAction>[0]): ReturnType<MerchantChannelAction> {
  "use server";
  if (process.env.NODE_ENV !== "development") notFound();
  const result = await merchantDemo(input);
  revalidatePath(path);
  return result;
}
async function reset() {
  "use server";
  (await readMerchantDemo()).save(null);
  revalidatePath(path);
}
export default async function LocalMerchantAlimtalk() {
  if (process.env.NODE_ENV !== "development") notFound();
  const { connection } = await readMerchantDemo();
  const initial: MerchantChannelPage = { available: true, connection, categories: [] };
  try { initial.categories = await loadMerchantDemoCategories(); }
  catch { initial.available = false; initial.message = "NHN 업종 목록을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요."; }
  return <SitePage title="주문 설정" typography="management" align="start">
    <div className="site-stack-content">
      <div className="site-action-row" data-distribution="between">
        <p className="type-body-sm site-copy-muted">로컬 체험용입니다. ‘조리완료 알림톡’에서 임의의 매장 정보와 인증번호 123456을 사용하세요. 실제 인증 요청·고객 발송·운영 DB 저장은 하지 않습니다.</p>
        <form action={reset}><Button type="submit" variant="outline">연결 체험 초기화</Button></form>
      </div>
      <OrderSettingsCategories payment={<p className="type-body">조리완료 알림톡 탭에서 매장 채널 연결을 체험할 수 있습니다.</p>}
        notifications={<p className="type-body">알림음 설정은 기존 기능을 유지합니다.</p>}
        ready={<OrderReadyNotificationSettings key={connection?.challengeId ?? "unlinked"} initial={initial} action={connect} />} />
    </div>
  </SitePage>;
}
