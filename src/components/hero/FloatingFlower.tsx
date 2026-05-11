"use client";

import { useMemo } from "react";
import {
  motion,
  type MotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/cn";
import { FlowerMeaningReveal } from "./FlowerMeaningReveal";
import type { HeroFlower } from "./heroData";

function accentTokens(accent: HeroFlower["accent"]) {
  switch (accent) {
    case "rose":
      return {
        core: "rgba(185,106,106,0.52)",
        petal: "rgba(185,106,106,0.28)",
        glow: "rgba(185,106,106,0.28)",
      };
    case "lavender":
      return {
        core: "rgba(126,114,165,0.50)",
        petal: "rgba(126,114,165,0.26)",
        glow: "rgba(126,114,165,0.26)",
      };
    case "mint":
      return {
        core: "rgba(162,168,107,0.48)",
        petal: "rgba(162,168,107,0.22)",
        glow: "rgba(162,168,107,0.22)",
      };
  }
}

export function FloatingFlower({
  flower,
  leftPct,
  topPct,
  depth = 0.6,
  mouseX,
  mouseY,
  time,
  seed = 1,
  isActive,
  isHovered,
  onHoverChange,
  onHoverTarget,
  onSelect,
}: {
  flower: HeroFlower;
  leftPct: number;
  topPct: number;
  depth?: number;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  time: MotionValue<number>;
  seed?: number;
  isActive: boolean;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
  onHoverTarget?: (rect: DOMRect | null) => void;
  onSelect?: (rect: DOMRect) => void;
}) {
  const reducedMotion = useReducedMotion();
  const tokens = accentTokens(flower.accent);

  // Keep motion-derived transforms deterministic across SSR/CSR by rounding.
  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  const petals = useMemo(() => {
    const count = 8;
    return Array.from({ length: count }, (_, i) => i);
  }, []);

  const petalContainer: Variants = {
    rest: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
    hover: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
    pressed: { transition: { staggerChildren: 0.015 } },
  };

  const petal: Variants = {
    rest: {
      scaleY: 0.86,
      opacity: 0.72,
      filter: "blur(0px)",
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    },
    hover: {
      scaleY: 1,
      opacity: 0.98,
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
    pressed: {
      scaleY: 0.4,
      opacity: 0.55,
      filter: "blur(0.3px)",
      transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const windRotateMv = useTransform(mouseX, (v) => v * (6 + depth * 8));
  const windDriftXMv = useTransform(mouseX, (v) => v * (18 + depth * 30));
  const windDriftYMv = useTransform(mouseY, (v) => v * (10 + depth * 18));

  const aliveXMv = useTransform(time, (tt) => {
    const s = (seed % 97) * 0.13;
    return round3(Math.sin(tt * (0.9 + depth * 0.5) + s) * (2 + depth * 5));
  });
  const aliveYMv = useTransform(time, (tt) => {
    const s = (seed % 53) * 0.17;
    return round3(Math.cos(tt * (0.8 + depth * 0.55) + s) * (2 + depth * 6));
  });
  const aliveRotMv = useTransform(time, (tt) => {
    const s = (seed % 41) * 0.19;
    return round3(Math.sin(tt * (0.55 + depth * 0.35) + s) * (1.2 + depth * 1.6));
  });

  const xMv = useTransform([windDriftXMv, aliveXMv], (latest: number[]) =>
    round3((latest[0] ?? 0) + (latest[1] ?? 0))
  );
  const yMv = useTransform([windDriftYMv, aliveYMv], (latest: number[]) =>
    round3((latest[0] ?? 0) + (latest[1] ?? 0))
  );
  const rotMv = useTransform([windRotateMv, aliveRotMv], (latest: number[]) =>
    round3((latest[0] ?? 0) + (latest[1] ?? 0))
  );

  return (
    <motion.button
      type="button"
      layoutId={`flower-${flower.id}`}
      className={cn(
        "absolute select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
      )}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        x: reducedMotion ? 0 : xMv,
        y: reducedMotion ? 0 : yMv,
        rotate: reducedMotion ? 0 : rotMv,
        transformPerspective: 800,
      }}
      initial={false}
      animate={isActive ? "pressed" : "rest"}
      whileHover="hover"
      onHoverStart={(e) => {
        onHoverChange?.(true);
        const el = (e.currentTarget as HTMLButtonElement | null) ?? null;
        if (!el) return;
        onHoverTarget?.(el.getBoundingClientRect());
      }}
      onHoverEnd={() => {
        onHoverChange?.(false);
        onHoverTarget?.(null);
      }}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
        onSelect?.(rect);
      }}
    >
      <motion.div
        className={cn(
          "relative grid place-items-center rounded-full",
          "h-28 w-28 sm:h-32 sm:w-32",
          "will-change-transform"
        )}
        whileHover={reducedMotion ? undefined : { scale: 1.06 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
      >
        <motion.div
          className="absolute inset-0 -z-10 rounded-full"
          initial={false}
          animate={{
            opacity: isActive ? 0.28 : 0,
          }}
        />

        <motion.div
          className={cn(
            "absolute -inset-6 rounded-full blur-2xl",
            "opacity-0"
          )}
          initial={false}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{
            background: `radial-gradient(circle at 40% 35%, ${tokens.glow}, transparent 62%)`,
          }}
        />

        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 45% 40%, rgba(255,255,255,0.55), ${tokens.petal} 42%, transparent 72%)`,
          }}
        />

        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 55% 65%, rgba(0,0,0,0.08), transparent 55%)",
          }}
        />

        <motion.div
          className="absolute inset-0"
          variants={petalContainer}
        >
          {petals.map((i) => {
            const angle = (i / petals.length) * 360;
            return (
              <motion.span
                key={i}
                variants={petal}
                className="absolute left-1/2 top-1/2 h-10 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  rotate: angle,
                  transformOrigin: "50% 100%",
                  background: `linear-gradient(180deg, rgba(255,255,255,0.72), ${tokens.petal})`,
                  boxShadow: "0 18px 38px rgba(26,26,24,0.10)",
                }}
              />
            );
          })}
        </motion.div>

        <motion.div
          className="relative grid h-9 w-9 place-items-center rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 35%, rgba(255,255,255,0.85), ${tokens.core})`,
            boxShadow: "0 18px 40px rgba(26,26,24,0.16)",
          }}
        >
          <span className="sr-only">{flower.name}</span>
        </motion.div>

        <FlowerMeaningReveal
          show={Boolean(isHovered) && !isActive}
          name={flower.name}
          meaning={flower.meaning}
        />
      </motion.div>
    </motion.button>
  );
}

