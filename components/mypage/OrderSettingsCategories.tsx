"use client";
import { useState, type ReactNode } from "react";
import { Bell, CreditCard, MessageCircle } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
export default function OrderSettingsCategories({
  payment,
  notifications,
  ready,
}: {
  payment: ReactNode;
  notifications: ReactNode;
  ready: ReactNode;
}) {
  const [category, setCategory] = useState("payment");
  return (
    <Tabs purpose="state" value={category} onValueChange={setCategory}>
      <TabsList aria-label="주문 설정 분류">
        <TabsTrigger value="payment">
          <CreditCard aria-hidden="true" />
          결제 방식
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell aria-hidden="true" />
          주문 알림
        </TabsTrigger>
        <TabsTrigger value="ready">
          <MessageCircle aria-hidden="true" />
          조리완료 알림톡
        </TabsTrigger>
      </TabsList>
      <TabsContent forceMount hidden={category !== "payment"} value="payment">
        {payment}
      </TabsContent>
      <TabsContent
        forceMount
        hidden={category !== "notifications"}
        value="notifications"
      >
        {notifications}
      </TabsContent>
      <TabsContent forceMount hidden={category !== "ready"} value="ready">
        {ready}
      </TabsContent>
    </Tabs>
  );
}
