"use client";

import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const MAX_PARTICLES = 40;
const MIN_DISTANCE = 0.3;
const PARTICLE_LIFETIME = 2.5;

export function FlowerMouseTrail() {
  const { camera } = useThree();
  
  // Load botanical textures
  const textures = useTexture([
    "/images/botanical/botanical_1_1777573303466.png",
    "/images/botanical/botanical_2_1777573317449.png",
    "/images/botanical/botanical_3_1777573330011.png"
  ]);

  useMemo(() => {
    textures.forEach(t => {
      t.colorSpace = THREE.SRGBColorSpace;
    });
  }, [textures]);

  const groupRef = useRef<THREE.Group>(null);
  
  const particles = useRef(
    Array.from({ length: MAX_PARTICLES }).map(() => ({
      active: false,
      position: new THREE.Vector3(),
      startPosition: new THREE.Vector3(),
      rotation: 0,
      scale: 1,
      textureIndex: 0,
      birthTime: 0,
    }))
  );
  
  const particleIndex = useRef(0);
  const lastSpawnPos = useRef(new THREE.Vector3(999, 999, 999));
  const pointerInitialized = useRef(false);

  useFrame(({ pointer, clock }) => {
    if (!groupRef.current) return;
    const time = clock.getElapsedTime();
    
    // Calculate world position from mouse pointer at a fixed distance in front of the camera
    const vec = new THREE.Vector3(pointer.x, pointer.y, 0.5);
    vec.unproject(camera);
    vec.sub(camera.position).normalize();
    const distance = 4 / Math.abs(vec.z || 0.001); // 4 units in front of camera
    const spawnPos = camera.position.clone().add(vec.multiplyScalar(distance));
    
    // Don't spawn until the mouse has actually moved
    if (!pointerInitialized.current) {
      if (pointer.x !== 0 || pointer.y !== 0) {
        pointerInitialized.current = true;
        lastSpawnPos.current.copy(spawnPos);
      }
    } else {
      if (spawnPos.distanceTo(lastSpawnPos.current) > MIN_DISTANCE) {
        lastSpawnPos.current.copy(spawnPos);
        
        const p = particles.current[particleIndex.current];
        p.active = true;
        p.startPosition.copy(spawnPos);
        p.position.copy(spawnPos);
        p.rotation = Math.random() * Math.PI * 2;
        p.scale = 0.25 + Math.random() * 0.35; // delicate small flowers
        p.textureIndex = Math.floor(Math.random() * textures.length);
        p.birthTime = time;
        
        const mesh = groupRef.current.children[particleIndex.current] as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.map = textures[p.textureIndex];
        mesh.visible = true;
        
        particleIndex.current = (particleIndex.current + 1) % MAX_PARTICLES;
      }
    }
    
    // Update all active particles
    particles.current.forEach((p, i) => {
      if (!p.active) return;
      
      const age = time - p.birthTime;
      const mesh = groupRef.current!.children[i] as THREE.Mesh;
      const mat = mesh.material as THREE.ShaderMaterial;
      
      if (age > PARTICLE_LIFETIME) {
        p.active = false;
        mesh.visible = false;
        return;
      }
      
      const progress = age / PARTICLE_LIFETIME;
      
      // Float gently upwards and drift sideways
      p.position.y = p.startPosition.y + progress * 1.5;
      p.position.x = p.startPosition.x + Math.sin(progress * Math.PI * 2) * 0.3;
      
      mesh.position.copy(p.position);
      mesh.rotation.z = p.rotation + progress * 1.5; // slow spin
      
      // Shrink towards the end of lifetime
      const currentScale = p.scale * (1 - progress * 0.4);
      mesh.scale.set(currentScale, currentScale, currentScale);
      
      // Fade out (smooth easing)
      mat.uniforms.map.value = textures[p.textureIndex];
      mat.uniforms.opacity.value = 0.85 * (1 - Math.pow(progress, 2));
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: MAX_PARTICLES }).map((_, i) => (
        <mesh key={i} visible={false}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            transparent={true}
            depthWrite={false}
            uniforms={{
              map: { value: null },
              opacity: { value: 0 }
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
