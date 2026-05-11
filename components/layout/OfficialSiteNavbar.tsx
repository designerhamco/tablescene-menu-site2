"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { BrowserRouter, useLocation } from "react-router";

import Navbar from "@/app/components/layout/Navbar";

function subscribeToMount() {
  return () => {};
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

  return (
    <>
      {isMounted ? (
        <BrowserRouter>
          <Navbar />
          <ReloadNextRouteOnNavigate />
        </BrowserRouter>
      ) : null}
      <div className="h-20" aria-hidden="true" />
    </>
  );
}
