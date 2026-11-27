import type { ReactNode } from "react";
import { ContentPanel } from "@/app/components/ui/content-panel";

type MenuDetail = { label: string; value: string };

/** Identity, state and existing actions share one compact work surface. */
export default function MenuSummaryCard({ cardKey, name, serviceLabel, thumbnail, titleAction, badges, supportingDetails = [], status, actions, billingAction, lifecycle }: {
  cardKey: string;
  name: string;
  serviceLabel: string;
  thumbnail: ReactNode;
  titleAction?: ReactNode;
  badges: ReactNode;
  supportingDetails?: MenuDetail[];
  status?: ReactNode;
  actions?: ReactNode;
  billingAction?: ReactNode;
  lifecycle: "active" | "holding" | "deleted";
}) {
  const headingId = `menu-card-${cardKey}`;
  return <ContentPanel as="article" aria-labelledby={headingId} data-menu-lifecycle={lifecycle} density="compact">
    <div className="site-menu-card">
      <div className="site-menu-card-media">{thumbnail}</div>
      <div className="site-menu-card-body">
        <div className="site-menu-card-header">
          <div className="site-stack-detail min-w-0">
            <div className="site-menu-card-title-row">
              <h2 id={headingId} className="type-content-title site-menu-card-title" title={name}>{name}</h2>
              {titleAction}
            </div>
            <p className="type-caption site-copy-muted">{serviceLabel}</p>
          </div>
          <div className="site-menu-card-badges">{badges}</div>
        </div>
        {supportingDetails.length ? <dl className="site-menu-card-supporting">
          {supportingDetails.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl> : null}
        {lifecycle === "deleted" ? <div className="site-menu-card-state-row">
          {status ? <p className="type-body-sm site-copy-muted">{status}</p> : null}
          {billingAction}
        </div> : <>
          {status ? <p className="type-body-sm site-copy-muted site-menu-card-status">{status}</p> : null}
          {actions || billingAction ? <div className="site-menu-card-toolbar site-stack-copy">
            {actions ? <div className="site-menu-card-actions">{actions}</div> : null}
            {billingAction}
          </div> : null}
        </>}
      </div>
    </div>
  </ContentPanel>;
}
