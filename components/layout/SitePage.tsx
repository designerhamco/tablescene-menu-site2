import type { ReactNode } from "react";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import SitePageHeader from "./SitePageHeader";

/** Standard site pages inherit their shell and intro rhythm; no per-page style overrides. */
export default function SitePage({ title, description, children, align = "center" }: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-page-spacing-compact min-h-screen bg-white text-zinc-950">
        <div className="site-container">
          <SitePageHeader title={title} description={description} align={align} />
          <div className="site-page-content">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
