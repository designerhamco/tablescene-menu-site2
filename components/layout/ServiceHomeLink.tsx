"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { isServiceHomeHref } from "@/lib/service-home-navigation";
import { scrollToHomeService } from "@/lib/service-home-scroll";

/** Keep cross-route navigation and new tabs on the normal Next Link path. */
export default function ServiceHomeLink({ instant = false, ...props }: Omit<ComponentProps<typeof Link>, "onNavigate"> & { instant?: boolean }) {
  return <Link {...props} onNavigate={event => {
    if (window.location.pathname !== "/" || !isServiceHomeHref(props.href)) return;
    const anchor = document.getElementById(props.href.slice(2));
    if (!anchor) return;
    event.preventDefault();
    if (window.location.hash !== props.href.slice(1)) window.history.pushState(window.history.state, "", props.href);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollToHomeService(anchor.id, instant || reduceMotion ? "instant" : "smooth");
  }} />;
}
