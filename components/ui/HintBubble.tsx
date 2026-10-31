import type { ReactNode } from "react";

/** Persistent supporting copy; unlike a tooltip, it needs no hover or focus. */
export default function HintBubble({ children, id }: { children: ReactNode; id?: string }) {
  return <span id={id} className="site-hint-bubble">{children}</span>;
}
