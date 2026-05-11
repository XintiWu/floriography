"use client";

import { useRef } from "react";
import { useScroll, motion, useTransform } from "framer-motion";
import { WebGLScene } from "./WebGLScene";
import { PressedFlowerCard } from "./PressedFlowerCard";

export function ScrollyHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });



  // Title fades out very early to make room
  const titleOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.1], [0, -50]);

  // Stage 3 specific text overlays
  const stage3Opacity = useTransform(scrollYProgress, [0.2, 0.3, 0.4, 0.5], [0, 1, 1, 0]);
  const stage3Y = useTransform(scrollYProgress, [0.2, 0.3, 0.4, 0.5], [30, 0, 0, -30]);

  return (
    <section ref={containerRef} className="relative w-full" style={{ height: "600vh", backgroundColor: "#1a1a18", color: "#f3f1ea" }}>
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden">
        {/* Stage 1 Title */}
        <motion.div 
          style={{ opacity: titleOpacity, y: titleY }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center pointer-events-none px-4"
        >
          <p className="text-xs font-semibold tracking-[0.22em] text-[#b9b4a8] mb-3 uppercase">
            Floriography
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-6xl tracking-[0.06em] text-[#f3f1ea] mb-6 drop-shadow-md">
            花語未盡
          </h1>
          <p className="text-sm tracking-wide text-[#b9b4a8] max-w-md mx-auto leading-relaxed drop-shadow-sm">
            手作情感的數位延續<br/>Translating Handmade Emotions into Digital Experiences
          </p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 2, duration: 1.5 }}
            className="mt-8 flex items-center justify-center space-x-2"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b9b4a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
              <path d="M5 9l4 4-4 4"/>
              <path d="M9 13h10"/>
            </svg>
            <p className="text-xs tracking-[0.15em] text-[#b9b4a8] uppercase italic">
              Move cursor to interact
            </p>
          </motion.div>
          
          <motion.div 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-70"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
          >
            <span className="text-[10px] tracking-[0.2em] text-[#b9b4a8] uppercase mb-2">Scroll to explore</span>
            <motion.div 
              className="w-[1px] h-12 bg-gradient-to-b from-[#b9b4a8] to-transparent"
              animate={{ height: ["0rem", "3rem", "0rem"], y: [0, 10, 20] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>

        {/* Stage 3 Narrative Overlay */}
        <motion.div 
          style={{ opacity: stage3Opacity, y: stage3Y }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-[15vh] text-center pointer-events-none px-4"
        >
           <h2 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl tracking-[0.06em] text-[#f3f1ea] drop-shadow-md bg-black/40 backdrop-blur-md px-8 py-4 rounded-full border border-white/20">
            每一片飄落的花瓣，都承載著未說出口的心意。
          </h2>
        </motion.div>

        {/* 3D Scene */}
        <div className="absolute inset-0 z-0 pointer-events-none" style={{ width: '100vw', height: '100vh' }}>
          <WebGLScene scrollProgress={scrollYProgress} eventSourceRef={containerRef} />
        </div>

        {/* Stage 5 Card Overlay */}
        <PressedFlowerCard scrollProgress={scrollYProgress} />
        
        {/* Debug Overlay - Only visible during development to diagnose scroll */}
        <div className="absolute top-4 right-4 z-50 bg-black/80 text-white p-4 rounded text-xs font-mono">
          <p>Debug Info:</p>
          <motion.p>
            Scroll Progress: <motion.span>{useTransform(scrollYProgress, v => v.toFixed(3))}</motion.span>
          </motion.p>
        </div>
      </div>
    </section>
  );
}
