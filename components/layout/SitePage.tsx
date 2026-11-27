import type { SiteIntroDescriptionProps } from "@/lib/site-copy-policy";
import type { ReactNode } from "react";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import SitePageHeader from "./SitePageHeader";
import SiteAccountLayout from "./SiteAccountLayout";
import type { SiteBreadcrumbItem } from "./SiteBreadcrumb";

/** Standard site pages inherit their shell and intro rhythm; no per-page style overrides. */
export default function SitePage({ title, description, descriptionPurpose, children, align = "center", typography = "standard", breadcrumbs, sidebar }: {
  title: ReactNode;
  breadcrumbs?: readonly SiteBreadcrumbItem[];
  sidebar?: ReactNode;
  children: ReactNode;
  align?: "center" | "start";
  typography?: "standard" | "management";
} & SiteIntroDescriptionProps) {
  const heading = descriptionPurpose
    ? <SitePageHeader title={title} align={align} breadcrumbs={breadcrumbs} description={description} descriptionPurpose={descriptionPurpose} />
    : <SitePageHeader title={title} align={align} breadcrumbs={breadcrumbs} />;
  const content = <div className="site-page-content">{children}</div>;

  return (
    <>
      <OfficialSiteNavbar />
      <main className={`site-page-spacing-compact min-h-screen bg-white text-zinc-950${typography === "management" ? " site-management-scope" : ""}`}>
        <div className="site-container">
          {sidebar ? <SiteAccountLayout heading={heading} sidebar={sidebar}>{content}</SiteAccountLayout> : <>{heading}{content}</>}
        </div>
      </main>
      <Footer />
    </>
  );
}
