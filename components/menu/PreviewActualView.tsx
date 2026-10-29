"use client";

import { ExternalLink } from "lucide-react";

/** A normal browser tab keeps browser zoom available before optional fullscreen. */
export default function PreviewActualView({ href, tabIndex }: { href: string; tabIndex?: number }) {
  return <a href={href} target="_blank" rel="noopener noreferrer"
      aria-label="실제 화면 보기" title="실제 화면 보기" data-preview-detached-link=""
      tabIndex={tabIndex} className="site-preview-control">
      <ExternalLink className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
      <span className="hidden min-[430px]:inline">실제 화면 보기</span>
    </a>;
}
