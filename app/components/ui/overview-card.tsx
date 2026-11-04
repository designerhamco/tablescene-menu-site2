import type { ReactNode } from "react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { ContentPanel } from "./content-panel";

/** Text-first summaries with independent help, state controls and navigation. */
export function OverviewCard({ label, value, detail, help, control, footer }: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  help?: ReactNode;
  control?: ReactNode;
  footer?: ReactNode;
}) {
  return <ContentPanel as="article" data-component="overview-card" data-has-footer={Boolean(footer)}>
    <div className="site-overview-card-body" data-has-control={Boolean(control)}>
      <div className="site-action-row site-overview-card-heading">
        <p className="type-label">{label}</p>
        {help ? <InfoTooltip label={`${label} 안내`} compactOnMobile>{help}</InfoTooltip> : null}
      </div>
      {control ? <div className="site-overview-card-control">{control}</div> : null}
      <p className="type-metric site-overview-card-value">{value}</p>
      {detail ? <p className="type-body-sm site-copy-muted site-overview-card-detail">{detail}</p> : null}
    </div>
    {footer ? <div className="site-content-divider site-action-row">{footer}</div> : null}
  </ContentPanel>;
}

export function OverviewCardGroup({ label, children }: { label: string; children: ReactNode }) {
  return <section className="site-overview-grid" aria-label={label}>{children}</section>;
}

/** Omit repeated context on phones while preserving the desktop copy. */
export function OverviewCardResponsiveLabel({ children, compact }: { children: ReactNode; compact: string }) {
  return <><span className="hidden sm:inline">{children}</span><span className="sm:hidden">{compact}</span></>;
}
