import type { ReactNode } from "react";
import SitePageHeader from "@/components/layout/SitePageHeader";

/** One title boundary, sidebar and content rhythm for every account screen. */
export default function AccountPageContent({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="site-container">
      <SitePageHeader title="마이페이지" align="start" />
      <div className="site-account-layout">
        <aside className="site-account-sidebar min-w-0">{sidebar}</aside>
        <div className="site-stack-content min-w-0">{children}</div>
      </div>
    </div>
  );
}
