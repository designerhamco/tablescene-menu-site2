"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

/** Mobile presentation of the shared inbox; it never changes the current route. */
export function NotificationSheet({ open, onOpenChange, returnFocusRef, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="site-dialog-sheet site-notification-sheet" data-site-notification-sheet aria-describedby={undefined}
      onOpenAutoFocus={event => { event.preventDefault(); title.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={event => {
        if (returnFocusRef.current?.isConnected) {
          event.preventDefault();
          returnFocusRef.current.focus({ preventScroll: true });
        }
      }}>
      <div className="site-notification-sheet-header"><SheetTitle className="site-dialog-title" ref={title} tabIndex={-1}>알림</SheetTitle></div>
      {children}
    </SheetContent>
  </Sheet>;
}
