"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { BrowserRouter, useLocation } from "react-router";

import Navbar from "@/app/components/layout/Navbar";
import ScrollToTopButton from "@/app/components/ui/ScrollToTop";

function subscribeToMount(onStoreChange: () => void) {
  const timeoutId = window.setTimeout(onStoreChange, 0);
  return () => window.clearTimeout(timeoutId);
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function ReloadNextRouteOnNavigate() {
  const location = useLocation();
  const initialPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname === initialPathRef.current) {
      return;
    }

    window.location.assign(`${location.pathname}${location.search}${location.hash}`);
  }, [location.hash, location.pathname, location.search]);

  return null;
}

export default function OfficialSiteNavbar() {
  const isMounted = useSyncExternalStore(subscribeToMount, getClientSnapshot, getServerSnapshot);
  const pathname = usePathname();
  const shouldShowQuickMenu =
    !pathname.startsWith("/menu/") &&
    !pathname.startsWith("/m/") &&
    !pathname.includes("/preview");

  return (
    <>
      {isMounted ? (
        <BrowserRouter>
          <Navbar />
          <ReloadNextRouteOnNavigate />
        </BrowserRouter>
      ) : null}
      {shouldShowQuickMenu ? <ScrollToTopButton /> : null}
      <div className="h-20" aria-hidden="true" />
    </>
  );
}
