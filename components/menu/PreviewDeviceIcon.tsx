import { Monitor, Smartphone, Tablet } from "lucide-react";

import type { MenuPreviewDevice } from "@/lib/menu-preview-devices";

export default function PreviewDeviceIcon({ device }: { device: MenuPreviewDevice }) {
  if (device === "tablet") return <Tablet aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />;
  if (device === "mobile") return <Smartphone aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />;
  return <Monitor aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />;
}
