import { KITCHEN_STAGE_LABELS } from "@/lib/kitchen-order";

const labels: Record<string, string> = {
  ...KITCHEN_STAGE_LABELS,
  served: "픽업·서빙 완료",
  cancelled: "주문 취소",
};

export default function OrderStage({ status }: { status: string }) {
  const stage = status === "received" || status === "accepted" ? "before" : status;
  return <span className="site-order-stage" data-stage={stage}>{labels[stage] ?? status}</span>;
}
