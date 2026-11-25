"use client";

import { Button } from "@/app/components/ui/button";
import { Copy } from "@/app/components/ui/site-icon";
import { getConfiguredPublicMenuOrigin } from "@/lib/menu-url";
import { toast } from "sonner";

export default function MenuLinkCopyButton({ path, name }: { path: string; name: string }) {
  async function copy() {
    try {
      const url = new URL(path, getConfiguredPublicMenuOrigin() ?? window.location.origin).href;
      await navigator.clipboard.writeText(url);
      toast.success("메뉴판 전체 링크를 복사했습니다.");
    } catch {
      toast.error("링크를 복사하지 못했습니다. 다시 시도해 주세요.");
    }
  }
  return <Button type="button" variant="outline" size="icon" iconSize="compact" iconAppearance="framed"
    aria-label={`${name} 전체 링크 복사`} title="전체 링크 복사" onClick={copy}><Copy /></Button>;
}
