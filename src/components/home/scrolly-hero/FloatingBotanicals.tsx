"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { MotionValue } from "framer-motion";

export function FloatingBotanicals({ scrollProgress }: { scrollProgress: MotionValue<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  
  const textures = useTexture([
    "/images/botanical/botanical_1_1777573303466.png",
    "/images/botanical/botanical_2_1777573317449.png",
    "/images/botanical/botanical_3_1777573330011.png"
  ]);

  textures.forEach(t => {
    t.colorSpace = THREE.SRGBColorSpace;
  });

  // Premium design: deep Z-depth, elegant drifting, and subtle rotations
  const botanicalData = [
    {
      texture: textures[0], // Rose
      startPos: new THREE.Vector3(-4.5, -3.5, -4), // Closer and slightly visible at bottom left
      endPos: new THREE.Vector3(3.5, 2.5, 2), // Frames the top right
      scale: 4,
      wobbleSpeed: 0.8,
      wobbleAmount: 0.4,
      rotSpeed: 0.02,
      opacity: 0.8,
      startRot: Math.PI / 6 // 30 degrees, pointing slightly inwards
    },
    {
      texture: textures[1], // Ferns
      startPos: new THREE.Vector3(5.5, -2, -2), // Closer and slightly visible at right
      endPos: new THREE.Vector3(-3.5, -2, 1), // Frames the bottom left
      scale: 5,
      wobbleSpeed: 0.5,
      wobbleAmount: 0.3,
      rotSpeed: -0.015,
      opacity: 0.7,
      startRot: -Math.PI / 4 // -45 degrees, angling the fern nicely instead of showing a straight cut edge
    },
    {
      texture: textures[2], // Peony Petals
      startPos: new THREE.Vector3(-3.5, 4.5, -6), // Visible at top left
      endPos: new THREE.Vector3(-1.5, 2.2, 3), // Brought significantly lower so it remains perfectly visible at the end
      scale: 3.5,
      wobbleSpeed: 1.1,
      wobbleAmount: 0.5,
      rotSpeed: 0.03,
      opacity: 0.85,
      startRot: Math.PI / 3 // 60 degrees, pointing inwards
    }
  ];

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    
    const time = clock.getElapsedTime();
    const pScroll = scrollProgress.get(); 

    // Add a very subtle global rotation to the entire group
    groupRef.current.rotation.y = Math.sin(time * 0.1) * 0.1;
    groupRef.current.rotation.x = Math.cos(time * 0.1) * 0.05;

    groupRef.current.children.forEach((child, i) => {
      const data = botanicalData[i];
      
      // Ensure the cinematic framing finishes VERY EARLY (0.6)
      const normalizedP = Math.min(Math.max(pScroll / 0.6, 0), 1);
      
      // Easing curve for a smoother premium feel (ease-in-out)
      const easeP = normalizedP < 0.5 
        ? 2 * normalizedP * normalizedP 
        : 1 - Math.pow(-2 * normalizedP + 2, 2) / 2;
      
      // Interpolate position based on normalized scroll
      const targetPos = new THREE.Vector3().copy(data.startPos).lerp(data.endPos, easeP);
      
      // Add continuous organic floating (breathing)
      targetPos.y += Math.sin(time * data.wobbleSpeed) * data.wobbleAmount;
      targetPos.x += Math.cos(time * data.wobbleSpeed * 0.7) * data.wobbleAmount;
      
      // Deep parallax based on mouse
      targetPos.x += pointer.x * (i + 1) * 0.4;
      targetPos.y += pointer.y * (i + 1) * 0.4;

      child.position.lerp(targetPos, 0.05);

      // Elegant 3D rotations
      // Cards slowly spin in Z, and tilt in X/Y to look like floating paper
      child.rotation.z = data.startRot + time * data.rotSpeed + (easeP * Math.PI * 0.15);
      
      const tiltX = Math.sin(time * 0.5 + i) * 0.15;
      const tiltY = Math.cos(time * 0.6 + i) * 0.15;
      
      child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, tiltX - (pointer.y * 0.1), 0.05);
      child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, tiltY + (pointer.x * 0.1), 0.05);
    });
  });

  return (
    <group ref={groupRef}>
      {botanicalData.map((data, i) => (
        <mesh key={i} scale={data.scale}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            transparent={true}
            depthWrite={false}
            uniforms={{
              map: { value: data.texture },
              opacity: { value: data.opacity }
            }}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform sampler2D map;
              uniform float opacity;
              varying vec2 vUv;
              void main() {
                vec4 texColor = texture2D(map, vUv);
                
                // Calculate brightness (how close to white)
                float brightness = min(min(texColor.r, texColor.g), texColor.b);
                
                // Smoothly fade out pixels that are close to pure white
                float alpha = 1.0 - smoothstep(0.85, 0.98, brightness);
                
                gl_FragColor = vec4(texColor.rgb, alpha * opacity);
              }
            `}
          />
        </mesh>
      ))}
    </group>
  );
}
