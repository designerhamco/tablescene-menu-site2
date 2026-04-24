"use client";

import { useEffect, useState } from "react";
import { sections } from "./data";

type SectionId = (typeof sections)[number]["id"];

export function NavigationDots() {
  const [activeSection, setActiveSection] = useState<SectionId>(sections[0].id);

  useEffect(() => {
    const handleScroll = () => {
      const middleOfViewport = window.innerHeight / 2;
      let currentSectionId: SectionId = sections[0].id;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.top <= middleOfViewport && rect.bottom >= middleOfViewport) {
          currentSectionId = section.id;
          break;
        }
      }

      setActiveSection(currentSectionId);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed right-8 top-1/2 z-50 hidden -translate-y-1/2 flex-col items-center gap-4 md:flex">
      {sections.map(({ id, label }) => {
        const isActive = activeSection === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
            className="group relative flex h-4 w-4 items-center justify-center"
            aria-label={`Scroll to ${label}`}
          >
            <span className="pointer-events-none absolute right-full mr-4 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
              {label}
            </span>
            <span
              className={`rounded-full transition-all duration-300 ease-out ${
                isActive ? "h-2 w-2 bg-zinc-400 shadow-none" : "h-1.5 w-1.5 bg-zinc-200 group-hover:scale-125 group-hover:bg-zinc-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
