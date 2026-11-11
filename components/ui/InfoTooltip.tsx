"use client";

import type { ReactNode } from "react";
import { CircleAlert } from "@/app/components/ui/site-icon";
import { Button } from "@/app/components/ui/button";
import HelpTooltip from "./HelpTooltip";

export default function InfoTooltip({ label, children }: { label: string; children: ReactNode; compactOnMobile?: boolean }) {
  return <HelpTooltip label={label} heading={label} side="bottom" align="end" hover trigger={<Button variant="ghost" size="icon" iconSize="compact" aria-label={label}><CircleAlert size={20} aria-hidden="true" /></Button>}>{children}</HelpTooltip>;
}
