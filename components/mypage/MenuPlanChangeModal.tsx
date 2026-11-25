"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import MenuPlanChangePanel from "./MenuPlanChangePanel";

export default function MenuPlanChangeModal({ subscriptionId, menuName }: { subscriptionId: string; menuName: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="site-button site-button-outline">기존 변경 예약</button>
      </DialogTrigger>
      <DialogContent className="site-management-scope max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <div className="pr-8">
          <DialogTitle>기존 변경 예약</DialogTitle>
          <DialogDescription className="mt-2">{menuName}</DialogDescription>
        </div>
        <MenuPlanChangePanel subscriptionId={subscriptionId} />
      </DialogContent>
    </Dialog>
  );
}
