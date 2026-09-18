import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown } from 'lucide-react';

import AiSupportChatLauncher from '@/app/support/chat/AiSupportChatLauncher';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Visibility Check
      if (currentScrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      // Direction Check
      if (currentScrollY < lastScrollY) {
        setIsScrollingUp(true);
      } else if (currentScrollY > lastScrollY && Math.abs(currentScrollY - lastScrollY) > 10) {
        // Small threshold to prevent jitter
        setIsScrollingUp(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <>
      <AiSupportChatLauncher />
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="pointer-events-none fixed bottom-24 right-8 z-30 hidden flex-col items-end gap-3 md:flex"
          >
            <div className="flex w-14 flex-col items-center gap-3 pointer-events-auto">
              <AnimatePresence>
                {isScrollingUp && (
                  <motion.button
                    initial={{ opacity: 0, y: 8, scale: 0.75 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.75 }}
                    onClick={scrollToTop}
                    className="group flex size-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-all duration-300 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                    aria-label="맨 위로 이동"
                  >
                    <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  </motion.button>
                )}
              </AnimatePresence>

              <button
                onClick={scrollToBottom}
                className="group flex size-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-all duration-300 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                aria-label="맨 아래로 이동"
              >
                <ArrowDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ScrollToTop;
