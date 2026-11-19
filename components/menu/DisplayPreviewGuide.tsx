"use client";

import { useState, useSyncExternalStore } from "react";
import { CircleHelp } from "@/app/components/ui/site-icon";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";

const SESSION_KEY = "artimenu:display-preview-guide:v1";
const SEEN_EVENT = "artimenu:display-preview-guide-seen";
let dismissedThisVisit = false;
function getSeen() {
  try { return dismissedThisVisit || sessionStorage.getItem(SESSION_KEY) === "seen"; }
  catch { return dismissedThisVisit; }
}
function subscribe(onChange: () => void) {
  window.addEventListener(SEEN_EVENT, onChange);
  return () => window.removeEventListener(SEEN_EVENT, onChange);
}

export default function DisplayPreviewGuide({ tabIndex }: { tabIndex?: number }) {
  const seen = useSyncExternalStore(subscribe, getSeen, () => true);
  const [requested, setRequested] = useState(false);
  const changeOpen = (open: boolean) => {
    setRequested(open);
    if (!open) {
      dismissedThisVisit = true;
      try { sessionStorage.setItem(SESSION_KEY, "seen"); } catch { /* Keep dismissal usable without storage. */ }
      window.dispatchEvent(new Event(SEEN_EVENT));
    }
  };
  return <Dialog open={requested || !seen} onOpenChange={changeOpen}>
    <DialogTrigger asChild><button type="button" className="site-preview-control site-preview-control-icon" aria-label="디스플레이 미리보기 안내" title="디스플레이 미리보기 안내" tabIndex={tabIndex}>
      <CircleHelp className="h-4 w-4" aria-hidden="true" />
    </button></DialogTrigger>
    <DialogContent layer="preview" data-display-preview-guide="">
      <DialogHeader reserveCloseButton>
        <DialogTitle>디스플레이 미리보기 안내</DialogTitle>
        <DialogDescription>상단의 이전·다음 버튼으로 페이지를 넘기고, 가운데 숫자로 현재 페이지를 확인하세요.</DialogDescription>
      </DialogHeader>
      <div className="site-stack-copy type-body-sm">
        <p>화면 아래쪽에 마우스를 가져가면 언어 변경 메뉴가 나타납니다. 터치 화면에서는 메뉴판 아래쪽을 눌러주세요.</p>
        <p>실제 화면 보기를 열면 페이지가 8초마다 자동으로 넘어갑니다. 새 창에서 전체화면 보기도 사용할 수 있습니다.</p>
      </div>
      <DialogFooter><DialogClose asChild><Button type="button">확인</Button></DialogClose></DialogFooter>
    </DialogContent>
  </Dialog>;
}
