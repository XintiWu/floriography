"use client";



export function PaperBackground() {
  return (
    <mesh position={[0, 0, -2]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial 
        color="#fbfaf7" 
        roughness={1}
        metalness={0.1}
      />
    </mesh>
  );
}
