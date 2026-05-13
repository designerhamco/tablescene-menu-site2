import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, MessageCircle } from 'lucide-react';

const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_xmxnxfQn/chat';

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
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end gap-3 pointer-events-none"
        >
          {/* Container needs pointer-events-auto for children to be clickable */}
          <div className="flex flex-col items-end gap-3 pointer-events-auto">
            <a
              href={KAKAO_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 text-[#3C1E1E]"
              aria-label="카카오톡 상담 문의"
            >
              <span className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 z-10 bg-[#FAE100] hover:scale-110">
                <MessageCircle className="w-7 h-7 fill-current" />
              </span>
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-zinc-800 shadow-sm ring-1 ring-zinc-100">
                상담 문의
              </span>
            </a>
          </div>

          {/* Scroll Buttons Group */}
          <div className="flex flex-col gap-3 items-center w-14 pointer-events-auto mt-2">
            <AnimatePresence>
              {isScrollingUp && (
                <motion.button
                  initial={{ opacity: 0, height: 0, scale: 0 }}
                  animate={{ opacity: 1, height: 40, scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0 }}
                  onClick={scrollToTop}
                  className="w-10 h-10 bg-white/80 backdrop-blur-sm text-zinc-600 rounded-full shadow-md flex items-center justify-center border border-zinc-200 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all duration-300 group"
                  aria-label="Scroll to top"
                >
                  <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                </motion.button>
              )}
            </AnimatePresence>

            <button
              onClick={scrollToBottom}
              className="w-10 h-10 bg-white/80 backdrop-blur-sm text-zinc-600 rounded-full shadow-md flex items-center justify-center border border-zinc-200 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all duration-300 group"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScrollToTop;
