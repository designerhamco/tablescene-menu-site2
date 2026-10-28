"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

export type TabsSize = "sm" | "md" | "lg";
export type TabsVariant = "outline" | "underline" | "area" | "page";
export type TabsPurpose = "page" | "section" | "category" | "state";

const purposeVariant: Record<TabsPurpose, TabsVariant> = {
  page: "page",
  section: "area",
  category: "underline",
  state: "outline",
};
const TabsAppearance = React.createContext<TabsVariant>("underline");
const TabsPurposeContext = React.createContext<TabsPurpose | undefined>(undefined);

function Tabs({
  className,
  variant,
  purpose,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & ({ purpose: TabsPurpose; variant?: never } | { purpose?: never; variant: TabsVariant })) {
  const appearance = variant ?? (purpose ? purposeVariant[purpose] : "underline");
  return (
    <TabsPurposeContext.Provider value={purpose}>
      <TabsAppearance.Provider value={appearance}>
        <TabsPrimitive.Root
          data-slot="tabs"
          data-variant={appearance}
          data-purpose={purpose}
          className={cn("flex min-w-0 max-w-full flex-col gap-2", appearance === "area" && "site-area-tabs-root", className)}
          {...props}
        />
      </TabsAppearance.Provider>
    </TabsPurposeContext.Provider>
  );
}

function TabsList({
  className,
  size = "md",
  distribution = "content",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  size?: TabsSize | "default";
  distribution?: "content" | "equal";
}) {
  const variant = React.useContext(TabsAppearance);
  const purpose = React.useContext(TabsPurposeContext);
  return (
    <TabsAppearance.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        data-purpose={purpose}
        data-size={size === "default" ? "md" : size}
        className={cn(
          variant === "area" ? "site-area-tabs" : variant === "underline" ? "site-topic-tabs" : "site-tabs",
          variant === "outline" && "site-tabs-outline",
          variant === "page" && "site-page-tabs",
          distribution === "equal" && (variant === "area" ? "site-area-tabs-even" : variant !== "underline" && "site-tabs-even"),
          `site-tab-size-${size === "default" ? "md" : size}`,
          className,
        )}
        {...props}
      >{children}</TabsPrimitive.List>
    </TabsAppearance.Provider>
  );
}

function TabsTrigger({
  className,
  count,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { count?: number }) {
  const variant = React.useContext(TabsAppearance);
  const purpose = React.useContext(TabsPurposeContext);
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-purpose={purpose}
      className={cn(
        variant === "area" ? "site-area-tab" : variant === "underline" ? "site-topic-tab" : "site-tab",
        "gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >{children}{count !== undefined ? <span className="site-tab-count">{count}<span className="sr-only">건</span></span> : null}</TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const variant = React.useContext(TabsAppearance);
  const purpose = React.useContext(TabsPurposeContext);
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      data-purpose={purpose}
      className={cn("flex-1 outline-none", variant === "area" && "site-area-panel", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
