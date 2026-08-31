"use client";

import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";

import DiningAubeTableA from "./DiningAubeTableA";

export default function DiningAubeTableB(data: PublicMenuTemplateProps) {
  return <DiningAubeTableA {...data} layoutVariant="sidebar" themeVariant="maison-marais" />;
}
