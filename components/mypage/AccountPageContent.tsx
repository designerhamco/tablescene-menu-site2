import type { ReactNode } from "react";
import SitePageHeader from "@/components/layout/SitePageHeader";

/** One title boundary, sidebar and content rhythm for every account screen. */
export default function AccountPageContent({ sidebar, children, title, actions }: { sidebar: ReactNode; children: ReactNode; title: string; actions?: ReactNode }) {
  return (
    <div className="site-container">
      <SitePageHeader title={title} align="start" actions={actions} breadcrumbs={[{ label: "마이페이지", href: "/mypage" }, { label: title }]} />
      <div className="site-account-layout">
        <aside className="site-account-sidebar min-w-0">{sidebar}</aside>
        <div className="site-stack-content min-w-0">{children}</div>
      </div>
    </div>
  );
}
