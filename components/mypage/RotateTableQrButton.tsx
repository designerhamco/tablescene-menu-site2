"use client";
import { useRef, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { mutateMenuTableAction } from "@/app/mypage/menus/[menuId]/tables/actions";
import { initialMenuTableActionState } from "@/app/mypage/menus/[menuId]/tables/action-state";
import {
  canRotateTableQr,
  QR_ROTATION_BLOCKED_MESSAGE,
} from "@/lib/qr-rotation-policy";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import InfoTooltip from "@/components/ui/InfoTooltip";
export default function RotateTableQrButton({
  menuSiteId,
  point,
  published,
}: {
  menuSiteId: string;
  point: { id: string; label: string; status: string };
  published: boolean;
}) {
  const [open, setOpen] = useState(false),
    [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const busy = useRef(false),
    allowed = canRotateTableQr(published ? "published" : "draft", point.status);
  function rotate() {
    if (!allowed || busy.current) return;
    busy.current = true;
    start(async () => {
      try {
        const data = new FormData();
        data.set("menuSiteId", menuSiteId);
        data.set("tableId", point.id);
        data.set("intent", "rotate-token");
        const result = await mutateMenuTableAction(
          initialMenuTableActionState,
          data,
        );
        setFeedback({
          status: result.status === "success" ? "success" : "error",
          message: result.message,
        });
        if (result.status === "success") setOpen(false);
      } catch {
        setFeedback({
          status: "error",
          message: "QR 주소를 변경하지 못했습니다. 다시 확인해 주세요.",
        });
      } finally {
        busy.current = false;
      }
    });
  }
  return (
    <div className="site-action-row">
      <ActionFeedbackToast
        message={feedback?.message}
        tone={feedback?.status}
        eventKey={feedback}
      />
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) {
            setOpen(next);
            if (next) setFeedback(null);
          }
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            className="site-button site-button-ghost site-button-icon site-button-compact"
            disabled={!allowed || pending}
            aria-label={`${point.label} QR 주소 변경`}
            title={allowed ? "QR 주소 변경" : QR_ROTATION_BLOCKED_MESSAGE}
          >
            <RefreshCw aria-hidden="true" />
          </button>
        </DialogTrigger>
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <DialogHeader reserveCloseButton>
            <DialogTitle>{point.label} QR 주소를 변경할까요?</DialogTitle>
            <DialogDescription>
              이용 중인 손님이 없는지 확인해 주세요. 변경하면 이전 QR 이미지와
              현재 접속 권한이 즉시 무효화되어, 주문 중인 손님이 추가
              주문·호출을 할 수 없게 됩니다.
            </DialogDescription>
          </DialogHeader>
          <p className="type-body-sm">
            이미 접수된 주문·호출 내역은 유지됩니다. 변경 후에는 새 QR 이미지를
            다운로드해 교체해 주세요.
          </p>
          {feedback?.status === "error" ? (
            <p role="alert" className="type-body-sm">
              {feedback.message}
            </p>
          ) : null}
          <DialogFooter>
            <button
              type="button"
              className="site-button site-button-outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="site-button site-button-primary"
              disabled={pending}
              onClick={rotate}
            >
              {pending ? "변경 중…" : "주소 변경"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <InfoTooltip label={`${point.label} QR 주소 변경 안내`}>
        <p>
          {allowed
            ? "주소를 변경하면 이전 QR과 접속 권한이 무효화됩니다. 메뉴판 비공개 또는 해당 테이블·키오스크 일시정지 상태에서만 변경할 수 있습니다."
            : QR_ROTATION_BLOCKED_MESSAGE}
        </p>
      </InfoTooltip>
    </div>
  );
}
