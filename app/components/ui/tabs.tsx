"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

export type TabsSize = "sm" | "md" | "lg";
export type TabsVariant = "outline" | "underline" | "area" | "page" | "document" | "pills";
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
  appearance,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & ({ purpose: "section"; appearance?: "document" | "pills"; variant?: never } | { purpose: Exclude<TabsPurpose, "section">; appearance?: never; variant?: never } | { purpose?: never; appearance?: never; variant: TabsVariant })) {
  const resolvedVariant = appearance ?? variant ?? (purpose ? purposeVariant[purpose] : "underline");
  return (
    <TabsPurposeContext.Provider value={purpose}>
      <TabsAppearance.Provider value={resolvedVariant}>
        <TabsPrimitive.Root
          data-slot="tabs"
          data-variant={resolvedVariant}
          data-purpose={purpose}
          className={cn("flex min-w-0 max-w-full flex-col gap-2", resolvedVariant === "area" && "site-area-tabs-root", className)}
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
  action,
  tools,
  ref,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  action?: React.ReactNode;
  tools?: React.ReactNode;
  size?: TabsSize | "default";
  distribution?: "content" | "equal";
}) {
  const variant = React.useContext(TabsAppearance);
  const purpose = React.useContext(TabsPurposeContext);
  const scrollRef=React.useRef<HTMLDivElement>(null);
  const [overflowRight,setOverflowRight]=React.useState(false);
  React.useEffect(()=>{
    const node=scrollRef.current;
    if(variant!=="pills"||!node)return;
    let active=true;
    const measure=()=>{if(active)setOverflowRight(node.clientWidth>0&&node.scrollWidth-node.scrollLeft>node.clientWidth+1);};
    measure();const observer=new ResizeObserver(measure);observer.observe(node);
    for(const child of node.children)observer.observe(child);
    node.addEventListener("scroll",measure,{passive:true});void document.fonts.ready.then(measure);
    return()=>{active=false;observer.disconnect();node.removeEventListener("scroll",measure);};
  },[variant,children]);
  const list = <TabsPrimitive.List
    ref={node=>{scrollRef.current=node;if(typeof ref==="function")ref(node);else if(ref)ref.current=node;}}
    data-overflow-right={variant==="pills"&&overflowRight||undefined}
    data-slot="tabs-list" data-variant={variant} data-purpose={purpose}
    data-size={size === "default" ? "md" : size}
    className={cn(
      variant === "pills" ? "site-pill-tabs" : variant === "document" ? "site-document-tabs" : variant === "area" ? "site-area-tabs" : variant === "underline" ? "site-topic-tabs" : "site-tabs",
      variant === "outline" && "site-tabs-outline", variant === "page" && "site-page-tabs",
      distribution === "equal" && (variant === "area" ? "site-area-tabs-even" : variant !== "underline" && variant !== "document" && "site-tabs-even"),
      `site-tab-size-${size === "default" ? "md" : size}`, className,
    )} {...props}>{children}</TabsPrimitive.List>;
  if(variant==="pills")return <div className="site-pill-tabs-header">{action}{list}</div>;
  return variant === "document" ? <div className={`site-document-tabs-header site-tab-size-${size === "default" ? "md" : size}`}>
    <div className="site-document-tabs-bar">{React.Children.count(children) ? list : null}{action}</div>
    {tools ? <div className="site-document-tabs-tools">{tools}</div> : null}
  </div> : list;
}

function TabsTrigger({
  className,
  count,
  accessory,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { count?: number; accessory?: React.ReactNode }) {
  const variant = React.useContext(TabsAppearance);
  const purpose = React.useContext(TabsPurposeContext);
  const trigger = (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-purpose={purpose}
      className={cn(
        variant === "pills" ? "site-tab site-pill-tab" : variant === "document" ? "site-document-tab" : variant === "area" ? "site-area-tab" : variant === "underline" ? "site-topic-tab" : "site-tab",
        "gap-1.5",
        className,
      )}
      {...props}
    >{children}{count !== undefined ? <span className="site-tab-count">{count}<span className="sr-only">건</span></span> : null}</TabsPrimitive.Trigger>
  );
  return variant === "document" ? <div className="site-document-tab-item">{trigger}{accessory ? <span className="site-document-tab-accessory">{accessory}</span> : null}</div> : trigger;
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
      className={cn("flex-1 outline-none", variant === "area" && "site-area-panel", variant === "document" && "site-document-panel", className)}
      {...props}
    />
  );
}

/** Creation is an action next to the tablist, never a selectable tab. */
function TabsAction({ children, ...props }: Omit<React.ComponentProps<"button">, "className" | "style">) {
  return <button {...props} type="button" className="site-document-tab-action">{children}</button>;
}
export { Tabs, TabsList, TabsTrigger, TabsContent, TabsAction };
