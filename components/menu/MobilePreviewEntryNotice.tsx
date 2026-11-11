"use client";

import {useSyncExternalStore} from "react";
import {Button} from "@/app/components/ui/button";
import {Dialog,DialogClose,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from "@/app/components/ui/dialog";
import {getMenuPreviewAccessDevice,getServerMenuPreviewAccessDevice,subscribeMenuPreviewAccess} from "@/lib/menu-preview-access-device";

const SESSION_KEY="artimenu:mobile-preview-entry:v1";
const SEEN_EVENT="artimenu:mobile-preview-entry-seen";
let seenThisVisit=false;
function getSeenSnapshot() {
  try {return seenThisVisit||sessionStorage.getItem(SESSION_KEY)==="seen";} catch {return seenThisVisit;}
}
function subscribeSeen(onChange:()=>void) {
  window.addEventListener(SEEN_EVENT,onChange);
  return ()=>window.removeEventListener(SEEN_EVENT,onChange);
}
const getServerSeenSnapshot=()=>true;

/** Preview workspace only; actual tabs, embedded previews and QR menus omit it. */
export default function MobilePreviewEntryNotice() {
  const device=useSyncExternalStore(subscribeMenuPreviewAccess,getMenuPreviewAccessDevice,getServerMenuPreviewAccessDevice);
  const seen=useSyncExternalStore(subscribeSeen,getSeenSnapshot,getServerSeenSnapshot);
  const dismiss=()=>{
    seenThisVisit=true;
    try {sessionStorage.setItem(SESSION_KEY,"seen");} catch { /* Closing must still work in restricted browsers. */ }
    window.dispatchEvent(new Event(SEEN_EVENT));
  };
  return <Dialog open={device==="phone"&&!seen} onOpenChange={open=>{if(!open)dismiss();}}>
    <DialogContent layer="preview" data-preview-mobile-entry="">
      <DialogHeader reserveCloseButton>
        <DialogTitle>PC에서 더 편하게 볼 수 있어요</DialogTitle>
        <DialogDescription>넓은 화면에서 템플릿의 전체 구성과 디자인 옵션을 자세히 확인할 수 있습니다.</DialogDescription>
      </DialogHeader>
      <DialogFooter><DialogClose asChild><Button type="button">모바일로 계속 보기</Button></DialogClose></DialogFooter>
    </DialogContent>
  </Dialog>;
}
