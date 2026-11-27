import type { ReactNode } from "react";
import Link from "next/link";
import { ContentPanel } from "@/app/components/ui/content-panel";

type MenuDetail = { label: string; value: string };

/** Identity, state, essential details and existing actions share one compact work surface. */
export default function MenuSummaryCard({ cardKey, name, serviceLabel, thumbnail, badges, details, supportingDetails = [], status, actions, secondaryActions, billingHref, billingLabel = "구독 정보", lifecycle }: {
  cardKey: string;
  name: string;
  serviceLabel: string;
  thumbnail: ReactNode;
  badges: ReactNode;
  details: MenuDetail[];
  supportingDetails?: MenuDetail[];
  status?: ReactNode;
  actions?: ReactNode;
  secondaryActions?: ReactNode;
  billingHref?: string;
  billingLabel?: string;
  lifecycle: "active" | "holding" | "deleted";
}) {
  const headingId = `menu-card-${cardKey}`;
  return <ContentPanel as="article" aria-labelledby={headingId} data-menu-lifecycle={lifecycle} density="compact">
    <div className="site-menu-card">
      <div className="site-menu-card-media">{thumbnail}</div>
      <div className="site-menu-card-body">
        <div className="site-menu-card-header">
          <div className="site-stack-detail min-w-0">
            <h2 id={headingId} className="type-content-title site-menu-card-title" title={name}>{name}</h2>
            <p className="type-caption site-copy-muted">{serviceLabel}</p>
          </div>
          <div className="site-menu-card-badges">{badges}</div>
        </div>
        {details.length ? <dl className="site-menu-card-meta">
          {details.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl> : null}
        {supportingDetails.length ? <dl className="site-menu-card-supporting">
          {supportingDetails.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl> : null}
        {lifecycle === "deleted" ? <div className="site-menu-card-state-row">
          {status ? <p className="type-body-sm site-copy-muted">{status}</p> : null}
          {billingHref ? <Link href={billingHref} className="site-button site-button-link">{billingLabel}</Link> : null}
        </div> : <>
          {status ? <p className="type-body-sm site-copy-muted site-menu-card-status">{status}</p> : null}
          {actions || secondaryActions || billingHref ? <div className="site-menu-card-toolbar site-stack-copy">
            {actions ? <div className="site-action-row site-menu-card-actions">{actions}</div> : null}
            {secondaryActions ? <div className="site-action-row site-menu-card-secondary-actions">{secondaryActions}</div> : null}
            {billingHref ? <Link href={billingHref} className="site-button site-button-link">{billingLabel}</Link> : null}
          </div> : null}
        </>}
      </div>
    </div>
  </ContentPanel>;
}
