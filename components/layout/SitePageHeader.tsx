import type { ReactNode } from "react";

/** The normal site page title, description and first-content rhythm. */
export default function SitePageHeader({ title, description, align = "center", children, id }: {
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "start";
  children?: ReactNode;
  id?: string;
}) {
  return <header className="site-page-intro" data-align={align}>
    <h1 id={id} className="type-page-title">{title}</h1>
    {description ? <p className="type-page-description">{description}</p> : null}
    {children}
  </header>;
}
