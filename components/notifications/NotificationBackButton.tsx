"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";

export default function NotificationBackButton() {
  const router = useRouter();
  return <Button variant="ghost" size="icon" aria-label="이전 화면으로 돌아가기" onClick={() => {
    if (window.history.length > 1) router.back();
    else router.replace("/");
  }}><ArrowLeft aria-hidden="true" /></Button>;
}
