"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "@/app/components/ui/site-icon";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { NotificationSheet } from "@/app/components/ui/notification-sheet";
import { NotificationPanel } from "@/app/components/ui/notification-panel";
import MobileSiteMenu from "@/components/layout/MobileSiteMenu";
import styles from "@/app/components/layout/Navbar.module.css";

export default function MobileNavigationExamples() {
  const [variant, setVariant] = useState("guest");
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div className="site-stack-block">
    <Tabs purpose="state" value={variant} onValueChange={setVariant}><TabsList size="sm" aria-label="전체 메뉴 계정 예시"><TabsTrigger value="guest">로그인 전</TabsTrigger><TabsTrigger value="owner">사장</TabsTrigger><TabsTrigger value="staff">직원</TabsTrigger></TabsList></Tabs>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><Button ref={trigger} variant="outline"><Menu size={18} aria-hidden="true" />전체 메뉴 예시 열기</Button></Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className={styles.drawerOverlay} /><Dialog.Content className={styles.drawer} onCloseAutoFocus={event => { if (notificationsOpen) event.preventDefault(); }}><Dialog.Title className="sr-only">전체 메뉴 디자인 예시</Dialog.Title><Dialog.Description className="sr-only">예시 계정으로 모바일 메뉴를 확인합니다.</Dialog.Description>
        <MobileSiteMenu pathname="/guides" authenticated={variant !== "guest"} loading={false} account={{ name: "아티메뉴 카페", email: "sample@example.com", role: variant === "owner" ? "사장" : "직원" }} showOperations={variant !== "guest"} unreadCount={variant === "guest" ? 0 : 3} close={() => setOpen(false)} onNotifications={() => { setOpen(false); setNotificationsOpen(true); }} closeButton={<Dialog.Close className="site-button site-button-icon site-button-ghost" aria-label="메뉴 닫기"><X size={24} aria-hidden="true" /></Dialog.Close>} signOutControl={<Button variant="outline" onClick={() => setVariant("guest")}>로그아웃</Button>} />
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    <NotificationSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} returnFocusRef={trigger}><NotificationPanel compact layout="sheet" items={[]} /></NotificationSheet>
    <p className="type-body-sm">오른쪽에서 전체 너비로 열립니다. 계정 링크는 로그인 전후 같은 스타일을 쓰며, 로그인 후에만 알림과 계정 옆 로그아웃을 표시합니다. 예시의 로그아웃은 실제 계정에 영향을 주지 않습니다.</p>
  </div>;
}
