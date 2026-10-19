"use client";

import { usePathname } from "next/navigation";

import Navbar from "@/app/components/layout/Navbar";
import ScrollToTopButton from "@/app/components/ui/ScrollToTop";

export default function OfficialSiteNavbar({ showQuickMenu = true }: { showQuickMenu?: boolean }) {
  const pathname = usePathname();
  const shouldShowQuickMenu =
    showQuickMenu &&
    !pathname.startsWith("/menu/") &&
    !pathname.startsWith("/m/") &&
    !pathname.includes("/preview");

  return (
    <>
      <Navbar />
      {shouldShowQuickMenu ? <ScrollToTopButton /> : null}
      <div className="site-header-spacer" aria-hidden="true" />
    </>
  );
}
