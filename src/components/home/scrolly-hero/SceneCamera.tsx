"use client";

import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { MotionValue } from "framer-motion";

export function SceneCamera({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame((state) => {
    if (!cameraRef.current) return;
    
    const pScroll = scrollProgress.get();
    
    // Stage 1 (0-0.2): Descend from top
    // Stage 2 (0.2-0.4): Move close to flower
    // Stage 3 (0.4-0.6): Zoom into flower
    // Stage 4 (0.6-0.8): Pull out to top-down view
    // Stage 5 (0.8-1.0): Static top-down view

    const targetPosition = new THREE.Vector3(0, 0, 10);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    if (pScroll < 0.2) {
      const p = pScroll / 0.2;
      targetPosition.set(0, 0, 10 - p * 4); // Move from Z=10 to Z=6
    } else if (pScroll < 0.4) {
      const p = (pScroll - 0.2) / 0.2;
      targetPosition.set(0, -p * 2, 6 - p * 3); // Move to Z=3, Y=-2
      targetLookAt.set(0, p * 1, 0);
    } else if (pScroll < 0.6) {
      const p = (pScroll - 0.4) / 0.2;
      targetPosition.set(0, -2 + p * 2, 3 - p * 1.5); // Move to Z=1.5, Y=0 (into flower)
    } else if (pScroll < 0.8) {
      const p = (pScroll - 0.6) / 0.2;
      targetPosition.set(0, p * 2, 1.5 + p * 6.5); // Back to Z=8
      targetLookAt.set(0, 0, 0);
    } else {
      targetPosition.set(0, 2, 8);
    }

    const pointerX = state.pointer.x * 0.5;
    const pointerY = state.pointer.y * 0.5;
    
    cameraRef.current.position.lerp(
      new THREE.Vector3(
        targetPosition.x + pointerX,
        targetPosition.y + pointerY,
        targetPosition.z
      ),
      0.05
    );
    
    cameraRef.current.lookAt(targetLookAt);
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 10]} fov={45} />;
}
