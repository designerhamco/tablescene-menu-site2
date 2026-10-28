"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

export type TabsSize = "sm" | "md" | "lg";
export type TabsVariant = "segmented" | "outline" | "underline" | "area";
export type TabsHierarchy = "primary" | "secondary" | "embedded";

const hierarchyVariant: Record<TabsHierarchy, TabsVariant> = {
  primary: "outline",
  secondary: "underline",
  embedded: "area",
};
const TabsAppearance = React.createContext<TabsVariant>("segmented");
const TabsHierarchyContext = React.createContext<TabsHierarchy | undefined>(undefined);

function Tabs({
  className,
  variant,
  hierarchy,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & { variant?: TabsVariant; hierarchy?: TabsHierarchy }) {
  const appearance = variant ?? (hierarchy ? hierarchyVariant[hierarchy] : "segmented");
  return (
    <TabsHierarchyContext.Provider value={hierarchy}>
      <TabsAppearance.Provider value={appearance}>
        <TabsPrimitive.Root
          data-slot="tabs"
          data-variant={appearance}
          data-hierarchy={hierarchy}
          className={cn("flex min-w-0 max-w-full flex-col gap-2", appearance === "area" && "site-area-tabs-root", className)}
          {...props}
        />
      </TabsAppearance.Provider>
    </TabsHierarchyContext.Provider>
  );
}

function TabsList({
  className,
  variant: variantProp,
  size = "md",
  distribution = "content",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: TabsVariant;
  size?: TabsSize | "default";
  distribution?: "content" | "equal";
}) {
  const inheritedVariant = React.useContext(TabsAppearance);
  const hierarchy = React.useContext(TabsHierarchyContext);
  const variant = variantProp ?? inheritedVariant;
  return (
    <TabsAppearance.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        data-hierarchy={hierarchy}
        data-size={size === "default" ? "md" : size}
        className={cn(
          variant === "area" ? "site-area-tabs" : variant === "underline" ? "site-topic-tabs" : "site-tabs",
          variant === "outline" && "site-tabs-outline",
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
  const hierarchy = React.useContext(TabsHierarchyContext);
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-hierarchy={hierarchy}
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
  const hierarchy = React.useContext(TabsHierarchyContext);
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      data-hierarchy={hierarchy}
      className={cn("flex-1 outline-none", variant === "area" && "site-area-panel", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
