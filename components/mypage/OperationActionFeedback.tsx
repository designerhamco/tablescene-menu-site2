"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import type { OperationFeatureUpdateResult } from "@/app/mypage/operations/actions";

/** Results live outside the card flow so long failures never stretch the status grid. */
export default function OperationActionFeedback({ result, title, onClose, triggerRef, recovery }: {
  result: OperationFeatureUpdateResult | null;
  title: string;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  recovery?: { href: string; label: string };
}) {
  return <>
    <ActionFeedbackToast message={result?.status === "success" ? result.message : null} eventKey={result} />
    <Dialog open={result?.status === "error"} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={event => {
        event.preventDefault();
        const trigger = triggerRef.current;
        if (trigger && !trigger.disabled) trigger.focus();
        else trigger?.closest("article")?.querySelector<HTMLElement>("a[href], button:not(:disabled)")?.focus();
      }}>
        <DialogHeader reserveCloseButton className="min-w-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="break-words">{result?.status === "error" ? result.message : ""}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant={recovery ? "outline" : "default"}>확인</Button></DialogClose>
          {recovery ? <Button asChild><Link href={recovery.href} onClick={onClose}>{recovery.label}</Link></Button> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
