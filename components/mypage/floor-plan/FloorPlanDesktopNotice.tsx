"use client";

import { useEffect, useState, type RefObject } from "react";
import { useIsMobile } from "@/app/components/ui/use-mobile";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

const NOTICE_SESSION_KEY = "artimenu:floor-plan:desktop-notice:v1";

/** The same informational dialog is demonstrated in the component library. */
export function FloorPlanDesktopNoticeDialog({ open, onOpenChange, returnFocusRef }: {
  open: boolean; onOpenChange: (open: boolean) => void; returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent onCloseAutoFocus={event => { if (returnFocusRef?.current) { event.preventDefault(); returnFocusRef.current.focus(); } }}>
    <DialogHeader reserveCloseButton><DialogTitle>배치도 편집은 PC에서 더 편리해요</DialogTitle><DialogDescription>모바일에서도 확인하고 편집할 수 있습니다. 테이블·키오스크를 옮기거나 크기를 조절할 때는 화면이 넓은 PC를 이용하시면 더 편리합니다.</DialogDescription></DialogHeader>
    <DialogFooter><DialogClose asChild><Button type="button">확인</Button></DialogClose></DialogFooter>
  </DialogContent></Dialog>;
}

/** Show once per tab session on mobile; unavailable browser storage must not block editing. */
export default function FloorPlanDesktopNotice({ returnFocusRef }: { returnFocusRef?: RefObject<HTMLElement | null> }) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!mobile) return;
    try { if (sessionStorage.getItem(NOTICE_SESSION_KEY)) return; } catch { /* Private/restricted storage: show for this visit. */ }
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, [mobile]);
  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) { try { sessionStorage.setItem(NOTICE_SESSION_KEY, "seen"); } catch { /* Closing still works. */ } }
  }
  return <FloorPlanDesktopNoticeDialog open={mobile && open} onOpenChange={changeOpen} returnFocusRef={returnFocusRef} />;
}
