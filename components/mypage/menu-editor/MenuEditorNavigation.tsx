"use client";

import Link from "next/link";

import { MENU_EDITOR_TABS, type MenuEditorTabKey } from "@/lib/menu-editor";

type MenuEditorNavigationProps = {
  menuId: string;
  activeTab: MenuEditorTabKey;
  tabs?: readonly { key: MenuEditorTabKey; label: string }[];
};

export default function MenuEditorNavigation({ menuId, activeTab, tabs = MENU_EDITOR_TABS }: MenuEditorNavigationProps) {
  return (
    <nav className="mb-6 rounded-lg bg-white p-3 shadow-sm">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={`/mypage/menus/${menuId}/edit?tab=${item.key}`}
            className={`shrink-0 rounded-full px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === item.key ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
