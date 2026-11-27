import type { ReactNode } from "react";

export default function SiteAccountLayout({ heading, sidebar, children }: {
  heading: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="site-account-layout">
      {heading}
      {sidebar}
      <div className="site-account-content">{children}</div>
    </div>
  );
}
