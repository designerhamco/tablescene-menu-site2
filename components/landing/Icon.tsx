import { Bell, Camera, Check, CreditCard, LayoutTemplate, Menu, MessageCircle, Minus, Monitor, Package, Palette, Plus, ShoppingCart, Smartphone, Tablet, Users, X } from "@/app/components/ui/site-icon";
import { ArrowRight, ArrowUpRight, ChevronRight } from "@/app/components/ui/site-arrow";
import type { SVGProps } from "react";

export type IconName =
  | "arrowRight"
  | "arrowUpRight"
  | "bell"
  | "camera"
  | "cart"
  | "check"
  | "chevronRight"
  | "creditCard"
  | "layout"
  | "menu"
  | "minus"
  | "monitor"
  | "package"
  | "palette"
  | "plus"
  | "screen"
  | "smartphone"
  | "tablet"
  | "users"
  | "x"
  | "message";

const glyphs = { arrowRight: ArrowRight, arrowUpRight: ArrowUpRight, chevronRight: ChevronRight, bell: Bell, camera: Camera, cart: ShoppingCart, check: Check, creditCard: CreditCard, layout: LayoutTemplate, menu: Menu, minus: Minus, monitor: Monitor, package: Package, palette: Palette, plus: Plus, screen: Monitor, smartphone: Smartphone, tablet: Tablet, users: Users, x: X, message: MessageCircle } as const;

export function Icon({
  name,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  const Glyph = glyphs[name];
  return <Glyph {...props} className={className} />;
}
