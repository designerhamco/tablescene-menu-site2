import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import AiSupportChatLauncher from '@/app/support/chat/AiSupportChatLauncher';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 200);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <AiSupportChatLauncher />
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            className="site-scroll-top fixed bottom-24 z-30"
          >
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' })}
              className="site-button site-button-secondary flex size-10 min-h-10 min-w-10 shrink-0 items-center justify-center p-0"
              aria-label="맨 위로 이동"
            >
              <ArrowUp className="h-5 w-5" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
export default ScrollToTop;
