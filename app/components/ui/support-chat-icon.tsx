import type { SVGProps } from "react";

/** A filled chat bubble, shared by support entry points. */
export function SupportChatIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
    <path d="M12 3C6.8 3 3 6.5 3 11s3.8 8 9 8c1.5 0 2.9-.3 4.1-.9L21 20l-1.3-4.7A7.5 7.5 0 0 0 21 11c0-4.5-3.8-8-9-8Z" />
  </svg>;
}

/** A single four-point sparkle for the AI conversation heading. */
export function SupportSparkleIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
    <path d="M12 1c1.2 7.1 3.9 9.8 11 11-7.1 1.2-9.8 3.9-11 11C10.8 15.9 8.1 13.2 1 12c7.1-1.2 9.8-3.9 11-11Z" />
  </svg>;
}
