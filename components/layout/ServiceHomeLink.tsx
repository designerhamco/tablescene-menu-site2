"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { isServiceHomeHref } from "@/lib/service-home-navigation";
import { scrollToHomeService } from "@/lib/service-home-scroll";

/** Keep native links/new tabs and cross-route navigation; smooth-scroll an already mounted home. */
export default function ServiceHomeLink(props: Omit<ComponentProps<typeof Link>, "onNavigate">) {
  return <Link {...props} onNavigate={event => {
    if (window.location.pathname !== "/" || !isServiceHomeHref(props.href)) return;
    const anchor = document.getElementById(props.href.slice(2));
    if (!anchor) return;
    event.preventDefault();
    if (window.location.hash !== props.href.slice(1)) window.history.pushState(window.history.state, "", props.href);
    scrollToHomeService(anchor.id, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth");
  }} />;
}
