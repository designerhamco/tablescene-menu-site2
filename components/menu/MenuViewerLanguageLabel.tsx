import { Globe2 } from "@/app/components/ui/site-icon";
import { ChevronDown } from "@/app/components/ui/site-arrow";

/** Shared viewer symbols stay outside customer-template icon ownership. */
export default function MenuViewerLanguageLabel({ locale, expanded }: { locale: string; expanded: boolean }) {
  return <><Globe2 className="h-5 w-5" aria-hidden="true" /><span>{locale}</span><ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /></>;
}
