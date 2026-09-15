"use client";

import { usePathname } from "next/navigation";

import Navbar from "@/app/components/layout/Navbar";
import ScrollToTopButton from "@/app/components/ui/ScrollToTop";

export default function OfficialSiteNavbar() {
  const pathname = usePathname();
  const shouldShowQuickMenu =
    !pathname.startsWith("/menu/") &&
    !pathname.startsWith("/m/") &&
    !pathname.includes("/preview");

  return (
    <>
      <Navbar />
      {shouldShowQuickMenu ? <ScrollToTopButton /> : null}
      <div className="h-20" aria-hidden="true" />
    </>
  );
}
