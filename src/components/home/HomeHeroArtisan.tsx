"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Button } from "@/components/Button";
import { HeroStyleToggle } from "@/components/home/HeroStyleToggle";
import { cn } from "@/lib/cn";

export function HomeHeroArtisan() {
  const reduced = useReducedMotion();
  const maskRef = useRef<HTMLDivElement | null>(null);

  const v: Variants = useMemo(
    () => ({
      h: { opacity: 0, y: reduced ? 0 : 12, filter: "blur(8px)" },
      s: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
          duration: 0.9,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        },
      },
    }),
    [reduced]
  );

  useEffect(() => {
    if (reduced) return;
    let cleanup: (() => void) | null = null;
    (async () => {
      const gsapMod = await import("gsap");
      const gsap = gsapMod.gsap ?? gsapMod.default;
      if (!maskRef.current) return;
      const tl = gsap.timeline({ repeat: -1, yoyo: true });
      tl.to(maskRef.current, { rotate: 0.6, duration: 7.5, ease: "sine.inOut" })
        .to(maskRef.current, { rotate: -0.6, duration: 8.5, ease: "sine.inOut" });
      cleanup = () => tl.kill();
    })();
    return () => {
      try {
        cleanup?.();
      } catch {
        // ignore
      }
    };
  }, [reduced]);

  return (
    <section className="relative overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 -z-10",
          "bg-[linear-gradient(135deg,rgba(0,0,0,0.03),transparent_40%,rgba(0,0,0,0.02)),radial-gradient(1000px_600px_at_30%_20%,rgba(185,106,106,0.16),transparent_60%),radial-gradient(900px_560px_at_75%_75%,rgba(162,168,107,0.14),transparent_62%)]"
        )}
      />

      <div className="absolute left-5 top-5 z-10 sm:left-8 sm:top-6">
        <HeroStyleToggle />
      </div>

      <div className="border-b border-[color:var(--line)]">
        <div className="mx-auto grid min-h-[76vh] max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 md:grid-cols-12 md:py-20">
          <div className="md:col-span-7">
            <motion.p
              variants={v}
              initial="h"
              animate="s"
              className="text-xs font-semibold tracking-[0.28em] text-[color:var(--muted)]"
            >
              HANDCRAFTED PAPER FEEL
            </motion.p>
            <motion.h1
              variants={v}
              initial="h"
              animate="s"
              transition={{ delay: 0.06 }}
              className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-[1.02] tracking-[0.06em] sm:text-6xl"
            >
              溫柔地
              <br />
              把心意壓進花裡
            </motion.h1>
            <motion.p
              variants={v}
              initial="h"
              animate="s"
              transition={{ delay: 0.12 }}
              className="mt-6 max-w-xl text-base leading-8 text-[color:var(--muted)]"
            >
              紙張、纖維、花材的層次感，是手作最迷人的地方。我們把這種「慢」用動效呈現，但不拖慢你挑選。
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
              <Button href="/floriography" size="lg" variant="ghost">
                看花語故事
              </Button>
            </motion.div>
          </div>

          <div className="md:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.14,
                duration: 0.95,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              className="relative"
            >
              <div className="absolute -inset-10 -z-10 rounded-[44px] bg-black/5 blur-3xl dark:bg-white/5" />

              <div className="relative overflow-hidden rounded-[34px] border border-[color:var(--line)] bg-[color:var(--card)] p-2">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
                  <Image
                    src="/demo/pressed-cards.png"
                    alt="壓花卡片作品預覽"
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority
                    className="object-cover"
                  />
                  <motion.div
                    ref={maskRef}
                    aria-hidden
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.8 }}
                  >
                    <div className="absolute -left-1/3 -top-1/3 h-[160%] w-[160%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.38),transparent_55%)] dark:bg-[radial-gradient(closest-side,rgba(255,255,255,0.14),transparent_55%)]" />
                    <div className="absolute inset-0 [mask-image:radial-gradient(70%_50%_at_30%_20%,black,transparent)] bg-black/0" />
                  </motion.div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between px-1 text-xs text-[color:var(--muted)]">
                <span>紙感遮罩揭露（低成本、細節感高）</span>
                <span className="font-semibold tracking-[0.18em]">ARTISAN</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

