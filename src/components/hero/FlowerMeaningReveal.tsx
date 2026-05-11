"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

export function FlowerMeaningReveal({
  show,
  name,
  meaning,
  className,
}: {
  show: boolean;
  name: string;
  meaning: string;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 4, filter: "blur(8px)" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "pointer-events-none absolute left-1/2 top-full z-20 mt-4 w-[min(320px,70vw)] -translate-x-1/2",
            className
          )}
        >
          <div
            className={cn(
              "rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)]/85 backdrop-blur-sm",
              "px-4 py-3 shadow-[0_22px_60px_rgba(26,26,24,0.12)]"
            )}
          >
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[color:var(--muted)]">
              {name.toUpperCase()}
            </p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
              {meaning}
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

