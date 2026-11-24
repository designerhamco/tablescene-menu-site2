"use client";

import { useEffect, useRef } from "react";

import { NavigationTabs } from "@/app/components/ui/navigation-tabs";

import { MENU_EDITOR_TABS, type MenuEditorTabKey } from "@/lib/menu-editor";

type MenuEditorNavigationProps = {
  menuId: string;
  activeTab: MenuEditorTabKey;
  sidebar?: boolean;
  tabs?: readonly {
    key: MenuEditorTabKey;
    label: string;
    status?: "ready" | "todo";
    disabledReason?: string;
  }[];
};

export default function MenuEditorNavigation({ menuId, activeTab, sidebar = false, tabs = MENU_EDITOR_TABS }: MenuEditorNavigationProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const previousTab = useRef(activeTab);

  useEffect(() => {
    const changed = previousTab.current !== activeTab;
    previousTab.current = activeTab;
    const workspace = shellRef.current?.parentElement;
    if (!sidebar || !changed || !workspace) return;

    const headerHeight = Number.parseFloat(getComputedStyle(workspace).scrollMarginBlockStart) || 0;
    if (workspace.getBoundingClientRect().top < headerHeight) {
      workspace.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [activeTab, sidebar]);

  return (
    <div ref={shellRef} className={sidebar ? "site-editor-navigation" : "site-card site-card-compact mb-6 site-editor-navigation px-4"}>
      <NavigationTabs label="메뉴 편집 설정" purpose="page" layout={sidebar ? "responsive-sidebar" : undefined} scroll={sidebar ? false : undefined} items={tabs.map(item => ({
        label: item.label,
        href: `/mypage/menus/${menuId}/edit?tab=${item.key}`,
        active: activeTab === item.key,
        disabledReason: item.disabledReason,
        statusLabel: item.status === "todo" ? "준비 중" : undefined,
      }))} />
    </div>
  );
}
