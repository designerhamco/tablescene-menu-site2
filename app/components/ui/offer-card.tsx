"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { KeyValueList } from "./data-display";

export type OfferOption = { id: string; label: string; price: string; priceNote: string; title: string; description: string; features: { label: string; value: ReactNode }[]; actions: ReactNode };
export function OfferCard({ label, options, note }: { label: string; options: OfferOption[]; note?: ReactNode }) {
  return <div className="site-offer"><Tabs defaultValue={options[0]?.id} className="site-offer-card gap-0">
    <TabsList variant="underline" size="md" className="site-offer-tabs" aria-label={label}>{options.map(option=><TabsTrigger key={option.id} value={option.id}>{option.label}</TabsTrigger>)}</TabsList>
    {options.map(option=><TabsContent key={option.id} value={option.id} className="site-offer-body"><p className="site-offer-price">{option.price}</p><p className="site-offer-note">{option.priceNote}</p><h3 className="type-content-title mt-6">{option.title}</h3><p className="type-body mt-2 text-zinc-600">{option.description}</p><KeyValueList items={option.features} /><div className="site-offer-actions">{option.actions}</div></TabsContent>)}
  </Tabs>{note ? <div className="site-offer-footnote">{note}</div> : null}</div>;
}
