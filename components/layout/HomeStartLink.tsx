"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ComponentProps } from "react";
import { scrollToHomeStart } from "@/lib/service-home-scroll";

// A client-side route change may remount the header. Preserve only the explicit
// brand-navigation intent; ordinary visits/back navigation keep their semantics.
let homeStartRequested = false;

export default function HomeStartLink(props: Omit<ComponentProps<typeof Link>, "href" | "onNavigate">) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/" || !homeStartRequested) return;
    homeStartRequested = false;
    // The shared intent owns its lifecycle (newer navigation or user input),
    // so closing/remounting a mobile header cannot cancel the requested reset.
    scrollToHomeStart();
  }, [pathname]);
  return <Link {...props} href="/" onNavigate={event => {
    if (window.location.pathname !== "/") {
      homeStartRequested = true;
      return;
    }
    event.preventDefault();
    homeStartRequested = false;
    if (window.location.hash || window.location.search) window.history.pushState(window.history.state, "", "/");
    scrollToHomeStart();
  }} />;
}
