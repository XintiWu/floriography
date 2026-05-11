"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { CTAButton } from "./CTAButton";

export function PressedFlowerCard({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  // Cinematic 3D reveal for the card (appears after a massive pause at 0.8)
  const opacity = useTransform(scrollProgress, [0.8, 0.9], [0, 1]);
  const y = useTransform(scrollProgress, [0.8, 0.9], [80, 0]);
  const scale = useTransform(scrollProgress, [0.8, 0.95], [0.85, 1]);
  const rotateX = useTransform(scrollProgress, [0.8, 0.9], [10, 0]);

  return (
    <motion.div 
      style={{ 
        opacity, 
        y, 
        scale,
        rotateX,
        perspective: 1000,
        pointerEvents: useTransform(scrollProgress, v => v > 0.85 ? 'auto' : 'none') 
      }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4"
    >
      {/* Exquisite Glassmorphism Card with explicit dark text to contrast the dark hero */}
      <div className="relative mt-[10vh] max-w-md w-full bg-[#fbfaf7]/95 rounded-3xl border border-white/40 shadow-2xl p-10 text-center backdrop-blur-md transition-all duration-700 hover:scale-[1.02] hover:shadow-3xl">
        {/* Subtle inner border for premium print feel */}
        <div className="absolute inset-2 border border-[#1a1a18]/5 rounded-2xl pointer-events-none"></div>
        
        <p className="text-xs font-semibold tracking-[0.25em] text-[#8a857b] mb-4 uppercase">
          情境推薦指南
        </p>
        <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em] text-[#1a1a18] mb-8 leading-snug">
          依照您的心意與情境，<br/>挑選最適合的壓花卡片。
        </h2>
        <CTAButton />
      </div>
    </motion.div>
  );
}
