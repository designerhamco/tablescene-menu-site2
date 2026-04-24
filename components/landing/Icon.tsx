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

const paths: Record<IconName, string[]> = {
  arrowRight: ["M5 12h14", "m12 5 7 7-7 7"],
  arrowUpRight: ["M7 17 17 7", "M7 7h10v10"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M13.73 21a2 2 0 0 1-3.46 0"],
  camera: ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5z", "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8"],
  cart: ["M6 6h15l-1.5 9h-12z", "M6 6 5 3H2", "M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2", "M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2"],
  check: ["M20 6 9 17l-5-5"],
  chevronRight: ["m9 18 6-6-6-6"],
  creditCard: ["M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M3 10h18"],
  layout: ["M4 5h16v14H4z", "M4 10h16", "M10 10v9"],
  menu: ["M4 6h16", "M4 12h16", "M4 18h16"],
  minus: ["M5 12h14"],
  monitor: ["M4 5h16v12H4z", "M8 21h8", "M12 17v4"],
  package: ["m12 3 8 4.5v9L12 21l-8-4.5v-9z", "M4 7.5 12 12l8-4.5", "M12 12v9"],
  palette: ["M12 3a9 9 0 0 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h1a8 8 0 0 0 8-8c0-2-3.5-3-9-3z", "M7.5 10.5h.01", "M10.5 7.5h.01", "M14.5 7.5h.01"],
  plus: ["M12 5v14", "M5 12h14"],
  screen: ["M4 5h16v10H4z", "M8 21h8", "M12 15v6"],
  smartphone: ["M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M11 18h2"],
  tablet: ["M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z", "M11 17h2"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  x: ["M18 6 6 18", "M6 6l12 12"],
  message: ["M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"],
};

export function Icon({
  name,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
