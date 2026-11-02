"use client";

import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import HelpTooltip from "./HelpTooltip";

export default function InfoTooltip({ label, children }: { label: string; children: ReactNode }) {
  return <HelpTooltip label={label} heading={label} side="bottom" align="end" hover trigger={<Button variant="ghost" size="icon" aria-label={label}><CircleAlert size={20} aria-hidden="true" /></Button>}>{children}</HelpTooltip>;
}
