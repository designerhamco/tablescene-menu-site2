import React from 'react';
import { motion } from 'motion/react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  bgImage?: string;
}

const PageHeader = ({ title, subtitle, bgImage }: PageHeaderProps) => {
  return (
    <div className="relative w-full h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden bg-zinc-900 text-white">
      {/* Background Image */}
      {bgImage && (
        <>
          <div className="absolute inset-0 z-0">
            <img 
              src={bgImage} 
              alt={title} 
              className="w-full h-full object-cover opacity-50"
            />
          </div>
          <div className="absolute inset-0 bg-black/60 z-[1]" />
        </>
      )}
      
      {!bgImage && (
         <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black z-0" />
      )}

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto mt-16">
        <motion.span 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="block text-zinc-200 text-sm md:text-base font-bold tracking-[0.2em] uppercase mb-4"
        >
          {subtitle}
        </motion.span>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-white"
        >
          {title}
        </motion.h1>
      </div>
    </div>
  );
};

export default PageHeader;
