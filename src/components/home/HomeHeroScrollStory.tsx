"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Button } from "@/components/Button";
import { HeroStyleToggle } from "@/components/home/HeroStyleToggle";
import { cn } from "@/lib/cn";

export function HomeHeroScrollStory() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const veilRef = useRef<HTMLDivElement | null>(null);
  const cardARef = useRef<HTMLDivElement | null>(null);
  const cardBRef = useRef<HTMLDivElement | null>(null);
  const cardCRef = useRef<HTMLDivElement | null>(null);
  const step1Ref = useRef<HTMLDivElement | null>(null);
  const step2Ref = useRef<HTMLDivElement | null>(null);
  const step3Ref = useRef<HTMLDivElement | null>(null);

  const v: Variants = useMemo(
    () => ({
      h: { opacity: 0, y: reduced ? 0 : 16, filter: "blur(10px)" },
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
    let cleanup: (() => void) | null = null;

    (async () => {
      const gsapMod = await import("gsap");
      const stMod = await import("gsap/ScrollTrigger");
      const gsap = gsapMod.gsap ?? gsapMod.default;
      const maybe = stMod as unknown as {
        ScrollTrigger?: unknown;
        default?: unknown;
      };
      const ScrollTrigger = (maybe.ScrollTrigger ?? maybe.default) as {
        getAll: () => Array<{ kill: () => void }>;
      };
      gsap.registerPlugin(ScrollTrigger);

      const root = rootRef.current;
      const pin = pinRef.current;
      const img = imageRef.current;
      const veil = veilRef.current;
      const a = cardARef.current;
      const b = cardBRef.current;
      const c = cardCRef.current;
      const s1 = step1Ref.current;
      const s2 = step2Ref.current;
      const s3 = step3Ref.current;
      if (!root || !pin || !img || !veil || !a || !b || !c || !s1 || !s2 || !s3) return;

      gsap.set([a, b, c], { opacity: 0, y: 30, rotate: 0, transformOrigin: "50% 50%" });
      gsap.set([s1, s2, s3], { opacity: 0, y: 18, filter: "blur(6px)" });
      gsap.set(veil, { clipPath: "inset(100% 0% 0% 0% round 28px)" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: "+=220%",
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
        },
      });

      tl.to(veil, {
        clipPath: "inset(0% 0% 0% 0% round 28px)",
        duration: 0.9,
        ease: "power2.out",
      })
        .to(
          img,
          {
            scale: 1.06,
            y: -18,
            duration: 1.0,
            ease: "sine.out",
          },
          0
        )
        .to(
          a,
          { opacity: 1, y: 0, rotate: -6, x: -14, duration: 0.7, ease: "power3.out" },
          0.15
        )
        .to(
          b,
          { opacity: 1, y: 0, rotate: 4, x: 12, duration: 0.7, ease: "power3.out" },
          0.28
        )
        .to(
          c,
          { opacity: 1, y: 0, rotate: -1, x: 0, duration: 0.7, ease: "power3.out" },
          0.42
        )
        .to(s1, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6 }, 0.55)
        .to(s2, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6 }, 0.75)
        .to(s3, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6 }, 0.95)
        .to([a, b, c], { y: -10, duration: 0.9, ease: "sine.inOut" }, 1.05);

      cleanup = () => {
        try {
          tl.scrollTrigger?.kill?.();
          tl.kill();
          ScrollTrigger.getAll().forEach((t) => t.kill());
        } catch {
          // ignore
        }
      };
    })();

    return () => cleanup?.();
  }, [reduced]);

  return (
    <section className="relative overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 -z-10",
          "bg-[radial-gradient(1200px_650px_at_25%_20%,rgba(185,106,106,0.22),transparent_60%),radial-gradient(1000px_560px_at_75%_75%,rgba(162,168,107,0.18),transparent_62%)]"
        )}
      />

      <div className="absolute left-5 top-5 z-10 sm:left-8 sm:top-6">
        <HeroStyleToggle />
      </div>

      <div ref={rootRef} className="border-b border-[color:var(--line)]">
        {/* Entry screen */}
        <div className="mx-auto grid min-h-[78vh] max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 md:grid-cols-12 md:py-20">
          <div className="md:col-span-6">
            <motion.p
              variants={v}
              initial="h"
              animate="s"
              className="text-xs font-semibold tracking-[0.28em] text-[color:var(--muted)]"
            >
              SCROLL-DRIVEN IMMERSION
            </motion.p>
            <motion.h1
              variants={v}
              initial="h"
              animate="s"
              transition={{ delay: 0.06 }}
              className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-[1.02] tracking-[0.06em] sm:text-6xl"
            >
              往下捲
              <br />
              讓故事慢慢展開
            </motion.h1>
            <motion.p
              variants={v}
              initial="h"
              animate="s"
              transition={{ delay: 0.12 }}
              className="mt-6 max-w-xl text-base leading-8 text-[color:var(--muted)]"
            >
              這個版本是「捲動驅動」：畫面會釘選（pin），捲動決定遮罩揭露、作品層次與章節文字。
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
              <Button href="/recommend" size="lg" variant="outline">
                讓我推薦
              </Button>
            </motion.div>

            <p className="mt-10 text-xs font-semibold tracking-[0.28em] text-[color:var(--muted)]">
              ↓ SCROLL
            </p>
          </div>

          <div className="md:col-span-6">
            <div className="relative rounded-[36px] border border-[color:var(--line)] bg-[color:var(--card)] p-3">
              <div className="relative aspect-[16/10] overflow-hidden rounded-[28px]">
                <Image
                  src="/demo/pressed-cards.png"
                  alt="壓花卡片作品預覽"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[radial-gradient(800px_300px_at_35%_10%,rgba(255,255,255,0.40),transparent_60%)] dark:bg-[radial-gradient(800px_300px_at_35%_10%,rgba(255,255,255,0.12),transparent_60%)]" />
              </div>
              <div className="mt-3 flex items-center justify-between px-1 text-xs text-[color:var(--muted)]">
                <span>示意：捲動式沈浸（pin + scrub）</span>
                <span className="font-semibold tracking-[0.18em]">SCROLL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned story segment */}
        <div ref={pinRef} className="relative">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-12 md:items-center md:py-16">
            <div className="md:col-span-7">
              <div className="relative overflow-hidden rounded-[34px] border border-[color:var(--line)] bg-[color:var(--card)] p-3">
                <div
                  ref={veilRef}
                  className="relative overflow-hidden rounded-[28px]"
                >
                  <div ref={imageRef} className="relative aspect-[16/10]">
                    <Image
                      src="/demo/pressed-cards.png"
                      alt="沈浸式作品揭露"
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),transparent_35%,rgba(0,0,0,0.14))] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.22),transparent_35%,rgba(0,0,0,0.28))]" />
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0">
                  <div
                    ref={cardARef}
                    className="absolute left-6 top-6 w-[38%] rounded-3xl border border-[color:var(--line)] bg-[color:var(--background)]/70 p-3 backdrop-blur"
                  >
                    <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
                      花語
                    </p>
                    <p className="mt-2 text-sm font-semibold tracking-wide">
                      祝福、希望、思念
                    </p>
                  </div>
                  <div
                    ref={cardBRef}
                    className="absolute right-6 top-10 w-[34%] rounded-3xl border border-[color:var(--line)] bg-[color:var(--background)]/70 p-3 backdrop-blur"
                  >
                    <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
                      情境
                    </p>
                    <p className="mt-2 text-sm font-semibold tracking-wide">
                      畢業 / 加油
                    </p>
                  </div>
                  <div
                    ref={cardCRef}
                    className="absolute bottom-6 left-1/2 w-[44%] -translate-x-1/2 rounded-3xl border border-[color:var(--line)] bg-[color:var(--background)]/70 p-3 backdrop-blur"
                  >
                    <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
                      推薦理由
                    </p>
                    <p className="mt-2 text-sm font-semibold tracking-wide">
                      用標籤與花語，讓選擇變快
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="grid gap-3">
                <div
                  ref={step1Ref}
                  className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6"
                >
                  <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
                    STEP 1
                  </p>
                  <p className="mt-2 text-sm font-semibold tracking-wide">看作品</p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                    先被視覺打動，再進到細節。
                  </p>
                </div>
                <div
                  ref={step2Ref}
                  className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6"
                >
                  <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
                    STEP 2
                  </p>
                  <p className="mt-2 text-sm font-semibold tracking-wide">看花語</p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                    用故事把那句話說清楚。
                  </p>
                </div>
                <div
                  ref={step3Ref}
                  className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] p-6"
                >
                  <p className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]">
                    STEP 3
                  </p>
                  <p className="mt-2 text-sm font-semibold tracking-wide">快速預訂</p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                    留下聯絡方式與面交時段，我們協助確認。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-5 pb-14 sm:px-8 md:pb-16">
            <p className="text-xs text-[color:var(--muted)]">
              註：若你裝置開啟「減少動態效果」，此段會自動降級為一般呈現。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

