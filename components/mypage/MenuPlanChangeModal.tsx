"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import MenuPlanChangePanel from "./MenuPlanChangePanel";

export default function MenuPlanChangeModal({ subscriptionId, menuName }: { subscriptionId: string; menuName: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="site-button site-button-outline">구독 변경</button>
      </DialogTrigger>
      <DialogContent className="site-management-scope max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <div className="pr-8">
          <DialogTitle>구독 변경</DialogTitle>
          <DialogDescription className="mt-2">{menuName}의 이용권과 디자인을 변경합니다.</DialogDescription>
        </div>
        <MenuPlanChangePanel subscriptionId={subscriptionId} />
      </DialogContent>
    </Dialog>
  );
}
