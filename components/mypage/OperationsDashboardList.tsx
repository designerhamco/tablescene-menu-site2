import Link from "next/link";
import type { ReactNode } from "react";
import { ContentPanel } from "@/app/components/ui/content-panel";

export default function OperationsDashboardList({ title, emptyLabel, href, hasItems, children }: {
  title: string; emptyLabel: string; href: string | null; hasItems: boolean; children: ReactNode;
}) {
  return <ContentPanel as="article">
    <div className="site-content-heading-row"><h3 className="type-content-title">{title}</h3>{href ? <Link href={href} className="site-button site-button-outline">전체 보기</Link> : null}</div>
    {hasItems ? <ul className="site-stack-block">{children}</ul> : <p className="type-body-sm site-copy-muted">{emptyLabel}</p>}
  </ContentPanel>;
}
