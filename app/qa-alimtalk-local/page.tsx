import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import SitePage from "@/components/layout/SitePage";
import OperationsViewLayout from "@/components/mypage/OperationsViewLayout";
import { Button } from "@/app/components/ui/button";
import OrderDashboard from "@/app/mypage/menus/[menuId]/orders/OrderDashboard";
import type { OrderManagementActionState } from "@/app/mypage/menus/[menuId]/orders/action-state";
import type { OrderAlimtalkAction } from "@/lib/order-ready-alimtalk";
import { FLOOR_RECT_SIZE } from "@/lib/menu-floor-plan";
import { demoAlimtalk, getOrders, points, readDemo } from "./state";

export const dynamic = "force-dynamic";
const path = "/qa-alimtalk-local";

async function notify(input: Parameters<OrderAlimtalkAction>[0]): ReturnType<OrderAlimtalkAction> {
  "use server";
  if (process.env.NODE_ENV !== "development") notFound();
  const result = await demoAlimtalk(input);
  revalidatePath(path);
  return result;
}

async function mutate(_state: OrderManagementActionState, form: FormData): Promise<OrderManagementActionState> {
  "use server";
  if (process.env.NODE_ENV !== "development") notFound();
  const { state, save } = await readDemo();
  const order = getOrders(state).find(row => row.id === form.get("orderId"));
  if (!order || order.status !== "ready" || form.get("nextStatus") !== "served") {
    return { status: "error", orderId: null, message: "픽업·서빙 처리할 샘플 주문을 확인해 주세요." };
  }
  save({ ...state, [order.id]: { ...state[order.id], served: true } });
  revalidatePath(path);
  return { status: "success", message: "픽업·서빙을 완료했습니다.", orderId: order.id };
}

async function reset() {
  "use server";
  if (process.env.NODE_ENV !== "development") notFound();
  (await readDemo()).reset();
  revalidatePath(path);
}

export default async function LocalAlimtalkPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  const { state } = await readDemo();
  const roomId = "test-room";
  return (
    <SitePage title="조리완료 알림톡 체험" typography="management" align="start">
      <div className="site-stack-content">
        <div className="site-action-row" data-distribution="between">
          <p className="type-body-sm site-copy-muted">테이블뷰에서 주문 상자를 열거나 리스트뷰에서 테스트할 수 있어요. #201은 발송 성공, #202는 첫 발송 실패 후 재발송 성공을 체험할 수 있어요. 모든 발송은 모의 발송이에요.</p>
          <form action={reset}>
            <Button variant="outline" type="submit">샘플 주문 초기화</Button>
          </form>
        </div>
        <OperationsViewLayout title="주문 관리" selectable={false}>
          <OrderDashboard menuSiteId="qa-alimtalk-local" menuSiteName="샘플 매장" orders={getOrders(state)}
            autoRefresh={false} alimtalkAction={notify} mutationAction={mutate}
            permissions={{ canManage: true, canCancelUnpaid: false, canMarkManualPayment: true }}
            floorPlan={{
              available: true, revision: 0, points,
              document: {
                layoutVersion: 3,
                rooms: [{ id: roomId, name: "홀", aspectRatio: 16 / 9 }],
                placements: points.map((point, index) => ({
                  ...FLOOR_RECT_SIZE, pointId: point.id, roomId, x: 0.2 + index * 5, y: 0.2,
                })),
              },
            }} />
        </OperationsViewLayout>
      </div>
    </SitePage>
  );
}
