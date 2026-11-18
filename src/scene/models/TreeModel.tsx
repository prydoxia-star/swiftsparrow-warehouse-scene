import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { ModelBox } from "./primitives";
import type { WorldPoint } from "../warehouse-scene-data";

const canopyTones = ["#aab5a9", "#9eaa9e", "#b6bfb3"];

/** Low-poly tree with a gently wind-swaying crown. Purely visual; placement is supplied by the scene. */
export function TreeModel({ position, variant = 0 }: { position: WorldPoint; variant?: number }) {
  const crownRef = useRef<Group>(null);
  const tone = canopyTones[variant % canopyTones.length];
  const crownScale = variant % 2 === 0 ? 1 : 0.92;

  useFrame(({ clock }) => {
    if (!crownRef.current) return;
    const breeze = clock.elapsedTime * 0.42 + variant * 1.3;
    crownRef.current.rotation.z = Math.sin(breeze) * 0.035;
    crownRef.current.rotation.x = Math.cos(breeze * 0.8) * 0.022;
  });

  return (
    <group position={position}>
      <ModelBox position={[0, 1.0, 0]} size={[0.36, 2.0, 0.36]} color="#8d9690" />
      <ModelBox position={[0.34, 1.48, 0.02]} size={[0.12, 0.95, 0.12]} color="#969f98" rotation={[0, 0, -0.38]} />
      <group ref={crownRef} position={[0, 2.15, 0]} scale={crownScale}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <coneGeometry args={[1.18, 2.15, 6]} />
          <meshStandardMaterial color={tone} roughness={1} flatShading />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow>
          <coneGeometry args={[0.82, 1.72, 6]} />
          <meshStandardMaterial color="#bdc6ba" roughness={1} flatShading />
        </mesh>
        <mesh position={[-0.58, 0.25, 0.18]} rotation={[0.08, 0.7, 0.16]} castShadow>
          <icosahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color="#a0aca0" roughness={1} flatShading />
        </mesh>
        <mesh position={[0.55, 0.42, -0.12]} rotation={[-0.08, -0.5, -0.1]} castShadow>
          <icosahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#b7c0b4" roughness={1} flatShading />
        </mesh>
      </group>
    </group>
  );
}
