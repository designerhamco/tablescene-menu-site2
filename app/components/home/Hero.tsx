import React, { useRef, useEffect, useState } from 'react';
import { motion, useTransform, useMotionTemplate, useScroll } from 'motion/react';

const Hero = () => {
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect Mobile for conditional layout logic
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use global scroll progress instead of targeted scroll to avoid reference errors
  const { scrollY } = useScroll();

  // Map scrollY pixel values to 0-1 progress
  // Assuming 300vh height -> roughly 3000px scrollable area
  // Sticky content stays pinned for ~2000px
  // We'll map [0, 2000] to [0, 1] progress
  const scrollYProgress = useTransform(scrollY, [0, 1500], [0, 1]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0;
      videoRef.current.muted = true;
      videoRef.current.play().catch(error => {
        console.log("Video autoplay failed:", error);
      });
    }
  }, []);

  // Main Animations
  const progress = useTransform(scrollYProgress, [0, 0.8], [0, 1]);
  
  // Responsive Size Logic via CSS min():
  // Video Cube: Starts Full Screen -> Shrinks to Bottom-Center
  // Mobile: Reverted to 40vw per request (smaller like before)
  // Desktop: Reduced to 15vw (from 20vw) per request
  const targetSize = isMobile ? "40vw" : "15vw";
  const width = useMotionTemplate`calc((1 - ${progress}) * 100vw + ${progress} * ${targetSize})`;
  const height = useMotionTemplate`calc((1 - ${progress}) * 100vh + ${progress} * ${targetSize})`;
  
  // Video Cube Position
  // PC: Moves to 30vh (DO NOT TOUCH)
  // Mobile: Moves to 32vh (slightly higher than 38vh per request)
  // We use state-based strings for the target value
  const videoTargetY = isMobile ? "32vh" : "30vh";
  const videoX = useTransform(scrollYProgress, [0, 0.8], ["0%", "0%"]);
  const videoY = useTransform(scrollYProgress, [0, 0.8], ["0vh", videoTargetY]); 
  
  // Corner Radius
  const borderRadius = useTransform(scrollYProgress, [0, 0.8], ["0px", "24px"]);
  
  // Text fades out
  const initialTextOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const initialTextY = useTransform(scrollYProgress, [0, 0.2], [0, -50]);
  
  // Final Center Text Entrance
  // PC: Moves UP (-10vh) to avoid video and sit higher
  // Mobile: Stays Centered (0vh)
  const contentTargetY = isMobile ? "0vh" : "-10vh";
  const contentOpacity = useTransform(scrollYProgress, [0.7, 0.9], [0, 1]);
  const contentScale = useTransform(scrollYProgress, [0.7, 0.9], [0.9, 1]);
  const contentY = useTransform(scrollYProgress, [0.7, 0.9], ["10vh", contentTargetY]); 
  
  // Thumbnails Transforms
  const t1Op = useTransform(scrollYProgress, [0.4, 0.7], [0, 1]);
  const t2Op = useTransform(scrollYProgress, [0.45, 0.75], [0, 1]);
  const t3Op = useTransform(scrollYProgress, [0.5, 0.8], [0, 1]);
  const t4Op = useTransform(scrollYProgress, [0.55, 0.85], [0, 1]);
  const t5Op = useTransform(scrollYProgress, [0.6, 0.9], [0, 1]);
  const t6Op = useTransform(scrollYProgress, [0.65, 0.95], [0, 1]);

  const t1Y = useTransform(scrollYProgress, [0.4, 1], [100, 0]);
  const t2Y = useTransform(scrollYProgress, [0.4, 1], [120, 0]);
  const t3Y = useTransform(scrollYProgress, [0.4, 1], [80, 0]);
  const t4Y = useTransform(scrollYProgress, [0.4, 1], [60, 0]);
  const t5Y = useTransform(scrollYProgress, [0.4, 1], [140, 0]);
  const t6Y = useTransform(scrollYProgress, [0.4, 1], [90, 0]);
  
  // Updated Thumbnails Layout
  // Mobile: Increased sizes (w-[24vw], etc)
  // PC: Kept same
  const thumbnails = [
    { 
      src: "https://images.unsplash.com/photo-1745549670488-6852ef218009?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", 
      alt: "Dining Detail",
      // Top Left
      className: "top-[8%] left-[5%] w-[22vw] md:w-[12vw] aspect-square",
      style: { opacity: t1Op, y: t1Y }
    },
    { 
      src: "https://images.unsplash.com/photo-1759171993888-8fa717efd14c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", 
      alt: "Abstract Food",
      // Top Right
      className: "top-[8%] right-[5%] w-[24vw] md:w-[13vw] aspect-square",
      style: { opacity: t2Op, y: t2Y }
    },
    { 
      src: "https://images.unsplash.com/photo-1680946496238-5272d3c407fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", 
      alt: "Interior",
      // Middle Far Left
      className: "top-[35%] left-[3%] w-[18vw] md:w-[10vw] aspect-square",
      style: { opacity: t3Op, y: t3Y }
    },
    { 
      src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", 
      alt: "Chef",
      // Middle Far Right
      className: "top-[35%] right-[3%] w-[19vw] md:w-[11vw] aspect-square",
      style: { opacity: t4Op, y: t4Y }
    },
    {
      src: "https://images.unsplash.com/photo-1592656431823-6dd2a427a30b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
      alt: "Plating",
      // Bottom Left
      className: "bottom-[10%] left-[8%] w-[24vw] md:w-[13vw] aspect-square",
      style: { opacity: t5Op, y: t5Y }
    },
    {
      src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
      alt: "Food Top View",
      // Bottom Right
      className: "bottom-[10%] right-[8%] w-[22vw] md:w-[12vw] aspect-square",
      style: { opacity: t6Op, y: t6Y }
    }
  ];

  return (
    <section 
      ref={containerRef} 
      style={{ position: 'relative' }}
      className="relative h-[300vh] bg-[#fcfcfc]"
    >
      <div className="sticky top-0 h-screen w-screen left-1/2 -ml-[50vw] overflow-hidden flex items-center justify-center">
        
        {/* Layer 1: Thumbnails */}
        <div className="absolute inset-0 z-0 w-full h-full pointer-events-none flex items-center justify-center">
            <div className="relative w-full max-w-[1600px] h-full">
                {thumbnails.map((thumb, i) => (
                    <motion.div 
                    key={i}
                    style={thumb.style}
                    className={`absolute rounded-[24px] overflow-hidden shadow-xl border border-zinc-100 bg-white ${thumb.className}`}
                    >
                    <img 
                        src={thumb.src} 
                        alt={thumb.alt} 
                        className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500" 
                    />
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Layer 2: Main Background Video -> Becomes Bottom-Center Cube */}
        <motion.div 
          style={{ width, height, borderRadius, x: videoX, y: videoY }}
          className="relative z-10 shadow-2xl overflow-hidden bg-black"
        >
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1920&auto=format&fit=crop" 
              alt="Dining Background Fallback"
              className="w-full h-full object-cover opacity-60"
            />
          </div>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" 
            poster="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1920&auto=format&fit=crop"
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>

        {/* Layer 3: Initial Title */}
        <motion.div 
          style={{ opacity: initialTextOpacity, y: initialTextY }}
          className="absolute inset-0 z-20 flex items-start justify-center px-6 pt-32 text-center pointer-events-none md:items-center md:justify-start md:px-[max(3rem,calc((100vw-80rem)/2+1.5rem))] md:pt-0 md:text-left"
        >
          <div className="max-w-2xl">
            <h1 className="mb-5 text-3xl font-bold tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl">
              모든 매장을 위한<br />디지털 메뉴판 플랫폼
            </h1>
            <p className="mx-auto max-w-xl text-base font-medium text-white/90 drop-shadow-md md:mx-0 md:text-lg">
              메뉴와 가격표를 하나의 링크로 관리하세요.<br/>
              카페, 식당, 미용실, 네일샵까지 쉽게 만들고 바로 수정할 수 있습니다.
            </p>
          </div>
        </motion.div>

        {/* Layer 4: Final Text (Centered & Higher z-index) */}
        {/* Adjusted size for Mobile: text-5xl (up from 4xl) */}
        <motion.div 
           style={{ opacity: contentOpacity, scale: contentScale, y: contentY }}
           className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-5 tracking-tight leading-tight">
            메뉴판 수정,<br/> 이제 다시 만들지 말고<br className="md:hidden"/> 직접 바꾸세요.
          </h2>
           <p className="text-zinc-600 text-base md:text-lg max-w-lg mx-auto font-medium leading-relaxed">
             가격이 바뀌어도, 메뉴가 추가되어도<br/>
             사장님이 직접 수정하고 바로 공개할 수 있어요.
             <br className="hidden md:block"/>
             트렌디한 템플릿으로 시작해 TV, 태블릿, 모바일 어디서든 보여주세요.
           </p>
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;
