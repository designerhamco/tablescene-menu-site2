"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import MobileSiteMenu from "@/components/layout/MobileSiteMenu";
import styles from "@/app/components/layout/Navbar.module.css";

export default function MobileNavigationExamples() {
  const [variant, setVariant] = useState("guest");
  const [open, setOpen] = useState(false);
  return <div className="site-stack-block">
    <Tabs purpose="state" value={variant} onValueChange={setVariant}><TabsList size="sm" aria-label="전체 메뉴 계정 예시"><TabsTrigger value="guest">로그인 전</TabsTrigger><TabsTrigger value="owner">사장</TabsTrigger><TabsTrigger value="staff">직원</TabsTrigger></TabsList></Tabs>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><Button variant="outline"><Menu size={18} aria-hidden="true" />전체 메뉴 예시 열기</Button></Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className={styles.drawerOverlay} /><Dialog.Content className={styles.drawer}><Dialog.Title className="sr-only">전체 메뉴 디자인 예시</Dialog.Title><Dialog.Description className="sr-only">예시 계정으로 모바일 메뉴를 확인합니다.</Dialog.Description>
        <MobileSiteMenu pathname="/guides" authenticated={variant !== "guest"} loading={false} account={{ name: "아티메뉴 카페", email: "sample@example.com", role: variant === "owner" ? "사장" : "직원" }} showOperations={variant !== "guest"} unreadCount={variant === "guest" ? 0 : 3} close={() => setOpen(false)} closeButton={<Dialog.Close className="site-button site-button-icon site-button-ghost" aria-label="메뉴 닫기"><X size={24} aria-hidden="true" /></Dialog.Close>} signOutControl={<Button variant="ghost" onClick={() => setVariant("guest")}>로그아웃</Button>} />
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    <p className="type-body-sm">만들기·알림·계정은 별도 행동 영역에, 고객센터는 같은 단계의 펼침 메뉴에 둡니다. 예시의 로그아웃은 실제 계정에 영향을 주지 않습니다.</p>
  </div>;
}
