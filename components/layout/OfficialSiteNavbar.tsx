"use client";

import { usePathname } from "next/navigation";

import Navbar from "@/app/components/layout/Navbar";
import { getSiteHeaderSurface } from "@/lib/site-header-policy";
import ScrollToTopButton from "@/app/components/ui/ScrollToTop";
import AiSupportChatLauncher from "@/app/support/chat/AiSupportChatLauncher";

export default function OfficialSiteNavbar({ showSupportLauncher = true }: { showSupportLauncher?: boolean }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const shouldShowSupportLauncher =
    showSupportLauncher &&
    !pathname.startsWith("/menu/") &&
    !pathname.startsWith("/m/") &&
    !pathname.includes("/preview");

  return (
    <>
      <Navbar />
      {shouldShowSupportLauncher ? <AiSupportChatLauncher /> : null}
      {isHome ? <ScrollToTopButton adaptToBackdrop /> : null}
      <div className="site-header-spacer" data-header-surface={getSiteHeaderSurface(pathname)} data-home-hero={isHome || undefined} aria-hidden="true" />
    </>
  );
}
