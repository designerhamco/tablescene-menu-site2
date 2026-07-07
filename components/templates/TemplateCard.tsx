import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

import type { TemplateCatalogItem } from "@/lib/templates";
import { getTemplateTypeLabelByTemplateKey } from "@/lib/template-types";

type TemplateCardProps = {
  template: TemplateCatalogItem;
  selected?: boolean;
  showServiceBadge?: boolean;
  action?: ReactNode;
  className?: string;
};

function getThumbnailClassName(tone: TemplateCatalogItem["thumbnailTone"]) {
  const toneClasses: Record<TemplateCatalogItem["thumbnailTone"], string> = {
    light: "bg-zinc-100 text-zinc-950",
    warm: "bg-stone-100 text-zinc-950",
    dark: "bg-zinc-900 text-white",
  };

  return toneClasses[tone];
}

export function TemplateThumbnail({ template }: { template: TemplateCatalogItem }) {
  const isDark = template.thumbnailTone === "dark";
  const previewImage = template.previewImage ?? template.thumbnailUrl;

  if (template.key === "cafe_noir_a") {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-[#f8f8f5] p-5 text-zinc-950">
        <div className="grid h-full grid-cols-[0.8fr_1fr_1fr] gap-4">
          <div className="flex flex-col justify-between border-r border-zinc-900 pr-3">
            <div className="flex">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-zinc-900 text-[11px] font-semibold">N</span>
              <span className="-ml-2 grid h-8 w-8 place-items-center rounded-full border border-zinc-900 bg-[#f8f8f5] text-[11px] font-semibold">R</span>
            </div>
            <p className="text-5xl font-light uppercase leading-none tracking-[-0.12em] [writing-mode:vertical-rl]">MENU</p>
            <div className="space-y-1 text-[6px] uppercase tracking-[0.12em] text-zinc-500">
              <p>Cold desserts</p>
              <p>Quiet coffee</p>
            </div>
          </div>
          {[0, 1].map((column) => (
            <div key={column} className="flex flex-col gap-4">
              <div className="h-3 w-20 bg-zinc-950" />
              {[0, 1].map((group) => (
                <div key={group} className="space-y-2 border-t border-zinc-900 pt-2">
                  <div className="h-2 w-16 bg-zinc-900" />
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center justify-between gap-2">
                      <span className="h-1.5 w-16 bg-zinc-500/70" />
                      <span className="h-1.5 w-5 bg-zinc-800" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (previewImage) {
    return (
      <div
        aria-label={`${template.name} 템플릿 미리보기`}
        className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-zinc-100 bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${previewImage})` }}
      />
    );
  }

  return (
    <div className={`relative aspect-[4/3] overflow-hidden rounded-[1.5rem] p-5 ${getThumbnailClassName(template.thumbnailTone)}`}>
      <div className={`absolute inset-x-0 top-0 h-28 ${isDark ? "bg-white/10" : "bg-white/60"}`} />
      <div className="relative flex h-full flex-col rounded-[1.15rem] border border-current/10 bg-white/95 p-4 text-zinc-950 shadow-xl shadow-zinc-900/10">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="h-2.5 w-24 rounded-full bg-zinc-950" />
          <div className="flex gap-1.5">
            <span className="h-2 w-8 rounded-full bg-zinc-200" />
            <span className="h-2 w-8 rounded-full bg-zinc-200" />
          </div>
        </div>
        <div className="mb-4 grid grid-cols-[1fr_auto] items-end gap-4">
          <div className="space-y-2">
            <div className="h-5 w-28 rounded-full bg-zinc-950" />
            <div className="h-2.5 w-40 max-w-full rounded-full bg-zinc-200" />
          </div>
          <div className="h-12 w-12 rounded-2xl bg-zinc-100" />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex min-w-0 flex-col justify-between rounded-[0.95rem] border border-zinc-100 bg-zinc-50/80 p-3">
              <div className="space-y-2">
                <div className="h-2.5 w-16 rounded-full bg-zinc-800" />
                <div className="h-2 w-20 max-w-full rounded-full bg-zinc-200" />
              </div>
              <div className="mt-4 h-2 w-12 rounded-full bg-zinc-950" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TemplateCard({
  template,
  selected = false,
  action,
  className = "",
}: TemplateCardProps) {
  const templateTypeLabel = template.templateTypeLabel ?? getTemplateTypeLabelByTemplateKey(template.key);

  return (
    <div
      className={`group flex h-full flex-col rounded-[1.5rem] bg-transparent transition ${
        selected ? "ring-2 ring-zinc-950 ring-offset-4 ring-offset-white" : ""
      } ${className}`}
    >
      <div className="relative overflow-hidden rounded-[1.5rem] bg-zinc-100">
        <TemplateThumbnail template={template} />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#F8E731]/95 px-3 py-1.5 text-xs font-black text-zinc-950 backdrop-blur">
            {templateTypeLabel}
          </span>
          {template.status === "coming_soon" ? (
            <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-zinc-950 backdrop-blur">
              준비 중
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-1 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="inline-flex max-w-full items-center gap-1.5 break-keep text-base font-black leading-snug tracking-tight text-zinc-950 md:text-lg">
              <span className="min-w-0">{template.name}</span>
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 stroke-[2.4] md:h-[18px] md:w-[18px]" aria-hidden="true" />
            </h3>
          </div>
          {action}
        </div>
        <p className="mt-2 break-keep text-sm font-medium leading-relaxed text-zinc-600 md:text-base">
          {template.description}
        </p>
      </div>
    </div>
  );
}
