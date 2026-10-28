"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function OperationSiteSelector({ selectedId, items }: {
  selectedId: string;
  items: Array<{ id: string; label: string; href: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="site-card p-4">
      <label htmlFor="operation-menu-site" className="type-label mb-2 block">운영할 메뉴판</label>
      <select id="operation-menu-site" className="site-field w-full min-w-0" value={selectedId} disabled={pending} aria-busy={pending}
        onChange={event => {
          const item = items.find(item => item.id === event.target.value);
          if (item) startTransition(() => router.push(item.href));
        }}>
        {items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </div>
  );
}
