import React from 'react';
import { User, Clock } from 'lucide-react';

export const SmartWaitingUI = () => {
  return (
    <div className="@container w-full h-full bg-zinc-950 text-white font-sans select-none overflow-hidden">
      <div className="flex flex-col @sm:flex-row h-full">
        
        {/* Left Side (Top on Mobile): Store Info & Status */}
        <div className="w-full @sm:w-5/12 bg-zinc-900/30 p-4 @sm:p-8 flex flex-col justify-between border-b @sm:border-b-0 @sm:border-r border-white/5 relative shrink-0 z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
          
          {/* Header */}
          <div className="relative z-10 flex flex-row @sm:flex-col justify-between items-start @sm:items-start mb-4 @sm:mb-0">
            <div>
                <div className="flex items-center gap-2 mb-2 @sm:mb-3">
                    <div className="w-1.5 h-1.5 @sm:w-2 @sm:h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-emerald-500 text-[10px] @sm:text-xs font-bold tracking-widest uppercase">Operating</span>
                </div>
                <h1 className="text-xl @sm:text-3xl lg:text-4xl font-bold mb-1 @sm:mb-2 tracking-tight text-white">아티메뉴 다이닝</h1>
                <p className="text-zinc-500 text-xs @sm:text-sm font-medium">서울 강남구 테헤란로 123</p>
            </div>
            
            {/* Mobile Only: Powered by (moved to top right on mobile) */}
            <div className="block @sm:hidden text-zinc-700 text-[8px] font-mono tracking-widest uppercase mt-1">
                ArtiMenu
            </div>
          </div>

          {/* Stats Container */}
          <div className="flex flex-row @sm:flex-col gap-3 @sm:gap-5 relative z-10 overflow-x-auto @sm:overflow-visible pb-1 @sm:pb-0 no-scrollbar">
             {/* Waiting Count */}
             <div className="flex-1 p-3 @sm:p-6 rounded-xl @sm:rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm min-w-[100px]">
                <div className="flex items-center gap-1.5 @sm:gap-2 text-zinc-400 mb-1 @sm:mb-2">
                   <User size={12} className="@sm:w-4 @sm:h-4" />
                   <span className="text-[10px] @sm:text-xs font-medium uppercase tracking-wider">Waiting</span>
                </div>
                <div className="flex items-baseline gap-1 @sm:gap-2">
                  <span className="text-2xl @sm:text-5xl lg:text-6xl font-bold text-white tracking-tighter tabular-nums">12</span>
                  <span className="text-xs @sm:text-xl text-zinc-600 font-medium">teams</span>
                </div>
             </div>
             
             {/* Est Time */}
             <div className="flex-1 p-3 @sm:p-6 rounded-xl @sm:rounded-2xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm min-w-[100px]">
                <div className="flex items-center gap-1.5 @sm:gap-2 text-zinc-400 mb-1 @sm:mb-2">
                   <Clock size={12} className="@sm:w-4 @sm:h-4" />
                   <span className="text-[10px] @sm:text-xs font-medium uppercase tracking-wider">Est. Time</span>
                </div>
                <div className="flex items-baseline gap-1 @sm:gap-2">
                  <span className="text-2xl @sm:text-5xl lg:text-6xl font-bold text-white tracking-tighter tabular-nums">45</span>
                  <span className="text-xs @sm:text-xl text-zinc-600 font-medium">min</span>
                </div>
             </div>
          </div>

          {/* Desktop Only: Powered by */}
          <div className="hidden @sm:block text-zinc-700 text-[10px] font-mono relative z-10 tracking-widest uppercase">
            Powered by ArtiMenu
          </div>
        </div>

        {/* Right Side (Bottom on Mobile): Action */}
        <div className="flex-1 p-4 @sm:p-8 lg:p-12 flex flex-col items-center justify-center relative bg-gradient-to-br from-zinc-900/20 to-zinc-950 min-h-0">
          
          {/* Language Toggle (Hidden on small mobile if space is tight, or adjusted) */}
          <div className="absolute top-3 right-4 @sm:top-8 @sm:right-8 flex gap-2">
             <div className="px-3 py-1 @sm:px-4 @sm:py-1.5 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-400 text-[10px] @sm:text-xs font-medium hover:bg-zinc-800 transition-colors cursor-pointer">
               English
             </div>
          </div>

          <div className="w-full max-w-[320px] @sm:max-w-[400px] flex flex-col h-full justify-center">
             <div className="text-center mb-4 @sm:mb-10">
               <h2 className="text-lg @sm:text-3xl font-bold mb-1 @sm:mb-3 text-white">대기 접수</h2>
               <p className="text-zinc-500 text-[10px] @sm:text-sm leading-relaxed">
                 입장 순서가 되면 알림톡을 보내드립니다.
               </p>
             </div>

             {/* Number Display */}
             <div className="bg-zinc-900/50 border-b-2 border-zinc-800 p-2 @sm:p-4 mb-4 @sm:mb-8 flex items-center justify-center h-10 @sm:h-16 shrink-0">
                <span className="text-xl @sm:text-3xl font-mono tracking-[0.2em] text-zinc-700 animate-pulse">010 - ____ - ____</span>
             </div>

             {/* Keypad */}
             <div className="grid grid-cols-3 gap-1.5 @sm:gap-3 flex-1 @sm:flex-none content-center">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button 
                    key={num} 
                    className="h-10 @sm:h-14 lg:h-16 rounded-lg @sm:rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 text-lg @sm:text-xl lg:text-2xl font-medium text-white transition-all active:scale-95 touch-manipulation"
                  >
                    {num}
                  </button>
                ))}
                <button className="h-10 @sm:h-14 lg:h-16 rounded-lg @sm:rounded-xl bg-zinc-900/50 hover:bg-zinc-800/80 border border-white/5 text-xs @sm:text-base font-medium text-amber-500/80 transition-all active:scale-95 touch-manipulation">
                  지움
                </button>
                <button className="h-10 @sm:h-14 lg:h-16 rounded-lg @sm:rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 text-lg @sm:text-xl lg:text-2xl font-medium text-white transition-all active:scale-95 touch-manipulation">
                  0
                </button>
                <button className="h-10 @sm:h-14 lg:h-16 rounded-lg @sm:rounded-xl bg-white text-black font-bold text-sm @sm:text-lg transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] touch-manipulation">
                  입력
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
