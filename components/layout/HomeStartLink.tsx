"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, type ComponentProps } from "react";
import { flushSync } from "react-dom";
import { scrollToHomeStart } from "@/lib/service-home-scroll";

// A client-side route change may remount the header. Preserve only the explicit
// brand-navigation intent; ordinary visits/back navigation keep their semantics.
let homeStartRequested = false;

export default function HomeStartLink(props: Omit<ComponentProps<typeof Link>, "href" | "onNavigate" | "scroll">) {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (pathname !== "/" || !homeStartRequested) return;
    homeStartRequested = false;
    if (window.location.hash || window.location.search) return;
    // The shared intent owns its lifecycle (newer navigation or user input),
    // so closing/remounting a mobile header cannot cancel the requested reset.
    scrollToHomeStart();
  }, [pathname]);
  return <Link {...props} href="/" scroll={false} onNavigate={event => {
    if (window.location.pathname !== "/") {
      homeStartRequested = true;
      return;
    }
    event.preventDefault();
    homeStartRequested = false;
    if (window.location.hash || window.location.search) window.history.pushState(window.history.state, "", "/");
    flushSync(() => { scrollToHomeStart(); });
  }} />;
}
