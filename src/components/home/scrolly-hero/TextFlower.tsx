"use client";

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { MotionValue } from "framer-motion";

const WORDS = [
  "love", "memory", "tenderness", "courage", 
  "longing", "healing", "blessing", "silence",
  "whisper", "breath", "bloom", "fade",
  "eternity", "grace", "fragile", "dream"
];

export function TextFlower({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const numParticles = 80;
  
  const [particles] = useState(() => {
    const items = [];
    const c = 0.25; // scale factor for spiral
    for (let i = 0; i < numParticles; i++) {
      // Flower target position (Phyllotaxis spiral)
      const theta = i * 2.39996;
      const r = c * Math.sqrt(i);
      
      // Make it slightly bowl-shaped
      const targetZ = r * 0.5; 
      
      const targetPos = new THREE.Vector3(
        Math.cos(theta) * r,
        Math.sin(theta) * r,
        -targetZ
      );
      
      // Calculate rotation so text aligns along the spiral curve
      const targetRot = new THREE.Euler(
        0, 
        0, 
        theta + Math.PI / 2
      );

      // Random starting positions (Scattered around)
      const startPos = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10 + 2
      );
      
      const startRot = new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      items.push({
        word: WORDS[i % WORDS.length],
        targetPos,
        targetRot,
        startPos,
        startRot,
        speed: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 0.3,
      });
    }
    return items;
  });

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();
    const pScroll = scrollProgress.get();
    
    let groupScale = 1;
    let groupZ = 0;
    
    // Stage 3 pulse
    if (pScroll > 0.4 && pScroll <= 0.6) {
      groupScale = 1 + Math.sin((pScroll - 0.4) * Math.PI / 0.2) * 0.2; 
    } else if (pScroll > 0.6) {
      groupScale = 1.2;
      const flatten = Math.min((pScroll - 0.6) / 0.2, 1);
      groupZ = THREE.MathUtils.lerp(0, -1.9, flatten);
    }
    
    groupRef.current.position.z = groupZ;
    groupRef.current.scale.setScalar(groupScale);
    
    // Slow rotation of the entire flower
    groupRef.current.rotation.z = time * 0.05;

    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      const mesh = child as THREE.Mesh;
      
      let progressToFlower = 0;
      let flattenProgress = 0;

      if (pScroll > 0.15 && pScroll <= 0.4) {
        // Easing with delay for organic assembly
        const adjustedP = Math.max(0, (pScroll - 0.15) / 0.25 - p.delay);
        progressToFlower = Math.min(adjustedP * 1.5, 1); 
      } else if (pScroll > 0.4) {
        progressToFlower = 1;
      }
      
      if (pScroll > 0.6) {
        flattenProgress = Math.min((pScroll - 0.6) / 0.2, 1);
      }
      
      // Position
      const currentPos = new THREE.Vector3().copy(p.startPos).lerp(p.targetPos, progressToFlower);
      
      // Floating motion when scattered
      if (progressToFlower < 1) {
        currentPos.y += Math.sin(time * p.speed + i) * 0.5 * (1 - progressToFlower);
        currentPos.x += Math.cos(time * p.speed + i) * 0.5 * (1 - progressToFlower);
      }
      
      // Apply flatten
      if (flattenProgress > 0) {
        currentPos.z = THREE.MathUtils.lerp(currentPos.z, 0, flattenProgress);
      }
      
      child.position.copy(currentPos);
      
      // Rotation
      const currentRotX = THREE.MathUtils.lerp(
        p.startRot.x, 
        0, 
        progressToFlower
      );
      const currentRotY = THREE.MathUtils.lerp(
        p.startRot.y, 
        0, 
        progressToFlower
      );
      const currentRotZ = THREE.MathUtils.lerp(
        p.startRot.z, 
        p.targetRot.z, 
        progressToFlower
      );
      
      child.rotation.set(currentRotX, currentRotY, currentRotZ);
      
      // Material (Opacity & Color)
      if (mesh.material && !Array.isArray(mesh.material)) {
        let opacity = 0;
        if (pScroll > 0.05 && progressToFlower < 1) {
           opacity = THREE.MathUtils.lerp(0, 0.4, (pScroll - 0.05) / 0.1);
        } else if (progressToFlower === 1) {
           opacity = THREE.MathUtils.lerp(0.4, 0.9, (pScroll - 0.4) / 0.2);
        }
        
        if (flattenProgress > 0) {
           opacity = THREE.MathUtils.lerp(0.9, 0.95, flattenProgress);
        }
        
        mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity, opacity, 0.1);
        
        // Color lerping
        const c1 = new THREE.Color("#e8a5a5"); // glowing pink
        const c2 = new THREE.Color("#6d6a63"); // pressed ink
        const targetColor = new THREE.Color().lerpColors(c1, c2, flattenProgress);
        (mesh.material as THREE.Material & { color: THREE.Color }).color.lerp(targetColor, 0.1);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <Text
          key={i}
          color="#e8a5a5"
          fontSize={0.15 + (1 - i / numParticles) * 0.15} // center words are larger
          maxWidth={2}
          lineHeight={1}
          letterSpacing={0.05}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0}
        >
          {p.word}
        </Text>
      ))}
    </group>
  );
}
