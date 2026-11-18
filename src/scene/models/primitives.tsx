import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import * as THREE from "three";
import type { WorldPoint, WorldSize } from "../warehouse-scene-data";

export function ModelBox({
  position,
  size,
  color,
  rotation = [0, 0, 0],
  castShadow = true,
  receiveShadow = true,
}: {
  position: WorldPoint;
  size: WorldSize;
  color: string;
  rotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow={castShadow} receiveShadow={receiveShadow}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.88} metalness={0.04} flatShading />
    </mesh>
  );
}

export function ModelCylinder({
  position,
  radius,
  height,
  color,
  rotation = [0, 0, 0],
  segments = 10,
}: {
  position: WorldPoint;
  radius: number;
  height: number;
  color: string;
  rotation?: [number, number, number];
  segments?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, segments]} />
      <meshStandardMaterial color={color} roughness={0.9} metalness={0.08} flatShading />
    </mesh>
  );
}

/** A crisp extruded side-profile prism, useful for low-poly vehicle cabs. */
export function ProfilePrism({
  width,
  profile,
  color,
}: {
  width: number;
  /** Each point is [local Z, local Y], ordered around the side silhouette. */
  profile: readonly (readonly [number, number])[];
  color: string;
}) {
  const geometry = useMemo(() => {
    const count = profile.length;
    const positions: number[] = [];
    const indices: number[] = [];
    const half = width / 2;

    profile.forEach(([z, y]) => positions.push(-half, y, z));
    profile.forEach(([z, y]) => positions.push(half, y, z));

    for (let i = 1; i < count - 1; i += 1) {
      indices.push(0, i, i + 1);
      indices.push(count, count + i + 1, count + i);
    }

    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      const a = i;
      const b = next;
      const c = count + next;
      const d = count + i;
      indices.push(a, b, c, a, c, d);
    }

    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  }, [profile, width]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.86} metalness={0.03} flatShading side={THREE.DoubleSide} />
    </mesh>
  );
}

export function FlatQuad({
  corners,
  color,
}: {
  corners: [WorldPoint, WorldPoint, WorldPoint, WorldPoint];
  color: string;
}) {
  const geometry = useMemo(() => {
    const result = new THREE.BufferGeometry();
    result.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(corners.flatMap((point) => point), 3),
    );
    result.setIndex([0, 1, 2, 0, 2, 3]);
    result.computeVertexNormals();
    return result;
  }, [corners]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.04} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function WheelAssembly({
  position,
  radius,
  width,
  rotationRef,
}: {
  position: WorldPoint;
  radius: number;
  width: number;
  /** Optional shared rolling angle from a vehicle route animator. */
  rotationRef?: MutableRefObject<number> | null;
}) {
  const wheelRef = useRef<Group>(null);
  useFrame(() => {
    if (wheelRef.current && rotationRef) wheelRef.current.rotation.x = rotationRef.current;
  });

  return (
    <group ref={wheelRef} position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, width, 12]} />
        <meshStandardMaterial color="#55595d" roughness={0.98} flatShading />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group key={`wheel-hub-${side}`}>
          <mesh position={[side * (width / 2 + 0.018), 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[radius * 0.57, radius * 0.57, 0.045, 10]} />
            <meshStandardMaterial color="#c4c7c9" roughness={0.56} metalness={0.25} flatShading />
          </mesh>
          <mesh position={[side * (width / 2 + 0.047), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[radius * 0.17, radius * 0.17, 0.05, 8]} />
            <meshStandardMaterial color="#777d81" roughness={0.45} metalness={0.35} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function BeamBetween({
  start,
  end,
  thickness = 0.07,
  color = "#858b8f",
}: {
  start: WorldPoint;
  end: WorldPoint;
  thickness?: number;
  color?: string;
}) {
  const delta = useMemo(
    () => new THREE.Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]),
    [start, end],
  );
  const midpoint: WorldPoint = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.clone().normalize(),
  ), [delta]);

  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow>
      <boxGeometry args={[thickness, delta.length(), thickness]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.12} flatShading />
    </mesh>
  );
}
