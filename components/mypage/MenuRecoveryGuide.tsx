import Link from "next/link";
import { DetailField, DetailGrid } from "@/app/components/ui/detail-grid";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";

export default function MenuRecoveryGuide({ menuName, deadlineLabel, message, billingHref }: {
  menuName: string;
  deadlineLabel: string;
  message?: string;
  billingHref: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="site-button site-button-outline">재구독·복구 안내</button>
      </DialogTrigger>
      <DialogContent className="site-management-scope" scrollable>
        <DialogHeader reserveCloseButton>
          <DialogTitle>재구독·복구 안내</DialogTitle>
          <DialogDescription>{menuName}</DialogDescription>
        </DialogHeader>
        <DetailGrid>
          <DetailField label="복구 기한" full>{deadlineLabel}</DetailField>
        </DetailGrid>
        {message ? <p className="type-body-sm site-copy-muted">{message}</p> : null}
        <DialogFooter>
          <Link href={billingHref} className="site-button site-button-primary">구독/결제 내역</Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
