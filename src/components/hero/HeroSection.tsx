"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useMotionValueEvent,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/cn";
import { Container } from "@/components/Container";
import { FloatingFlower } from "./FloatingFlower";
import { ParticleFieldCanvas } from "./ParticleFieldCanvas";
import { PressedFlowerCard } from "./PressedFlowerCard";
import { ParticleText } from "./ParticleText";
import { heroFlowers, type HeroFlower } from "./heroData";

type Stage = "garden" | "zoom" | "card";

export function HeroSection() {
  const reducedMotion = useReducedMotion();
  const wrapRef = useRef<HTMLElement | null>(null);
  const storyRef = useRef<HTMLElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<Stage>("garden");
  const [active, setActive] = useState<HeroFlower | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [camera, setCamera] = useState<{ x: number; y: number; scale: number }>(
    { x: 0, y: 0, scale: 1 }
  );
  const [isBreathing, setIsBreathing] = useState(true);
  const [hoverTarget, setHoverTarget] = useState<{ x: number; y: number } | null>(
    null
  );
  const [burstKey, setBurstKey] = useState(0);
  const [chapter, setChapter] = useState<0 | 1 | 2>(0);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const t = useMotionValue(0);

  const bgX = useTransform(mx, (v) => v * 28);
  const bgY = useTransform(my, (v) => v * 18);
  const midX = useTransform(mx, (v) => v * 46);
  const midY = useTransform(my, (v) => v * 28);
  const paneBgX = useTransform(mx, (v) => v * -16);
  const paneBgY = useTransform(my, (v) => v * -10);
  const dustX = useTransform(mx, (v) => v * 10);
  const dustY = useTransform(my, (v) => v * 7);

  const { scrollYProgress } = useScroll({
    target: storyRef as unknown as React.RefObject<HTMLElement>,
    offset: ["start start", "end start"],
  });

  const progress = useTransform(scrollYProgress, (v) => clamp01(v));
  // Don't gate visibility by scroll progress (can read as "everything disappeared" at top).
  // Use a simple mount fade-in instead.
  const sceneLift = useTransform(progress, [0, 1], [0, -14]);
  const sceneScale = useTransform(progress, [0, 0.55, 1], [1, 1.06, 1.02]);

  useMotionValueEvent(progress, "change", (v) => {
    if (v < 0.38) setChapter(0);
    else if (v < 0.74) setChapter(1);
    else setChapter(2);
  });

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t.set(t.get() + dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, t]);

  const headlineVariants: Variants = useMemo(
    () => ({
      hidden: { opacity: 0, y: reducedMotion ? 0 : 10, filter: "blur(8px)" },
      show: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
      },
    }),
    [reducedMotion]
  );

  const flowerPlacements = useMemo(
    () => [
      { id: "rose", left: 18, top: 55, depth: 0.8 },
      { id: "babys-breath", left: 70, top: 30, depth: 0.45 },
      { id: "lavender", left: 78, top: 68, depth: 0.72 },
    ],
    []
  );

  const narrative = useMemo(
    () => [
      {
        kicker: "SCENE I • GARDEN",
        title: "花先漂浮成一個空間",
        body: "用滑鼠掀起微風，讓花瓣有呼吸、讓紙面有深度。",
      },
      {
        kicker: "SCENE II • MEANING",
        title: "再慢慢長出它的花語",
        body: "懸停是一種靠近：粒子開始聚攏，字句從空氣裡浮出。",
      },
      {
        kicker: "SCENE III • PRESS",
        title: "最後被壓進紙纖維裡",
        body: "點一下，鏡頭拉近；花瓣攤平，重組成一張可送出的卡。",
      },
    ],
    []
  );

  const mode: "garden" | "meaning" | "press" | "card" =
    stage === "card" ? "card" : chapter === 0 ? "garden" : chapter === 1 ? "meaning" : "press";

  const forestOn = chapter >= 2 || stage === "zoom" || stage === "card";

  return (
    <section
      ref={storyRef as unknown as React.RefObject<HTMLElement>}
      className={cn("relative border-b border-[color:var(--line)]")}
      style={{ height: "320vh" }}
    >
      <div
        ref={wrapRef as unknown as React.RefObject<HTMLDivElement>}
        className="sticky top-0 min-h-[100svh] overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        >
          <section
            className={cn("relative isolate overflow-hidden")}
      onMouseMove={(e) => {
        if (reducedMotion) return;
        setIsBreathing(false);
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = (e.clientX - rect.left) / rect.width - 0.5;
        const dy = (e.clientY - rect.top) / rect.height - 0.5;
        mx.set(dx);
        my.set(dy);
      }}
      onMouseLeave={() => {
        if (reducedMotion) return;
        setIsBreathing(true);
        mx.set(0);
        my.set(0);
      }}
    >
      {/* Dark-forest cinematic grade (ramps in on Scene III / Press + click zoom) */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        initial={false}
        animate={{
          opacity:
            stage === "zoom" || stage === "card"
              ? 1
              : chapter >= 2
                ? 0.92
                : 0,
        }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* poetic, low-contrast forest grade (no horror) */}
        <div className="absolute inset-0 bg-[radial-gradient(900px_560px_at_35%_25%,rgba(12,18,14,0.78),transparent_64%),radial-gradient(1100px_720px_at_74%_82%,rgba(9,12,10,0.78),transparent_66%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,14,12,0.48),rgba(12,18,14,0.42)_55%,rgba(26,26,24,0.18))]" />

        {/* mist */}
        <motion.div
          className="absolute inset-0 opacity-[0.42] [mask-image:radial-gradient(circle_at_55%_55%,black,transparent_74%)] mix-blend-mode:soft-light"
          animate={
            reducedMotion
              ? { opacity: 0.42 }
              : { backgroundPosition: ["40% 40%", "62% 58%", "42% 46%"] }
          }
          transition={
            reducedMotion
              ? undefined
              : { duration: 14, ease: "easeInOut", repeat: Infinity }
          }
          style={{
            backgroundImage:
              "radial-gradient(760px 460px at 28% 36%, rgba(236,232,214,0.10), transparent 62%), radial-gradient(860px 560px at 72% 66%, rgba(211,214,188,0.08), transparent 64%)",
            backgroundSize: "120% 120%",
          }}
        />

        {/* vignette */}
        <div className="absolute inset-0 [mask-image:radial-gradient(circle_at_50%_45%,transparent_58%,black_100%)] bg-[#060706]/45" />

        {/* firefly bokeh */}
        <motion.div
          className="absolute inset-0 opacity-[0.55] mix-blend-screen"
          animate={
            reducedMotion
              ? { opacity: 0.55 }
              : { opacity: [0.42, 0.62, 0.46] }
          }
          transition={
            reducedMotion
              ? undefined
              : { duration: 6.8, ease: "easeInOut", repeat: Infinity }
          }
        >
          <div className="absolute left-[18%] top-[30%] h-14 w-14 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(255,244,204,0.16),transparent_62%)] blur-xl" />
          <div className="absolute left-[62%] top-[20%] h-12 w-12 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(255,244,204,0.12),transparent_62%)] blur-xl" />
          <div className="absolute left-[78%] top-[62%] h-16 w-16 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(255,244,204,0.11),transparent_62%)] blur-2xl" />
          <div className="absolute left-[36%] top-[74%] h-16 w-16 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(210,255,220,0.07),transparent_62%)] blur-2xl" />
        </motion.div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{ x: bgX, y: bgY }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_22%_22%,rgba(185,106,106,0.16),transparent_60%),radial-gradient(860px_480px_at_78%_78%,rgba(162,168,107,0.14),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.55] [mask-image:radial-gradient(circle_at_50%_30%,black,transparent_70%)]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(26,26,24,0.05))]" />
        </div>
      </motion.div>

      <motion.div
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{ x: midX, y: midY }}
      >
        {/* prevent overexposure: dim big white blooms when forest is on */}
        <motion.div
          className="absolute left-[-12%] top-[14%] h-[520px] w-[520px] rounded-full blur-2xl"
          initial={false}
          animate={{ opacity: forestOn ? 0.08 : 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), transparent 66%)",
          }}
        />
        <motion.div
          className="absolute right-[-14%] bottom-[-12%] h-[640px] w-[640px] rounded-full blur-2xl"
          initial={false}
          animate={{ opacity: forestOn ? 0.06 : 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.40), transparent 68%)",
          }}
        />
      </motion.div>

      <div className="min-h-[100svh] py-16 sm:py-20">
        <Container className="relative">
          <div className="grid gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-6">
              <motion.p
                variants={headlineVariants}
                initial="hidden"
                animate="show"
                className="text-xs font-semibold tracking-[0.22em] text-[color:var(--muted)]"
              >
                {narrative[chapter].kicker}
              </motion.p>

              <motion.h1
                variants={headlineVariants}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.05 }}
                className="mt-6 text-balance"
              >
                <span className="block font-[family-name:var(--font-display)] text-4xl leading-[1.05] tracking-[0.08em] sm:text-5xl">
                  {narrative[chapter].title}
                </span>
              </motion.h1>

              <motion.p
                variants={headlineVariants}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.12 }}
                className="mt-5 max-w-xl text-sm leading-7 text-[color:var(--muted)] sm:text-base sm:leading-8"
              >
                {narrative[chapter].body}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.22,
                  duration: 0.75,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-8"
              >
                <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--line)] bg-[color:var(--card)]/70 px-4 py-2 text-xs text-[color:var(--muted)] backdrop-blur">
                  <span className="font-semibold tracking-[0.18em]">TIP</span>
                  <span>
                    {chapter === 0
                      ? "滑鼠像微風，花會呼吸。"
                      : chapter === 1
                        ? "懸停一朵花：粒子會聚攏，花語浮現。"
                        : "點擊一朵花：鏡頭拉近，壓成卡片。"}
                  </span>
                </div>
              </motion.div>
            </div>

            <div className="relative md:col-span-6">
              <LayoutGroup>
                <motion.div
                  ref={sceneRef}
                  className="relative h-[520px] w-full overflow-hidden rounded-[42px] sm:h-[640px]"
                  style={{ transformOrigin: "50% 50%" }}
                  animate={{
                    x: camera.x,
                    y: camera.y,
                    scale: camera.scale,
                  }}
                  transition={{
                    duration: reducedMotion ? 0.25 : 0.78,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{ opacity: useTransform(progress, [0, 0.2], [0.6, 1]) }}
                  >
                    <ParticleFieldCanvas
                      density={1}
                      mouseX={mx}
                      mouseY={my}
                      hoverTarget={hoverTarget}
                      mode={mode}
                      burstKey={burstKey}
                    />
                  </motion.div>

                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      y: sceneLift,
                      scale: sceneScale,
                    }}
                  >
                    <motion.div
                      aria-hidden="true"
                      className="absolute inset-0"
                    animate={
                      stage === "garden" && isBreathing && !reducedMotion
                        ? { x: [-6, 5, -4], y: [4, -3, 5] }
                        : { x: 0, y: 0 }
                    }
                    transition={
                      stage === "garden" && isBreathing && !reducedMotion
                        ? {
                            duration: 9.5,
                            ease: "easeInOut",
                            repeat: Infinity,
                            repeatType: "mirror",
                          }
                        : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                    }
                  >
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      x: paneBgX,
                      y: paneBgY,
                    }}
                  >
                    <div className="absolute inset-0 rounded-[42px] border border-[color:var(--line)] bg-[color:var(--card)]/35 backdrop-blur-[2px]" />
                    <motion.div
                      className="absolute inset-0 rounded-[42px]"
                      initial={false}
                      animate={{ opacity: forestOn ? 0.18 : 1 }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        background:
                          "radial-gradient(900px 520px at 35% 25%, rgba(255,255,255,0.62), transparent 62%)",
                      }}
                    />
                    <div className="absolute inset-0 rounded-[42px] opacity-[0.55] [mask-image:radial-gradient(circle_at_50%_35%,black,transparent_70%)]">
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.20),transparent_55%)]" />
                    </div>
                  </motion.div>

                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      x: dustX,
                      y: dustY,
                    }}
                  >
                    <div className="absolute left-[8%] top-[18%] h-1 w-1 rounded-full bg-[color:var(--muted)]/35" />
                    <div className="absolute left-[62%] top-[24%] h-1 w-1 rounded-full bg-[color:var(--muted)]/25" />
                    <div className="absolute left-[28%] top-[68%] h-1 w-1 rounded-full bg-[color:var(--muted)]/30" />
                  </motion.div>

                  <AnimatePresence initial={false}>
                    {stage !== "card" ? (
                      <motion.div
                        key="garden"
                        className="absolute inset-0"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: stage === "garden" ? 1 : 0.28 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        {flowerPlacements.map((p) => {
                          const flower = heroFlowers.find((f) => f.id === p.id);
                          if (!flower) return null;
                          const activeNow = active?.id === flower.id;
                          return (
                            <FloatingFlower
                              key={flower.id}
                              flower={flower}
                              leftPct={p.left}
                              topPct={p.top}
                              depth={p.depth}
                              mouseX={mx}
                              mouseY={my}
                              time={t}
                              seed={p.id.length * 97 + Math.round(p.left * 7) + Math.round(p.top * 11)}
                              isActive={stage !== "garden" && activeNow}
                              isHovered={hoveredId === flower.id}
                              onHoverChange={(h) =>
                                setHoveredId(h ? flower.id : null)
                              }
                              onHoverTarget={(r) => {
                                if (!r) {
                                  setHoverTarget(null);
                                  return;
                                }
                                const pane = sceneRef.current?.getBoundingClientRect();
                                if (!pane) return;
                                const x = r.left + r.width / 2 - pane.left;
                                const y = r.top + r.height / 2 - pane.top;
                                setHoverTarget({ x, y });
                              }}
                              onSelect={(rect) => {
                                setActive(flower);
                                const paneRect = sceneRef.current?.getBoundingClientRect();
                                if (!paneRect) return;

                                const flowerCx = rect.left + rect.width / 2;
                                const flowerCy = rect.top + rect.height / 2;
                                const paneCx = paneRect.left + paneRect.width / 2;
                                const paneCy = paneRect.top + paneRect.height / 2;

                                const dx = paneCx - flowerCx;
                                const dy = paneCy - flowerCy;
                                setStage("zoom");
                                setIsBreathing(false);
                                setCamera({
                                  x: reducedMotion ? 0 : dx,
                                  y: reducedMotion ? 0 : dy,
                                  scale: reducedMotion ? 1.08 : 2.05,
                                });
                                setBurstKey((k) => k + 1);

                                window.setTimeout(
                                  () => {
                                    setStage("card");
                                    setCamera({ x: 0, y: 0, scale: 1 });
                                  },
                                  reducedMotion ? 0 : 820
                                );
                              }}
                            />
                          );
                        })}

                        <motion.div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0"
                          initial={false}
                          animate={{ opacity: hoveredId ? 1 : 0 }}
                          transition={{ duration: 0.35 }}
                        >
                          <div className="absolute left-[14%] top-[16%] h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(185,106,106,0.10),transparent_70%)] blur-2xl" />
                          <div className="absolute right-[10%] bottom-[12%] h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(162,168,107,0.10),transparent_70%)] blur-2xl" />
                        </motion.div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    initial={false}
                    animate={{ opacity: stage === "zoom" ? 1 : 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(900px_560px_at_45%_40%,rgba(26,26,24,0.16),transparent_70%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(26,26,24,0.06))]" />
                  </motion.div>

                  <AnimatePresence>
                    {stage === "card" && active ? (
                      <motion.div
                        key="card"
                        className="absolute inset-0 grid place-items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                      >
                        <motion.div
                          className="absolute inset-0"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(900px_560px_at_45%_40%,rgba(26,26,24,0.08),transparent_68%)]" />
                        </motion.div>

                        <PressedFlowerCard
                          flower={active}
                          onCta={() => {
                            // Placeholder hook: route to builder page when it exists.
                            setStage("garden");
                            setActive(null);
                            setIsBreathing(true);
                            setCamera({ x: 0, y: 0, scale: 1 });
                          }}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-6 left-6 right-6"
                    initial={false}
                    animate={{ opacity: stage === "garden" ? 1 : 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[color:var(--line)] bg-[color:var(--card)]/55 px-4 py-3 backdrop-blur-sm">
                      <p className="text-xs text-[color:var(--muted)]">
                        <span className="font-semibold tracking-[0.18em]">
                          WIND
                        </span>{" "}
                        <span className="ml-2">
                          <ParticleText
                            text="petals drift, meanings gather, paper remembers."
                            mode="scatter"
                          />
                        </span>
                      </p>
                      <p className="text-[11px] font-semibold tracking-[0.22em] text-[color:var(--muted)]">
                        HOVER • CLICK • PRESS
                      </p>
                    </div>
                  </motion.div>
                  </motion.div>
                  </motion.div>
                </motion.div>
              </LayoutGroup>
            </div>
          </div>
        </Container>
      </div>
          </section>
        </motion.div>
      </div>
    </section>
  );
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

