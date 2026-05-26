"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Button } from "@/components/Button";
import { HeroStyleToggle } from "@/components/home/HeroStyleToggle";
import { cn } from "@/lib/cn";

export function HomeHeroGallery() {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const v: Variants = useMemo(
    () => ({
      h: { opacity: 0, y: reduced ? 0 : 14, filter: "blur(8px)" },
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
    const el = wrapRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ x: px, y: py });
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", () => setTilt({ x: 0, y: 0 }));
    return () => {
      el.removeEventListener("pointermove", onMove);
    };
  }, [reduced]);

  return (
    <section className="relative overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 -z-10",
          "bg-[radial-gradient(900px_500px_at_25%_15%,rgba(162,168,107,0.22),transparent_60%),radial-gradient(1000px_600px_at_80%_70%,rgba(185,106,106,0.20),transparent_62%)]"
        )}
      />

      <div className="absolute left-5 top-5 z-10 sm:left-8 sm:top-6">
        <HeroStyleToggle />
      </div>

      <div className="border-b border-[color:var(--line)]">
        <div
          ref={wrapRef}
          className="mx-auto grid min-h-[78vh] max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 md:grid-cols-12 md:py-20"
        >
          <div className="md:col-span-6">
            <motion.p
              variants={v}
              initial="h"
              animate="s"
              className="text-xs font-semibold tracking-[0.28em] text-[color:var(--muted)]"
            >
              IMMERSIVE GALLERY
            </motion.p>
            <motion.h1
              variants={v}
              initial="h"
              animate="s"
              transition={{ delay: 0.06 }}
              className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-[1.0] tracking-[0.06em] sm:text-6xl"
            >
              進到作品裡
              <br />
              再決定要說什麼
            </motion.h1>
            <motion.p
              variants={v}
              initial="h"
              animate="s"
              transition={{ delay: 0.12 }}
              className="mt-6 max-w-xl text-base leading-8 text-[color:var(--muted)]"
            >
              用滑鼠移動感受微視差與聚焦。點進作品，再用花語與情境推薦把選擇變簡單。
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
              <Button href="/floriography" size="lg">
                逛花語
              </Button>
              <Button href="/recommend" size="lg" variant="outline">
                讓我推薦
              </Button>
            </motion.div>
          </div>

          <div className="md:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: reduced ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.14,
                duration: 0.95,
                ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
              }}
              style={
                reduced
                  ? undefined
                  : {
                      transform: `perspective(1200px) rotateX(${-tilt.y * 6}deg) rotateY(${tilt.x * 8}deg)`,
                      transformStyle: "preserve-3d",
                    }
              }
              className="relative"
            >
              <div className="absolute -inset-10 -z-10 rounded-[42px] bg-black/5 blur-3xl dark:bg-white/5" />

              <div className="grid gap-3 rounded-[36px] border border-[color:var(--line)] bg-[color:var(--card)] p-3">
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="relative aspect-[1/1] overflow-hidden rounded-[22px]"
                      style={
                        reduced
                          ? undefined
                          : { transform: `translateZ(${8 + i * 6}px)` }
                      }
                    >
                      <Image
                        src="/demo/pressed-cards.png"
                        alt="作品預覽"
                        fill
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-cover"
                        priority={i === 0}
                      />
                    </div>
                  ))}
                </div>

                <div className="relative aspect-[16/10] overflow-hidden rounded-[26px]">
                  <Image
                    src="/demo/pressed-cards.png"
                    alt="作品預覽大圖"
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(800px_300px_at_30%_10%,rgba(255,255,255,0.35),transparent_55%)] dark:bg-[radial-gradient(800px_300px_at_30%_10%,rgba(255,255,255,0.12),transparent_55%)]" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between px-1 text-xs text-[color:var(--muted)]">
                <span>微視差（可關閉：系統減少動態）</span>
                <span className="font-semibold tracking-[0.18em]">GALLERY</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

