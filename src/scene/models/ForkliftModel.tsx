import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { BeamBetween, ModelBox, ModelCylinder, WheelAssembly } from "./primitives";
import type { WorldPoint } from "../warehouse-scene-data";

interface ForkliftModelProps {
  position: WorldPoint;
  rotation?: number;
  /** Scene animation supplies these values; the model only renders them. */
  liftHeightRef?: MutableRefObject<number>;
  cargoVisibleRef?: MutableRefObject<boolean>;
}

/** Detailed low-poly forklift. Movement and inventory decisions are supplied by the scene simulation. */
export function ForkliftModel({
  position,
  rotation = 0,
  liftHeightRef,
  cargoVisibleRef,
}: ForkliftModelProps) {
  const liftAssemblyRef = useRef<Group>(null);
  const cargoRef = useRef<Group>(null);

  useFrame(() => {
    const lift = Math.max(0, liftHeightRef?.current ?? 0);
    if (liftAssemblyRef.current) liftAssemblyRef.current.position.y = lift;
    if (cargoRef.current) {
      cargoRef.current.visible = cargoVisibleRef?.current ?? true;
      cargoRef.current.position.y = lift;
    }
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Chassis and counterweight */}
      <ModelBox position={[0, 0.59, -0.12]} size={[1.48, 0.38, 2.25]} color="#747a7e" />
      <ModelBox position={[0, 0.91, -0.52]} size={[1.5, 0.78, 1.42]} color="#bfc4c7" />
      <ModelBox position={[0, 1.28, -0.72]} size={[1.4, 0.18, 0.95]} color="#d5d8da" />
      <ModelBox position={[0, 0.42, 0.58]} size={[1.26, 0.18, 0.92]} color="#777e82" />
      <ModelBox position={[0, 0.96, -1.27]} size={[1.34, 0.54, 0.16]} color="#858c90" />

      {/* Engine cover, side access steps and rear lights */}
      {[-1, 1].map((side) => (
        <group key={`forklift-side-${side}`}>
          <ModelBox position={[side * 0.76, 0.83, -0.46]} size={[0.08, 0.66, 1.2]} color="#969da1" />
          <ModelBox position={[side * 0.77, 0.37, -0.28]} size={[0.12, 0.12, 0.55]} color="#5e656a" />
          <ModelBox position={[side * 0.78, 0.72, -1.31]} size={[0.12, 0.22, 0.2]} color="#d8dcde" />
          <ModelBox position={[side * 0.77, 0.42, -1.33]} size={[0.12, 0.1, 0.08]} color="#b4a49a" />
        </group>
      ))}

      {/* Operator platform and seat */}
      <ModelBox position={[0, 0.99, 0.43]} size={[0.95, 0.12, 0.78]} color="#7c8387" />
      <ModelBox position={[0, 1.36, -0.08]} size={[0.62, 0.18, 0.58]} color="#555d62" />
      <ModelBox position={[0, 1.69, -0.31]} size={[0.58, 0.63, 0.14]} color="#686f74" rotation={[-0.1, 0, 0]} />
      <ModelBox position={[0, 1.15, 0.62]} size={[0.7, 0.08, 0.12]} color="#656c71" />

      {/* Visible seated operator: legs bent toward the pedals, hands at the steering wheel. */}
      <group position={[0, 0, 0]}>
        <ModelBox position={[0, 1.76, -0.02]} size={[0.46, 0.52, 0.32]} color="#69747a" />
        <ModelBox position={[0, 1.78, 0.15]} size={[0.32, 0.4, 0.035]} color="#d1d5d6" />
        <mesh position={[0, 2.12, 0.02]} castShadow>
          <icosahedronGeometry args={[0.205, 1]} />
          <meshStandardMaterial color="#b98e71" roughness={0.96} flatShading />
        </mesh>
        {/* Neck and hard hat */}
        <ModelCylinder position={[0, 1.99, 0.02]} radius={0.09} height={0.18} color="#b98e71" segments={6} />
        <mesh position={[0, 2.28, 0.01]} castShadow>
          <cylinderGeometry args={[0.205, 0.23, 0.13, 7]} />
          <meshStandardMaterial color="#d8d0a7" roughness={0.92} flatShading />
        </mesh>
        <ModelBox position={[0, 2.205, 0.035]} size={[0.43, 0.045, 0.36]} color="#e2d8ae" />
        {/* Bent legs and work boots */}
        <ModelBox position={[-0.17, 1.39, 0.26]} size={[0.22, 0.24, 0.48]} color="#565f64" rotation={[0.28, 0, -0.08]} />
        <ModelBox position={[0.17, 1.39, 0.26]} size={[0.22, 0.24, 0.48]} color="#565f64" rotation={[0.28, 0, 0.08]} />
        <ModelBox position={[-0.17, 1.24, 0.52]} size={[0.24, 0.13, 0.32]} color="#4f565b" />
        <ModelBox position={[0.17, 1.24, 0.52]} size={[0.24, 0.13, 0.32]} color="#4f565b" />
        {/* Arms extend toward the controls */}
        <ModelBox position={[-0.29, 1.82, 0.22]} size={[0.16, 0.42, 0.18]} color="#77848a" rotation={[0.68, 0, -0.2]} />
        <ModelBox position={[0.28, 1.82, 0.22]} size={[0.16, 0.42, 0.18]} color="#77848a" rotation={[0.68, 0, 0.2]} />
        <mesh position={[-0.2, 1.67, 0.39]} castShadow>
          <icosahedronGeometry args={[0.085, 0]} />
          <meshStandardMaterial color="#b98e71" flatShading />
        </mesh>
        <mesh position={[0.2, 1.67, 0.39]} castShadow>
          <icosahedronGeometry args={[0.085, 0]} />
          <meshStandardMaterial color="#b98e71" flatShading />
        </mesh>
      </group>

      {/* Steering column and wheel */}
      <ModelBox position={[0.34, 1.42, 0.28]} size={[0.075, 0.46, 0.075]} color="#737a7f" rotation={[0.12, 0, -0.12]} />
      <mesh position={[0.33, 1.68, 0.31]} rotation={[0.55, 0, 0.1]} castShadow>
        <torusGeometry args={[0.23, 0.035, 6, 10]} />
        <meshStandardMaterial color="#42494e" metalness={0.2} roughness={0.65} flatShading />
      </mesh>
      <ModelBox position={[-0.26, 1.13, 0.42]} size={[0.22, 0.08, 0.28]} color="#555c61" rotation={[0.1, 0, 0.12]} />

      {/* Overhead safety guard and protective roof */}
      {[-0.62, 0.62].map((x) => (
        <group key={`guard-posts-${x}`}>
          <ModelBox position={[x, 2.02, -0.57]} size={[0.09, 1.55, 0.09]} color="#7b8287" />
          <ModelBox position={[x, 2.02, 0.53]} size={[0.09, 1.55, 0.09]} color="#7b8287" />
          <ModelBox position={[x, 2.72, -0.02]} size={[0.08, 0.08, 1.2]} color="#aeb4b7" />
        </group>
      ))}
      <ModelBox position={[0, 2.82, -0.02]} size={[1.42, 0.13, 1.32]} color="#c9cdd0" />
      <ModelBox position={[0, 2.89, -0.02]} size={[1.48, 0.055, 1.38]} color="#e1e3e4" />
      <ModelBox position={[0, 1.88, 0.53]} size={[1.2, 0.08, 0.08]} color="#a9afb2" />

      {/* Mast rails remain fixed; carriage, tines and cargo rise together. */}
      {[-0.57, 0.57].map((x) => (
        <group key={`mast-rail-${x}`}>
          <ModelBox position={[x, 1.55, 1.14]} size={[0.13, 2.65, 0.16]} color="#737a7f" />
          <ModelBox position={[x, 1.55, 1.24]} size={[0.045, 2.46, 0.035]} color="#d4d7d9" />
        </group>
      ))}
      <ModelBox position={[0, 2.82, 1.15]} size={[1.36, 0.14, 0.2]} color="#858c90" />
      <ModelCylinder position={[0, 1.72, 1.1]} radius={0.07} height={1.25} color="#747b80" segments={8} />
      <ModelCylinder position={[0, 1.72, 1.19]} radius={0.035} height={1.1} color="#d0d4d6" segments={8} />
      <BeamBetween start={[-0.42, 1.43, 0.88]} end={[-0.42, 2.35, 1.35]} thickness={0.045} color="#b9bec1" />
      <BeamBetween start={[0.42, 1.43, 0.88]} end={[0.42, 2.35, 1.35]} thickness={0.045} color="#b9bec1" />
      <group ref={liftAssemblyRef}>
        <ModelBox position={[0, 0.45, 1.18]} size={[1.38, 0.13, 0.22]} color="#858c90" />
        <ModelBox position={[0, 1.08, 1.42]} size={[1.55, 0.82, 0.16]} color="#aeb4b7" />
        <ModelBox position={[0, 1.08, 1.52]} size={[1.32, 0.18, 0.08]} color="#777e82" />
        {[-0.48, 0.48].map((x) => (
          <group key={`fork-tine-${x}`}>
            <ModelBox position={[x, 0.23, 1.78]} size={[0.16, 0.16, 1.18]} color="#656c71" />
            <ModelBox position={[x, 0.17, 2.35]} size={[0.15, 0.08, 0.45]} color="#858c90" />
            <ModelBox position={[x, 0.34, 1.41]} size={[0.18, 0.38, 0.14]} color="#737a7f" />
          </group>
        ))}
      </group>

      {/* Fork pallet and packages are toggled by the independent work simulation. */}
      <group ref={cargoRef} position={[0, 0, 2.15]}>
        <ModelBox position={[0, 0.29, 0]} size={[1.25, 0.14, 0.9]} color="#8c9296" />
        {[-0.38, 0, 0.38].map((x) => (
          <ModelBox key={`cargo-runner-${x}`} position={[x, 0.19, 0]} size={[0.12, 0.12, 0.82]} color="#747b80" />
        ))}
        <ModelBox position={[-0.28, 0.78, 0]} size={[0.56, 0.78, 0.7]} color="#c4c8ca" />
        <ModelBox position={[0.28, 0.78, 0]} size={[0.56, 0.78, 0.7]} color="#d3d6d8" />
        <ModelBox position={[0, 1.2, 0]} size={[1.15, 0.07, 0.75]} color="#e2e4e5" />
        <ModelBox position={[0, 0.78, 0.36]} size={[0.045, 0.76, 0.025]} color="#949b9f" />
      </group>

      {/* Wheels: large front drive wheels and compact rear steering wheels. */}
      {[-0.76, 0.76].map((x) => (
        <group key={`forklift-wheels-${x}`}>
          <WheelAssembly position={[x, 0.39, -0.78]} radius={0.32} width={0.22} />
          <WheelAssembly position={[x, 0.43, 0.66]} radius={0.39} width={0.24} />
        </group>
      ))}
    </group>
  );
}
