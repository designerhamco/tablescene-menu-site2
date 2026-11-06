"use client";

import type { ComponentProps, RefObject } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import type { OrderPointDeviceSettings } from "@/lib/terminal-device-info";
import type { ManagedOrderPoint } from "./OrderPointControls";
import OrderPointDeviceConnection from "./OrderPointDeviceConnection";

/** One connection layer shared by list rows and selected floor-plan points. */
export default function OrderPointConnectionDialog({ menuSiteId, point, published, setup, onClose, mutateAction, returnFocusRef }: {
  menuSiteId: string; point: ManagedOrderPoint | null; published: boolean; setup: OrderPointDeviceSettings | null;
  returnFocusRef?: RefObject<HTMLButtonElement | null>; onClose: () => void; mutateAction?: ComponentProps<typeof OrderPointDeviceConnection>["mutateAction"];
}) {
  return <Dialog open={Boolean(point)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent scrollable aria-describedby={undefined} onCloseAutoFocus={event => { if (returnFocusRef?.current?.isConnected) { event.preventDefault(); returnFocusRef.current.focus(); } }}>
      <DialogHeader reserveCloseButton>
        <DialogTitle>{point?.label} · 기기 연결</DialogTitle>
      </DialogHeader>
      {point && setup ? <OrderPointDeviceConnection key={point.id} embedded expandedDeviceEditor menuSiteId={menuSiteId} point={point} published={published} setup={setup} mutateAction={mutateAction} /> : <p className="type-body-sm" role="alert">기기 정보를 불러오지 못했습니다. 페이지를 새로고침해 주세요.</p>}
    </DialogContent>
  </Dialog>;
}
