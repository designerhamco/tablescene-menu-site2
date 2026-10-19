import { ConciergeBell, ShoppingCart } from "lucide-react";
import type { SVGProps } from "react";

/** Customer staff calls use a service bell; site notification bells remain separate. */
export const StaffCallIcon = ConciergeBell;
export type MenuOrderIconVariant = "cart" | "document";

export function MenuOrderIcon({ variant = "cart", ...props }: SVGProps<SVGSVGElement> & { variant?: MenuOrderIconVariant }) {
  if (variant === "cart") return <ShoppingCart aria-hidden="true" strokeWidth={1.8} {...props} />;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-menu-order-icon="document" {...props}>
      <path d="M10.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v5.5M8 8h7M8 12h4M8 16h1" />
      <circle cx="17.5" cy="17.5" r="5.5" fill="#191c1b" stroke="none" />
      <path d="M17.5 15v5M15 17.5h5" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}
