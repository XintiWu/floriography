"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Button } from "@/components/Button";
import { HeroStyleToggle } from "@/components/home/HeroStyleToggle";
import { cn } from "@/lib/cn";

export function HomeHeroEditorial() {
  const reduced = useReducedMotion();
  const bgRef = useRef<HTMLDivElement | null>(null);

  const v: Variants = useMemo(
    () => ({
      h: { opacity: 0, y: reduced ? 0 : 16, filter: "blur(8px)" },
      s: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
          duration: 0.95,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        },
      },
    }),
    [reduced]
  );

  useEffect(() => {
    if (reduced) return;
    let killed = false;
    (async () => {
      const gsapMod = await import("gsap");
      const gsap = gsapMod.gsap ?? gsapMod.default;
      if (!bgRef.current || killed) return;
      gsap.set(bgRef.current, { backgroundPosition: "50% 50%" });
      gsap.to(bgRef.current, {
        backgroundPosition: "55% 45%",
        duration: 7.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    })();
    return () => {
      killed = true;
    };
  }, [reduced]);

  return (
    <section className="relative overflow-hidden">
      <div
        ref={bgRef}
        className={cn(
          "absolute inset-0 -z-10",
          "bg-[radial-gradient(1200px_650px_at_30%_20%,rgba(185,106,106,0.22),transparent_60%),radial-gradient(1000px_560px_at_75%_75%,rgba(162,168,107,0.18),transparent_62%)]"
        )}
      />

      <div className="absolute left-5 top-5 z-10 sm:left-8 sm:top-6">
        <HeroStyleToggle />
      </div>

      <div className="border-b border-[color:var(--line)]">
        <div className="mx-auto grid min-h-[76vh] max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 md:grid-cols-12 md:py-20">
          <div className="md:col-span-7">
            <motion.p
              variants={v}
              initial="h"
              animate="s"
              className="text-xs font-semibold tracking-[0.28em] text-[color:var(--muted)]"
            >
              AUNT-MADE • PRESSED FLOWERS • LIMITED
            </motion.p>

            <motion.h1
              variants={v}
              initial="h"
              animate="s"
              transition={{ delay: 0.06 }}
              className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-[0.98] tracking-[0.08em] sm:text-6xl"
            >
              A Quiet Gift
              <br />
              That Speaks.
            </motion.h1>

            <motion.p
              variants={v}
              initial="h"
              animate="s"
              transition={{ delay: 0.12 }}
              className="mt-6 max-w-xl text-base leading-8 text-[color:var(--muted)]"
            >
              把壓花卡片的情緒與故事數位化。用作品、花語與情境推薦，替你把心意說得剛剛好。
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.22,
                duration: 0.75,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Button href="/cards" size="lg">
                逛作品
              </Button>
              <Button href="/reserve" size="lg" variant="outline">
                預訂/詢價
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.8 }}
              className="mt-10 grid grid-cols-3 gap-3 max-w-lg"
            >
              {[
                ["一張一款", "每張手工，略有差異"],
                ["面交/自取", "填表後協調時段"],
                ["可客製", "色系、用途、文字"],
              ].map(([t, d]) => (
                <div
                  key={t}
                  className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)]/70 p-4 backdrop-blur"
                >
                  <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
                    {t}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[color:var(--muted)]">
                    {d}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="md:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.14,
                duration: 0.95,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              className="relative"
            >
              <div className="absolute -inset-10 -z-10 rounded-[40px] bg-black/5 blur-3xl dark:bg-white/5" />
              <div className="overflow-hidden rounded-[34px] border border-[color:var(--line)] bg-[color:var(--card)] p-2">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
                  <Image
                    src="/demo/pressed-cards.png"
                    alt="壓花卡片作品預覽"
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between px-1 text-xs text-[color:var(--muted)]">
                <span>看得到細節的紙感與花材層次</span>
                <span className="font-semibold tracking-[0.18em]">EDITION</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

