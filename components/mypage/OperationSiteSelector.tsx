"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/app/components/ui/loading-state";

export default function OperationSiteSelector({ selectedId, items }: {
  selectedId: string;
  items: Array<{ id: string; label: string; href: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="site-account-summary">
      <div className="site-stack-copy">
        <label htmlFor="operation-menu-site" className="type-label block">운영할 메뉴판</label>
        <select id="operation-menu-site" className="site-field w-full min-w-0" value={selectedId} disabled={pending} aria-busy={pending}
          onChange={event => {
            const item = items.find(item => item.id === event.target.value);
            if (item) startTransition(() => router.push(item.href));
          }}>
          {items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      {pending ? <LoadingState label="운영할 메뉴판을 불러오는 중입니다." inline /> : null}
    </div>
  );
}
