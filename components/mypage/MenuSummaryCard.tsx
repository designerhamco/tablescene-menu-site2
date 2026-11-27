import type { ReactNode } from "react";
import Link from "next/link";
import { ContentPanel } from "@/app/components/ui/content-panel";
import MenuLinkCopyButton from "./MenuLinkCopyButton";

type MenuDetail = { label: string; value: string };

/** Identity, state, essential details and existing actions share one compact work surface. */
export default function MenuSummaryCard({ cardKey, name, publicPath, thumbnail, badges, details, supportingDetails = [], status, actions, billingHref, billingLabel = "구독 정보", lifecycle }: {
  cardKey: string;
  name: string;
  publicPath: string;
  thumbnail: ReactNode;
  badges: ReactNode;
  details: MenuDetail[];
  supportingDetails?: MenuDetail[];
  status?: ReactNode;
  actions?: ReactNode;
  billingHref?: string;
  billingLabel?: string;
  lifecycle: "active" | "holding" | "deleted";
}) {
  const headingId = `menu-card-${cardKey}`;
  return <ContentPanel as="article" aria-labelledby={headingId} data-menu-lifecycle={lifecycle}>
    <div className="site-menu-card">
      <div className="site-menu-card-media">{thumbnail}</div>
      <div className="site-menu-card-body">
        <div className="site-menu-card-header">
          <div className="site-stack-detail min-w-0">
            <h2 id={headingId} className="type-content-title">{name}</h2>
            <div className="site-action-row"><p className="type-caption site-copy-muted site-menu-card-path">{publicPath}</p>
              {lifecycle !== "deleted" && publicPath !== "/menu/" ? <MenuLinkCopyButton path={publicPath} name={name} /> : null}
            </div>
          </div>
          <div className="site-menu-card-badges">{badges}</div>
        </div>
        <dl className="site-menu-card-meta">
          {details.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl>
        {lifecycle === "deleted" ? <div className="site-menu-card-state-row">
          {status ? <p className="type-body-sm site-copy-muted">{status}</p> : null}
          {billingHref ? <Link href={billingHref} className="site-button site-button-link">{billingLabel}</Link> : null}
        </div> : <>
          {status ? <p className="type-body-sm site-copy-muted site-menu-card-status">{status}</p> : null}
          {actions || billingHref ? <div className="site-menu-card-toolbar site-content-divider">
            {actions ? <div className="site-action-row site-menu-card-actions">{actions}</div> : null}
            {billingHref ? <Link href={billingHref} className="site-button site-button-link">{billingLabel}</Link> : null}
          </div> : null}
        </>}
        {supportingDetails.length ? <dl className="site-menu-card-supporting">
          {supportingDetails.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
        </dl> : null}
      </div>
    </div>
  </ContentPanel>;
}
