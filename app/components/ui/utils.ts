import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const mergeSiteClasses = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["copy", "support", "meta", "control"] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return mergeSiteClasses(clsx(inputs));
}
