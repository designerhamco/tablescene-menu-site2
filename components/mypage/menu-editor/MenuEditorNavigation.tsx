"use client";

import Link from "next/link";

import { MENU_EDITOR_TABS, type MenuEditorTabKey } from "@/lib/menu-editor";

type MenuEditorNavigationProps = {
  menuId: string;
  activeTab: MenuEditorTabKey;
  tabs?: readonly {
    key: MenuEditorTabKey;
    label: string;
    status?: "ready" | "todo";
    disabledReason?: string;
  }[];
};

export default function MenuEditorNavigation({ menuId, activeTab, tabs = MENU_EDITOR_TABS }: MenuEditorNavigationProps) {
  return (
    <nav className="mb-6 rounded-lg bg-white p-3 shadow-sm">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((item) => {
          if (item.disabledReason) {
            return (
              <span
                key={item.key}
                aria-disabled="true"
                aria-label={`${item.label} 권한 없음: ${item.disabledReason}`}
                title={item.disabledReason}
                className="shrink-0 cursor-not-allowed rounded-full bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-300"
              >
                {item.label}
                <span className="ml-1.5 text-[10px] font-black">권한 없음</span>
              </span>
            );
          }

          return (
            <Link
              key={item.key}
              href={`/mypage/menus/${menuId}/edit?tab=${item.key}`}
              className={`shrink-0 rounded-full px-4 py-3 text-sm font-bold transition-colors ${
                activeTab === item.key ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950"
              }`}
            >
              {item.label}
              {item.status === "todo" ? <span className="ml-1 text-[10px] opacity-70">준비 중</span> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
