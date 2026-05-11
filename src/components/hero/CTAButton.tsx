"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export function CTAButton({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 560, damping: 34 }}
      className={cn(
        "group inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold tracking-wide",
        "bg-[color:var(--ink)] text-[color:var(--paper)]",
        "shadow-[0_18px_40px_rgba(26,26,24,0.16)] hover:shadow-[0_22px_52px_rgba(26,26,24,0.20)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]",
        className
      )}
    >
      <span className="relative">
        {children}
        <span className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-[color:var(--paper)]/70 transition-transform duration-300 group-hover:scale-x-100" />
      </span>
    </motion.button>
  );
}

