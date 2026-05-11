"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MotionValue } from "framer-motion";

export function FloatingPetals({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const count = 30;

  const [petals] = useState(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.2, 0.2, 0, 0.8);
    shape.quadraticCurveTo(-0.2, 0.2, 0, 0);
    const geometry = new THREE.ShapeGeometry(shape);
    
    return Array.from({ length: count }).map(() => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 5
      ),
      rotation: new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ),
      scale: 0.5 + Math.random() * 0.5,
      speed: 0.1 + Math.random() * 0.2,
      geometry
    }));
  });

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();
    const pScroll = scrollProgress.get();
    
    groupRef.current.children.forEach((child, i) => {
      const petal = petals[i];
      child.position.y = petal.position.y + Math.sin(time * petal.speed) * 0.5;
      child.rotation.x = petal.rotation.x + time * petal.speed * 0.5;
      child.rotation.y = petal.rotation.y + time * petal.speed * 0.3;
      
      // Stage 4+5 (flattening)
      if (pScroll > 0.6) {
        const flatten = Math.min((pScroll - 0.6) / 0.2, 1);
        child.position.z = THREE.MathUtils.lerp(child.position.z, -1.9, flatten * 0.1); // press to paper
        child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, 0, flatten * 0.1);
        child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, 0, flatten * 0.1);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {petals.map((petal, i) => (
        <mesh 
          key={i} 
          position={petal.position} 
          rotation={petal.rotation} 
          scale={petal.scale}
          geometry={petal.geometry}
          castShadow
        >
          <meshStandardMaterial 
            color="#d48787" 
            transparent 
            opacity={0.6}
            roughness={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
