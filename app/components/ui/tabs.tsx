"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

export type TabsSize = "sm" | "md" | "lg";
export type TabsVariant = "segmented" | "outline" | "underline" | "contained" | "folder" | "flow";
const TabsAppearance = React.createContext<TabsVariant>("segmented");

function Tabs({
  className,
  variant = "segmented",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & { variant?: TabsVariant }) {
  return (
    <TabsAppearance.Provider value={variant}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-variant={variant}
        className={cn("flex min-w-0 max-w-full flex-col gap-2", variant === "contained" && "site-contained-tabs-root", (variant === "folder" || variant === "flow") && `site-${variant}-tabs-root`, className)}
        {...props}
      />
    </TabsAppearance.Provider>
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
  const variant = variantProp ?? inheritedVariant;
  return (
    <TabsAppearance.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        data-size={size === "default" ? "md" : size}
        className={cn(
          variant === "folder" || variant === "flow" ? `site-${variant}-tabs` : variant === "contained" ? "site-contained-tabs" : variant === "underline" ? "site-topic-tabs" : "site-tabs",
          variant === "outline" && "site-tabs-outline",
          distribution === "equal" && (variant === "folder" || variant === "flow" ? "site-shaped-tabs-even" : variant === "contained" ? "site-contained-tabs-even" : variant !== "underline" && "site-tabs-even"),
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
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        variant === "folder" || variant === "flow" ? `site-${variant}-tab` : variant === "contained" ? "site-contained-tab" : variant === "underline" ? "site-topic-tab" : "site-tab",
        "gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >{variant === "folder" || variant === "flow" ? <span className="site-shaped-tab-label">{children}{count !== undefined ? <span className="site-tab-count">{count}<span className="sr-only">건</span></span> : null}</span> : <>{children}{count !== undefined ? <span className="site-tab-count">{count}<span className="sr-only">건</span></span> : null}</>}</TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const variant = React.useContext(TabsAppearance);
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", variant === "contained" && "site-contained-panel", (variant === "folder" || variant === "flow") && `site-${variant}-panel`, className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
