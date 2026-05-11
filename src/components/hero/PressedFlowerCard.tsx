"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { HeroFlower } from "./heroData";
import { ParticleText } from "./ParticleText";
import { CTAButton } from "./CTAButton";

export function PressedFlowerCard({
  flower,
  onCta,
  className,
}: {
  flower: HeroFlower;
  onCta?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      layoutId={`card-${flower.id}`}
      className={cn(
        "relative w-[min(560px,92vw)]",
        "rounded-[28px] border border-[color:var(--line)] bg-[color:var(--card)]/92 backdrop-blur",
        "shadow-[0_45px_120px_rgba(26,26,24,0.18)]",
        className
      )}
      initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(800px_420px_at_20%_12%,rgba(185,106,106,0.12),transparent_60%),radial-gradient(720px_380px_at_75%_85%,rgba(162,168,107,0.10),transparent_60%)]" />

      <div className="relative p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[color:var(--muted)]">
              PRESSED-FLOWER CARD
            </p>
            <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-[0.08em] sm:text-4xl">
              {flower.name}
            </h3>
          </div>

          <motion.div
            layoutId={`flower-${flower.id}`}
            className="relative grid h-20 w-20 place-items-center"
            aria-hidden="true"
          >
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_45%_40%,rgba(255,255,255,0.55),rgba(185,106,106,0.18)_42%,transparent_72%)]" />
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_55%_65%,rgba(0,0,0,0.08),transparent_55%)]" />
            <div className="h-6 w-6 rounded-full bg-[radial-gradient(circle_at_40%_35%,rgba(255,255,255,0.9),rgba(185,106,106,0.45))] shadow-[0_18px_40px_rgba(26,26,24,0.14)]" />
          </motion.div>
        </div>

        <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)]/55 px-4 py-4">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            FLOWER MEANING
          </p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
            <ParticleText text={flower.meaning} mode="settle" />
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)]/45 px-4 py-4">
          <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
            A SHORT NOTE
          </p>
          <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
            <ParticleText text={flower.message} mode="settle" density={1} />
          </p>
        </div>

        <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[color:var(--muted)]">
            把花語變成一張能送出去的心意卡。
          </p>
          <CTAButton onClick={onCta}>Create Your Flower Card</CTAButton>
        </div>
      </div>
    </motion.div>
  );
}

