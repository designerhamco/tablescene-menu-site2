import type { SVGProps } from "react";

/** A filled chat bubble, shared by support entry points. */
export function SupportChatIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
    <path d="M12 3C6.8 3 3 6.5 3 11s3.8 8 9 8c1.5 0 2.9-.3 4.1-.9L21 20l-1.3-4.7A7.5 7.5 0 0 0 21 11c0-4.5-3.8-8-9-8Z" />
  </svg>;
}
