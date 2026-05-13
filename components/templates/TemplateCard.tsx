import type { ReactNode } from "react";

import type { TemplateCatalogItem } from "@/lib/templates";

type TemplateCardProps = {
  template: TemplateCatalogItem;
  selected?: boolean;
  showServiceBadge?: boolean;
  action?: ReactNode;
  className?: string;
};

function getThumbnailClassName(tone: TemplateCatalogItem["thumbnailTone"]) {
  const toneClasses: Record<TemplateCatalogItem["thumbnailTone"], string> = {
    light: "bg-[#f7f4ed] text-zinc-950",
    warm: "bg-[#f8eadb] text-zinc-950",
    dark: "bg-zinc-950 text-white",
  };

  return toneClasses[tone];
}

export function TemplateThumbnail({ template }: { template: TemplateCatalogItem }) {
  const isDark = template.thumbnailTone === "dark";

  if (template.thumbnailUrl) {
    return (
      <div
        aria-label={`${template.name} 템플릿 미리보기`}
        className="relative aspect-[4/3] overflow-hidden bg-zinc-100 bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${template.thumbnailUrl})` }}
      />
    );
  }

  return (
    <div className={`relative aspect-[4/3] overflow-hidden p-4 ${getThumbnailClassName(template.thumbnailTone)}`}>
      <div className={`absolute inset-x-0 top-0 h-24 ${isDark ? "bg-white/10" : "bg-zinc-950/10"}`} />
      <div className="relative mx-auto flex h-full max-w-[168px] flex-col rounded-[1.7rem] border border-current/10 bg-white/90 p-3 text-zinc-950 shadow-xl shadow-zinc-900/10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="h-7 w-7 rounded-full bg-zinc-950" />
          <div className="h-2 w-12 rounded-full bg-zinc-200" />
        </div>
        <div className="mb-3 space-y-1.5">
          <div className="h-3 w-20 rounded-full bg-zinc-950" />
          <div className="h-2 w-24 rounded-full bg-zinc-200" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-zinc-100 bg-white p-2">
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-xl bg-zinc-100" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-2 w-16 rounded-full bg-zinc-800" />
                  <div className="h-1.5 w-20 rounded-full bg-zinc-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto h-2 w-full rounded-full bg-zinc-100" />
      </div>
    </div>
  );
}

export default function TemplateCard({
  template,
  selected = false,
  showServiceBadge = true,
  action,
  className = "",
}: TemplateCardProps) {
  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-[1.5rem] border bg-white transition-colors ${
        selected ? "border-zinc-950" : "border-zinc-200 hover:border-zinc-400"
      } ${className}`}
    >
      <div className="relative overflow-hidden bg-zinc-100">
        <TemplateThumbnail template={template} />
        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          {showServiceBadge ? (
            <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white">
              {template.serviceLabel}
            </span>
          ) : null}
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-zinc-700 backdrop-blur">
            {template.categoryLabel}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-zinc-950 md:text-2xl">
              {template.name}
            </h3>
            <p className="mt-1 font-mono text-xs font-bold text-zinc-400">{template.key}</p>
          </div>
          {action}
        </div>
        <p className="mt-4 break-keep text-sm font-medium leading-relaxed text-zinc-500 md:text-base">
          {template.description}
        </p>
      </div>
    </div>
  );
}
