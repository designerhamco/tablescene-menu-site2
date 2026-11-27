import type { SiteIntroDescriptionProps } from "@/lib/site-copy-policy";
import type { ReactNode } from "react";
import SiteBreadcrumb, { type SiteBreadcrumbItem } from "./SiteBreadcrumb";

/** Title-only by default; necessary descriptions declare their purpose and keep shared rhythm. */
export default function SitePageHeader({ title, description, descriptionPurpose, align = "center", titleRole = "page", children, id, breadcrumbs, actions }: {
  title: ReactNode;
  align?: "center" | "start";
  titleRole?: "page" | "hero";
  children?: ReactNode;
  id?: string;
  breadcrumbs?: readonly SiteBreadcrumbItem[];
  actions?: ReactNode;
} & SiteIntroDescriptionProps) {
  return <header className="site-page-intro" data-align={align} data-copy-purpose={description ? descriptionPurpose : undefined}>
    {breadcrumbs?.length ? <SiteBreadcrumb items={breadcrumbs} /> : null}
    {actions ? <div className="site-content-heading-row"><h1 id={id} className={titleRole === "hero" ? "type-display" : "type-page-title"}>{title}</h1><div className="site-action-row">{actions}</div></div> : <h1 id={id} className={titleRole === "hero" ? "type-display" : "type-page-title"}>{title}</h1>}
    {description ? <p className="type-page-description">{description}</p> : null}
    {children}
  </header>;
}
