import { Monitor, Smartphone, Tablet } from "@/app/components/ui/site-icon";

import type { MenuPreviewDevice } from "@/lib/menu-preview-devices";

export default function PreviewDeviceIcon({ device }: { device: MenuPreviewDevice }) {
  if (device === "tablet") return <Tablet aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />;
  if (device === "mobile") return <Smartphone aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />;
  return <Monitor aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />;
}

export function PreviewOrientationIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="currentColor"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 383.39 383.38"
    >
      <path d="M165.43,0c4.52,1.62,8.19,4.89,9.52,9.06,1.69,5.32.25,10.24-3.62,14.11l-37.37,37.39c-5.75,5.75-14.85,5.56-20.06-.83l-13.98-17.15C56.21,65.82,27.55,111.02,26.82,160.91c-.11,7.54-4.24,13.54-11.8,14.61-6.57.94-13.03-3.45-15.02-10.26l.14-12.63.57-4.27C8.13,70.42,70.43,8.16,148.39.71l4.62-.6,12.42-.1Z" />
      <path d="M168.78,354.99c-14.05,14.05-37.66,16.97-50.85,3.78l-93.81-93.83c-5.59-5.59-7.89-13.34-8.05-21.04-.24-11.31,4.54-21.77,12.57-29.8L214.46,28.25c14.15-14.16,37.89-16.73,50.49-4.14l92.73,92.65c14.73,14.72,11.4,37.93-2.68,52.02l-186.21,186.21ZM333.96,132.73c-6.19-6.24-14.38-7.45-21.19-.71-3.92,3.88-12.62,7.2-17.51,2.33l-46.04-45.94c-4.88-4.87-2.41-13.35,1.8-17.63,3.23-3.29,4.74-6.95,4.82-11.18s-2.76-7.19-5.61-10.4c-5.17-5.83-12.53-6.95-19.37-2.15L47.4,230.55c-4.04,4.05-4.98,12.54-.99,16.53l89.77,89.76c3.96,3.96,12.5,3.04,16.54-.99l183.5-183.45c4.95-7.07,3.46-13.94-2.25-19.68Z" />
      <path d="M211.76,360.25l37.94-37.92c5.6-5.6,14.72-4.88,19.64,1.16l14.01,17.2c43.64-23.34,72.36-68.43,73.04-118.36.11-8.16,5.21-14.5,13.2-14.73s14.31,6.45,13.77,14.67l-.72,11.07c-6.65,79-70.26,142.68-149.28,149.29l-11.06.71c-5.76.37-10.9-2.66-13.27-7.44-2.54-5.13-1.81-11.14,2.72-15.66Z" />
    </svg>
  );
}
