import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@/app/components/ui/site-arrow";
import { cn } from "./utils";

export function MetricCard({ label, value, detail, icon, tone = "neutral", href, surface = "default", footer, status, variant = "metric" }: {
  label: string; value: ReactNode; detail?: ReactNode; icon?: ReactNode;
  tone?: "neutral" | "brand" | "blue" | "green" | "red"; href?: string | null;
  surface?: "default" | "muted";
  footer?: ReactNode;
  status?: ReactNode;
  variant?: "metric" | "status";
}) {
  const content = <><div className="site-metric-heading">
    {icon ? <span className="site-metric-icon site-indicator-icon" data-icon-surface={surface === "muted" ? "colored" : "white"} data-tone={tone} aria-hidden="true">{icon}</span> : null}
    <span className="site-metric-label">{label}</span>{status}{href ? <ArrowUpRight className="site-metric-arrow" size={16} aria-hidden="true" /> : null}
  </div><p className="site-metric-value">{value}</p>{detail ? <p className="site-metric-detail">{detail}</p> : null}</>;
  if (footer) return <article className="site-metric-card" data-surface={surface} data-variant={variant}>
    {href ? <Link href={href} className="site-metric-content site-metric-link">{content}</Link> : <div className="site-metric-content">{content}</div>}
    <div className="site-metric-controls">{footer}</div>
  </article>;
  return href ? <Link href={href} className="site-metric-card site-metric-link" data-surface={surface} data-variant={variant}>{content}</Link> : <article className="site-metric-card" data-surface={surface} data-variant={variant}>{content}</article>;
}

export function FilterPanel({ children, footer, className, ...props }: ComponentProps<"div"> & { footer?: ReactNode }) {
  return <div className={cn("site-filter-panel", className)} {...props}>{children}{footer ? <div className="site-filter-footer">{footer}</div> : null}</div>;
}

export function RecordCard({ children, actions, aside, className, ...props }: ComponentProps<"article"> & { actions?: ReactNode; aside?: ReactNode }) {
  return <article className={cn("site-record-card", className)} {...props}><div className="site-record-card-layout"><div className="site-record-card-main">{children}{actions ? <div className="site-record-card-actions">{actions}</div> : null}</div>{aside ? <aside className="site-record-card-aside">{aside}</aside> : null}</div></article>;
}

export function KeyValueList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return <dl className="site-key-values">{items.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}

export function AnnouncementBar({ children, label = "안내", href, surface = "default" }: { children: ReactNode; label?: string; href?: string; surface?: "default" | "muted" }) {
  const content=<><span className="site-announcement-label">{label}</span><span className="site-announcement-copy">{children}</span>{href ? <ArrowUpRight size={16} aria-hidden="true" /> : null}</>;
  return href ? <Link href={href} className="site-announcement" data-surface={surface}>{content}</Link> : <div className="site-announcement" data-surface={surface} role="status">{content}</div>;
}
