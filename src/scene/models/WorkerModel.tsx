import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { ModelBox } from "./primitives";

interface WorkerAppearance {
  jacket: string;
  vest: string;
  trousers: string;
  helmet: string;
  skin: string;
  boots: string;
  height: number;
}

// Stable seeded appearances: the same worker keeps the same outfit between renders,
// while different workers have visibly different clothing, PPE and proportions.
const appearances: WorkerAppearance[] = [
  { jacket: "#626d73", vest: "#d2b66d", trousers: "#555e64", helmet: "#e0c56f", skin: "#b98568", boots: "#41484d", height: 1.00 },
  { jacket: "#78858a", vest: "#c9d0c9", trousers: "#697176", helmet: "#d9dedf", skin: "#8b6049", boots: "#4d555a", height: 0.96 },
  { jacket: "#66766d", vest: "#c7b68d", trousers: "#525a56", helmet: "#c4c9a4", skin: "#d0a17d", boots: "#454b47", height: 1.04 },
  { jacket: "#8a7770", vest: "#d9d2c1", trousers: "#626a70", helmet: "#d8d0c2", skin: "#9f6d54", boots: "#4e4a48", height: 0.98 },
  { jacket: "#65717f", vest: "#d0c07e", trousers: "#515965", helmet: "#d4d7da", skin: "#c28e6f", boots: "#454b53", height: 1.06 },
  { jacket: "#7c806d", vest: "#c8d0b9", trousers: "#62685d", helmet: "#e0c57a", skin: "#75513f", boots: "#464b42", height: 0.93 },
];

// Shuffle once when the scene module loads. The assignment stays stable during animation,
// gives workers distinct outfits within a shift, and changes naturally on a fresh session.
const randomizedAppearanceOrder = [...appearances];
for (let index = randomizedAppearanceOrder.length - 1; index > 0; index -= 1) {
  const swapIndex = Math.floor(Math.random() * (index + 1));
  [randomizedAppearanceOrder[index], randomizedAppearanceOrder[swapIndex]] = [
    randomizedAppearanceOrder[swapIndex],
    randomizedAppearanceOrder[index],
  ];
}

/** Animated low-poly warehouse worker. Route and identity are supplied by the scene. */
export function WorkerModel({ variant = 0 }: { variant?: number }) {
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const appearance = randomizedAppearanceOrder[((variant % randomizedAppearanceOrder.length) + randomizedAppearanceOrder.length) % randomizedAppearanceOrder.length];

  useFrame(({ clock }) => {
    const phase = clock.elapsedTime * 5.2 + variant * 1.7;
    const swing = Math.sin(phase) * 0.42;
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    if (leftArm.current) leftArm.current.rotation.x = -swing * 0.72;
    if (rightArm.current) rightArm.current.rotation.x = swing * 0.72;
    if (torso.current) torso.current.position.y = 0.98 + Math.abs(Math.sin(phase * 2)) * 0.035;
  });

  return (
    <group scale={[1, appearance.height, 1]}>
      <group ref={torso} position={[0, 0.98, 0]}>
        <ModelBox position={[0, 0, 0]} size={[0.52, 0.64, 0.3]} color={appearance.jacket} />
        <ModelBox position={[0, 0.02, 0.165]} size={[0.36, 0.48, 0.035]} color={appearance.vest} />
        <ModelBox position={[0, -0.11, 0.19]} size={[0.39, 0.055, 0.045]} color="#8c969b" />
        <ModelBox position={[-0.19, -0.16, 0.18]} size={[0.045, 0.36, 0.04]} color="#e0e0d8" />
        <ModelBox position={[0.19, -0.16, 0.18]} size={[0.045, 0.36, 0.04]} color="#e0e0d8" />
      </group>

      {/* Individual skin tone and hard-hat colour make workers distinct at a glance. */}
      <mesh position={[0, 1.48, 0]} castShadow>
        <icosahedronGeometry args={[0.19, 0]} />
        <meshStandardMaterial color={appearance.skin} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.2, 0.09, 6]} />
        <meshStandardMaterial color={appearance.helmet} roughness={0.9} flatShading />
      </mesh>
      <ModelBox position={[0, 1.59, 0.035]} size={[0.43, 0.045, 0.34]} color={appearance.helmet} />

      {/* Arms pivot at the shoulders. */}
      <group ref={leftArm} position={[-0.33, 1.22, 0]}>
        <ModelBox position={[0, -0.2, 0]} size={[0.16, 0.47, 0.17]} color={appearance.jacket} rotation={[0.12, 0, -0.12]} />
        <mesh position={[0, -0.46, 0.015]} castShadow>
          <icosahedronGeometry args={[0.085, 0]} />
          <meshStandardMaterial color={appearance.skin} flatShading />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.33, 1.22, 0]}>
        <ModelBox position={[0, -0.2, 0]} size={[0.16, 0.47, 0.17]} color={appearance.jacket} rotation={[-0.12, 0, 0.12]} />
        <mesh position={[0, -0.46, 0.015]} castShadow>
          <icosahedronGeometry args={[0.085, 0]} />
          <meshStandardMaterial color={appearance.skin} flatShading />
        </mesh>
      </group>

      {/* Legs, trousers and boots. */}
      <group ref={leftLeg} position={[-0.14, 0.65, 0]}>
        <ModelBox position={[0, -0.25, 0]} size={[0.19, 0.5, 0.2]} color={appearance.trousers} />
        <ModelBox position={[0, -0.51, 0.09]} size={[0.23, 0.12, 0.38]} color={appearance.boots} />
      </group>
      <group ref={rightLeg} position={[0.14, 0.65, 0]}>
        <ModelBox position={[0, -0.25, 0]} size={[0.19, 0.5, 0.2]} color={appearance.trousers} />
        <ModelBox position={[0, -0.51, 0.09]} size={[0.23, 0.12, 0.38]} color={appearance.boots} />
      </group>
    </group>
  );
}
