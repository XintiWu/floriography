"use client";

import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/cn";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ParticleText({
  text,
  mode = "scatter",
  className,
  density = 1,
}: {
  text: string;
  mode?: "scatter" | "settle";
  className?: string;
  density?: number;
}) {
  const chars = useMemo(() => {
    const base = [...text];
    const out: { ch: string; i: number }[] = [];
    for (let i = 0; i < base.length; i++) {
      const repeats = base[i] === " " ? 1 : Math.max(1, Math.round(density));
      for (let r = 0; r < repeats; r++) out.push({ ch: base[i], i: i * 97 + r });
    }
    return out;
  }, [text, density]);

  const container: Variants = {
    scatter: {
      transition: { staggerChildren: 0.006, delayChildren: 0.02 },
    },
    settle: {
      transition: { staggerChildren: 0.012, delayChildren: 0.08 },
    },
  };

  return (
    <motion.span
      className={cn("inline-flex flex-wrap gap-x-[0.02em]", className)}
      variants={container}
      initial={false}
      animate={mode}
    >
      {chars.map(({ ch, i }) => {
        const rnd = mulberry32(i + text.length * 101);
        const x = (rnd() - 0.5) * 26;
        const y = (rnd() - 0.5) * 18;
        const r = (rnd() - 0.5) * 18;
        const o = 0.35 + rnd() * 0.65;

        const item: Variants = {
          scatter: {
            x,
            y,
            rotate: r,
            opacity: ch === " " ? 0 : o,
            filter: "blur(0.2px)",
            transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
          },
          settle: {
            x: 0,
            y: 0,
            rotate: 0,
            opacity: ch === " " ? 0 : 1,
            filter: "blur(0px)",
            transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
          },
        };

        return (
          <motion.span
            key={`${i}-${ch}`}
            variants={item}
            className={cn(
              "relative inline-block will-change-transform",
              ch === " " && "w-[0.35em]"
            )}
            aria-hidden={ch === " " ? true : undefined}
          >
            {ch === " " ? " " : ch}
          </motion.span>
        );
      })}
    </motion.span>
  );
}

