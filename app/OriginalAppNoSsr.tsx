"use client";

import dynamic from "next/dynamic";

const OriginalApp = dynamic(() => import("./OriginalApp"), {
  ssr: false,
});

export default function OriginalAppNoSsr() {
  return <OriginalApp />;
}
