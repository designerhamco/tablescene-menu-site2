"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

const TabsAppearance = React.createContext<"segmented" | "outline" | "underline">("segmented");

function TabsList({
  className,
  variant = "segmented",
  size = "default",
  distribution = "content",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: "segmented" | "outline" | "underline";
  size?: "default" | "lg";
  distribution?: "content" | "equal";
}) {
  return (
    <TabsAppearance.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          variant === "underline" ? "site-topic-tabs" : "site-tabs",
          variant === "outline" && "site-tabs-outline",
          distribution === "equal" && variant !== "underline" && "site-tabs-even",
          size === "lg" && (variant === "underline" ? "site-topic-tabs-lg" : "site-tabs-lg"),
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
        variant === "underline" ? "site-topic-tab" : "site-tab",
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
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
