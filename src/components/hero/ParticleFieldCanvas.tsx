"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MotionValue } from "framer-motion";

type Vec2 = { x: number; y: number };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ParticleFieldCanvas({
  density = 1,
  mouseX,
  mouseY,
  hoverTarget,
  mode,
  burstKey,
}: {
  density?: number;
  mouseX: MotionValue<number>; // -0.5..0.5
  mouseY: MotionValue<number>; // -0.5..0.5
  hoverTarget: Vec2 | null; // px in canvas space
  mode: "garden" | "meaning" | "press" | "card";
  burstKey: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<{
    w: number;
    h: number;
    dpr: number;
    t: number;
    burstT: number;
    parts: Float32Array;
    vels: Float32Array;
    base: Float32Array;
    count: number;
  } | null>(null);

  const seed = useMemo(() => 114_514_1919, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rnd = mulberry32(seed);

    const init = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const baseCount = Math.floor((w * h) / 9500);
      const count = clamp(Math.floor(baseCount * density), 90, 320);
      const parts = new Float32Array(count * 2);
      const vels = new Float32Array(count * 2);
      const base = new Float32Array(count * 2);

      for (let i = 0; i < count; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        parts[i * 2] = x;
        parts[i * 2 + 1] = y;
        base[i * 2] = x;
        base[i * 2 + 1] = y;
        vels[i * 2] = (rnd() - 0.5) * 0.8;
        vels[i * 2 + 1] = (rnd() - 0.5) * 0.8;
      }

      stateRef.current = {
        w,
        h,
        dpr,
        t: 0,
        burstT: 999,
        parts,
        vels,
        base,
        count,
      };
    };

    init();
    const ro = new ResizeObserver(() => init());
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const st = stateRef.current;
      if (!st) return;
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      st.t += dt;
      st.burstT += dt;

      const { w, h, parts, vels, base, count } = st;
      const mx = (mouseX.get() + 0.5) * w;
      const my = (mouseY.get() + 0.5) * h;

      // Subtle flow-field-esque drift (cheap sinusoidal curl).
      const flow = (x: number, y: number, t: number) => {
        const s = 0.0009;
        const a = Math.sin((x + t * 90) * s) + Math.cos((y - t * 70) * s);
        const b = Math.cos((x - t * 110) * s) - Math.sin((y + t * 60) * s);
        return { x: a, y: b };
      };

      ctx.clearRect(0, 0, w, h);

      const ink = "rgba(26,26,24,0.18)";
      const soft = "rgba(26,26,24,0.10)";

      const follow = mode === "garden" ? 0.035 : mode === "meaning" ? 0.02 : 0.01;
      const springHome = mode === "garden" ? 0.006 : 0.002;
      const hoverPull = hoverTarget ? (mode === "garden" ? 0.018 : 0.01) : 0;
      const pressPull = mode === "press" ? 0.028 : mode === "card" ? 0.016 : 0;
      const burst = st.burstT < 0.8 ? 1 : 0;

      const pressTarget = { x: w * 0.52, y: h * 0.56 };
      const ht = hoverTarget;

      for (let i = 0; i < count; i++) {
        const idx = i * 2;
        let x = parts[idx]!;
        let y = parts[idx + 1]!;
        let vx = vels[idx]!;
        let vy = vels[idx + 1]!;

        const f = flow(x, y, st.t);
        vx += f.x * 0.06;
        vy += f.y * 0.06;

        // Mouse follow (gentle wind).
        vx += (mx - x) * follow * 0.0035;
        vy += (my - y) * follow * 0.0035;

        // Hover attraction/grouping.
        if (ht) {
          vx += (ht.x - x) * hoverPull * 0.0028;
          vy += (ht.y - y) * hoverPull * 0.0028;
        }

        // Press/card gathering.
        if (pressPull > 0) {
          vx += (pressTarget.x - x) * pressPull * 0.004;
          vy += (pressTarget.y - y) * pressPull * 0.004;
        }

        // Return-to-base stabilizer.
        vx += (base[idx]! - x) * springHome * 0.01;
        vy += (base[idx + 1]! - y) * springHome * 0.01;

        // Burst dispersion.
        if (burst) {
          const k = (0.8 - st.burstT) / 0.8;
          vx += (Math.sin(i * 12.7 + st.t * 7) * 22 + (i % 7) * 2) * k * dt;
          vy += (Math.cos(i * 9.3 + st.t * 9) * 18 - (i % 5) * 2) * k * dt;
        }

        // Damping + integrate.
        const damp = mode === "garden" ? 0.92 : 0.90;
        vx *= Math.pow(damp, dt * 60);
        vy *= Math.pow(damp, dt * 60);
        x += vx * (dt * 60);
        y += vy * (dt * 60);

        // Bounds.
        if (x < -20) x = w + 20;
        if (x > w + 20) x = -20;
        if (y < -20) y = h + 20;
        if (y > h + 20) y = -20;

        parts[idx] = x;
        parts[idx + 1] = y;
        vels[idx] = vx;
        vels[idx + 1] = vy;

        const r = 0.9 + ((i % 9) / 9) * 0.75;
        ctx.beginPath();
        ctx.fillStyle = i % 3 === 0 ? ink : soft;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [seed, density, mouseX, mouseY, hoverTarget, mode]);

  useEffect(() => {
    const st = stateRef.current;
    if (!st) return;
    st.burstT = 0;
  }, [burstKey]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

