import React, { useState, useEffect } from 'react';

interface Section {
  id: string;
  label: string;
  targets?: string[]; // Optional: IDs that trigger this dot
}

const NavigationDots = ({ sections }: { sections: Section[] }) => {
  const [activeSection, setActiveSection] = useState(sections[0].id);

  useEffect(() => {
    const handleScroll = () => {
      const middleOfViewport = window.innerHeight / 2;
      
      // Find the section that is currently crossing the middle of the viewport
      let currentSectionId = sections[0].id; // Default to first

      // Check all sections to find the best match
      for (const section of sections) {
        const targets = section.targets || [section.id];
        
        // If any target of this section is in the middle, this section is active
        const isMatch = targets.some(targetId => {
          const element = document.getElementById(targetId);
          if (!element) return false;
          
          const rect = element.getBoundingClientRect();
          // Check if the element overlaps the middle line
          return rect.top <= middleOfViewport && rect.bottom >= middleOfViewport;
        });

        if (isMatch) {
          currentSectionId = section.id;
          break; // Found the active one, stop checking (assuming non-overlapping vertical sections)
        }
      }

      setActiveSection(currentSectionId);
    };

    // Initial check
    handleScroll();

    // Add listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="hidden md:flex fixed top-1/2 right-8 -translate-y-1/2 z-50 flex-col items-center gap-4">
      {sections.map(({ id, label }) => {
        const isActive = activeSection === id;
        return (
          <button
            key={id}
            onClick={() => scrollToSection(id)}
            className="group relative flex items-center justify-center w-4 h-4"
            aria-label={`Scroll to ${label}`}
          >
            {/* Label - Tooltip style on hover */}
            <span 
              className={`absolute right-full mr-4 px-2 py-1 text-[10px] font-medium text-white bg-black/80 rounded whitespace-nowrap
                transition-all duration-300 transform origin-right
                ${isActive || 'group-hover:opacity-100 group-hover:scale-100'}
                ${isActive ? 'opacity-0' : 'opacity-0 scale-95 pointer-events-none'} 
                group-hover:opacity-100 group-hover:pointer-events-auto
              `}
            >
              {label}
            </span>
            
            {/* Dot Indicator */}
            <div 
              className={`rounded-full transition-all duration-300 ease-out
                ${isActive 
                  ? 'w-2 h-2 bg-zinc-400 shadow-none' 
                  : 'w-1.5 h-1.5 bg-zinc-200 group-hover:bg-zinc-300 group-hover:scale-125'
                }
              `}
            />
          </button>
        );
      })}
    </div>
  );
};

export default NavigationDots;