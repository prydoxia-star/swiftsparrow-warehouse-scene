import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { ModelBox } from "./models/primitives";
import type { WorldPoint } from "./warehouse-scene-data";

const beds: Array<{ center: WorldPoint; size: [number, number]; count: number }> = [
  { center: [-20.8, 0.04, -14.1], size: [5.2, 1.55], count: 14 },
  { center: [20.5, 0.04, -14.0], size: [6.0, 1.65], count: 16 },
  { center: [-22.4, 0.04, 5.8], size: [1.55, 3.8], count: 10 },
  { center: [21.5, 0.04, 7.0], size: [1.55, 3.4], count: 10 },
  // New rear beds soften the edge of the warehouse without narrowing the service lanes.
  { center: [-13.7, 0.04, -12.7], size: [3.5, 1.45], count: 10 },
  { center: [13.7, 0.04, -12.7], size: [3.5, 1.45], count: 10 },
  // Front corner planting stays clear of the truck bay and worker footpaths.
  { center: [-16.6, 0.04, 11.5], size: [4.2, 1.5], count: 12 },
  { center: [15.0, 0.04, 11.5], size: [3.8, 1.5], count: 12 },
];

function GrassTuft({ position, seed }: { position: WorldPoint; seed: number }) {
  const swayRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!swayRef.current) return;
    const time = clock.elapsedTime * 1.15 + seed * 0.9;
    swayRef.current.rotation.z = Math.sin(time) * 0.085;
    swayRef.current.rotation.x = Math.cos(time * 0.8) * 0.045;
  });

  return (
    <group position={position}>
      <group ref={swayRef}>
        {[-0.15, 0, 0.15].map((x, index) => (
          <mesh key={index} position={[x, 0.24 + (index % 2) * 0.035, 0]} rotation={[0, index * 1.6, (index - 1) * -0.24]} castShadow>
            <coneGeometry args={[0.105, 0.58 + (index % 2) * 0.12, 4]} />
            <meshStandardMaterial color={index % 2 ? "#a7b0a7" : "#b5bdb3"} roughness={1} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Shrub({ position, size = 1 }: { position: WorldPoint; size?: number }) {
  return (
    <group position={position} scale={size}>
      <mesh position={[-0.25, 0.28, 0]} castShadow>
        <icosahedronGeometry args={[0.48, 0]} />
        <meshStandardMaterial color="#9ca79d" roughness={1} flatShading />
      </mesh>
      <mesh position={[0.22, 0.32, -0.12]} castShadow>
        <icosahedronGeometry args={[0.43, 0]} />
        <meshStandardMaterial color="#aab3a9" roughness={1} flatShading />
      </mesh>
      <mesh position={[0.02, 0.52, 0.18]} castShadow>
        <icosahedronGeometry args={[0.36, 0]} />
        <meshStandardMaterial color="#b6beb5" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

function Bloom({ position, variant }: { position: WorldPoint; variant: number }) {
  const petalTone = variant % 2 === 0 ? "#d4d0c0" : "#c5cbbd";
  return (
    <group position={position}>
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.46, 5]} />
        <meshStandardMaterial color="#89968b" flatShading />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.105, 0.49, Math.sin(angle) * 0.105]} scale={[0.095, 0.12, 0.075]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={petalTone} roughness={1} flatShading />
          </mesh>
        );
      })}
      <mesh position={[0, 0.49, 0]}>
        <icosahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial color="#9d9279" roughness={1} flatShading />
      </mesh>
    </group>
  );
}

function Stone({ position, scale = 1 }: { position: WorldPoint; scale?: number }) {
  return (
    <mesh position={position} scale={[scale * 0.34, scale * 0.2, scale * 0.28]} castShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#b9beb9" roughness={1} flatShading />
    </mesh>
  );
}

function LandscapeBed({ center, size, count }: (typeof beds)[number]) {
  return (
    <group position={center}>
      <mesh position={[0, 0, 0]} scale={[size[0] / 2, 0.075, size[1] / 2]} receiveShadow>
        <sphereGeometry args={[1, 8, 4]} />
        <meshStandardMaterial color="#aab3aa" roughness={1} flatShading />
      </mesh>
      {Array.from({ length: count }, (_, index) => {
        const across = (index % 4) / 3 - 0.5;
        const along = Math.floor(index / 4) / Math.max(1, Math.ceil(count / 4) - 1) - 0.5;
        const x = across * size[0] * 0.78;
        const z = along * size[1] * 0.76;
        return (
          <group key={`greenery-${index}`}>
            {index % 7 === 0 ? (
              <Bloom position={[x, 0.08, z]} variant={index + count} />
            ) : index % 3 === 0 ? (
              <Shrub position={[x, 0.08, z]} size={0.62 + (index % 2) * 0.15} />
            ) : (
              <GrassTuft position={[x, 0.08, z]} seed={index + count} />
            )}
          </group>
        );
      })}
      {[-0.38, 0.38].map((offset, index) => (
        <Stone key={`stone-${index}`} position={[offset * size[0], 0.12, index === 0 ? -size[1] * 0.28 : size[1] * 0.28]} scale={0.72 + index * 0.14} />
      ))}
    </group>
  );
}

/** Planted edges, swaying grass, small flowers and shrubs give the industrial site more life. */
export function LivingYard() {
  return (
    <group>
      {beds.map((bed, index) => <LandscapeBed key={`landscape-bed-${index}`} {...bed} />)}
      {/* A little paving and planted edge beside the pedestrian route. */}
      {[-8.8, -7.5, -6.2, 6.2, 7.5, 8.8].map((x, index) => (
        <ModelBox
          key={`walkway-paver-${index}`}
          position={[x, 0.035, 6.3]}
          size={[1.02, 0.055, 0.62]}
          color={index % 2 ? "#d4d7d8" : "#c5c9cb"}
          castShadow={false}
        />
      ))}
      {/* Low curbs define planted islands and keep their edges tidy. */}
      {beds.slice(4).map((bed, index) => (
        <group key={`bed-curb-${index}`} position={bed.center}>
          {[-1, 1].map((side) => (
            <ModelBox
              key={side}
              position={[0, 0.11, side * (bed.size[1] / 2 + 0.06)]}
              size={[bed.size[0] + 0.2, 0.16, 0.12]}
              color="#c4c9c4"
              castShadow={false}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
