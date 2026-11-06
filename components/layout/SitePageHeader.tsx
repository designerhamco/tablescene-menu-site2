import type { SiteIntroDescriptionProps } from "@/lib/site-copy-policy";
import type { ReactNode } from "react";

/** Title-only by default; necessary descriptions declare their purpose and keep shared rhythm. */
export default function SitePageHeader({ title, description, descriptionPurpose, align = "center", children, id }: {
  title: ReactNode;
  align?: "center" | "start";
  children?: ReactNode;
  id?: string;
} & SiteIntroDescriptionProps) {
  return <header className="site-page-intro" data-align={align} data-copy-purpose={description ? descriptionPurpose : undefined}>
    <h1 id={id} className="type-page-title">{title}</h1>
    {description ? <p className="type-page-description">{description}</p> : null}
    {children}
  </header>;
}
