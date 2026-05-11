"use client";
import React from "react";

import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { MotionValue } from "framer-motion";
import { PaperBackground } from "./PaperBackground";
import { FloatingBotanicals } from "./FloatingBotanicals";
import { SceneCamera } from "./SceneCamera";
import { FlowerMouseTrail } from "./FlowerMouseTrail";

export function WebGLScene({ 
  scrollProgress,
  eventSourceRef
}: { 
  scrollProgress: MotionValue<number>,
  eventSourceRef: React.RefObject<HTMLElement | null>
}) {
  return (
    <Canvas
      shadows={false}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      eventSource={eventSourceRef as React.RefObject<HTMLElement>}
      eventPrefix="client"
      style={{ pointerEvents: 'none', touchAction: 'auto', position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh' }}
    >
      <SceneCamera scrollProgress={scrollProgress} />

      {/* Ambient dust to give texture and depth */}
      <Sparkles count={250} scale={20} size={1.5} speed={0.2} opacity={0.15} color="#b4a395" />

      <PaperBackground />
      
      <React.Suspense fallback={null}>
        <FlowerMouseTrail />
        <FloatingBotanicals scrollProgress={scrollProgress} />
      </React.Suspense>
    </Canvas>
  );
}
