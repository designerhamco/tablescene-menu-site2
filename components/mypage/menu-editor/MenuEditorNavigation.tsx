"use client";

import { NavigationTabs } from "@/app/components/ui/navigation-tabs";

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
    <div className="site-card site-card-compact mb-6 site-editor-navigation px-4">
      <NavigationTabs label="메뉴 편집 설정" purpose="page" items={tabs.map(item => ({
        label: item.label,
        href: `/mypage/menus/${menuId}/edit?tab=${item.key}`,
        active: activeTab === item.key,
        disabledReason: item.disabledReason,
        statusLabel: item.status === "todo" ? "준비 중" : undefined,
      }))} />
    </div>
  );
}
