import type { SVGProps } from "react";
import { MessageCircle, SupportSparkle } from "./site-icon";

/** Support glyphs share Remix Line; tooltip bubbles retain their own component. */
export function SupportChatIcon(props: SVGProps<SVGSVGElement>) {
  return <MessageCircle {...props} />;
}
export function SupportSparkleIcon(props: SVGProps<SVGSVGElement>) {
  return <SupportSparkle {...props} />;
}
