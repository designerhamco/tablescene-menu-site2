import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, MessageCircle, X, MessageSquare, AlertCircle } from 'lucide-react';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const openGeneralInquiry = () => {
    // General Inquiry Link
    window.open('http://pf.kakao.com/_xmxnxfQn/chat', '_blank');
  };

  const openEmergencySupport = () => {
    // Emergency Support Link
    window.open('http://pf.kakao.com/_xmxnxfQn/chat', '_blank');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu when scrolling
  useEffect(() => {
    if (isMenuOpen) {
      const closeMenu = () => setIsMenuOpen(false);
      window.addEventListener('scroll', closeMenu);
      return () => window.removeEventListener('scroll', closeMenu);
    }
  }, [isMenuOpen]);

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
            
            {/* Expanded Menu Items */}
            <AnimatePresence>
              {isMenuOpen && (
                <div className="flex flex-col gap-3 mb-2 items-end">
                  
                  {/* 1. 서비스 이용/도입 문의 (General) */}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="flex items-center gap-3"
                  >
                    {/* Label */}
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-zinc-100 text-right">
                      <div className="text-sm font-bold text-zinc-900">서비스 이용/도입 문의</div>
                      <div className="text-[11px] text-zinc-500 font-medium">평일 09:00 ~ 17:00 (점심시간 12:00 ~ 13:00 제외)</div>
                    </div>
                    
                    {/* Button - Yellow */}
                    <button
                      onClick={openGeneralInquiry}
                      className="w-12 h-12 bg-[#FAE100] text-[#3C1E1E] rounded-full shadow-lg flex items-center justify-center border border-[#FAE100] hover:brightness-95 transition-all"
                      aria-label="General Inquiry"
                    >
                      <MessageCircle className="w-6 h-6 fill-current" />
                    </button>
                  </motion.div>

                  {/* 2. 긴급 상담 (Emergency) */}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3"
                  >
                    {/* Label */}
                    <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-zinc-800 text-right">
                      <div className="text-sm font-bold text-white mb-1">긴급 상담</div>
                      <div className="text-[11px] text-zinc-400">
                         주말/공휴일 10:00 ~ 22:00
                      </div>
                    </div>
                    
                    {/* Button - Dark */}
                    <button
                      onClick={openEmergencySupport}
                      className="w-12 h-12 bg-zinc-800 text-white rounded-full shadow-lg flex items-center justify-center border border-zinc-700 hover:bg-zinc-700 transition-all"
                      aria-label="Emergency Support"
                    >
                      <AlertCircle className="w-6 h-6 stroke-current" />
                    </button>
                  </motion.div>

                </div>
              )}
            </AnimatePresence>

            {/* Main Toggle Button */}
            <button
              onClick={toggleMenu}
              className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 z-10 ${
                isMenuOpen 
                  ? 'bg-zinc-800 text-white rotate-90' 
                  : 'bg-[#FAE100] text-[#3C1E1E] hover:scale-110'
              }`}
              aria-label="Toggle Inquiry Menu"
            >
              {isMenuOpen ? (
                <X className="w-7 h-7" />
              ) : (
                <MessageCircle className="w-7 h-7 fill-current" />
              )}
            </button>
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