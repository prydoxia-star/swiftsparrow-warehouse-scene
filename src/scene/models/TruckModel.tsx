import { useContext } from "react";
import { FlatQuad, ModelBox, ModelCylinder, ProfilePrism, WheelAssembly } from "./primitives";
import { VehicleWheelRotationContext } from "../animations/VehicleMotionContext";
import type { WorldPoint } from "../warehouse-scene-data";

const cabProfile = [
  [1.22, 0.72],
  [3.23, 0.72],
  [3.23, 1.72],
  [2.62, 2.62],
  [1.42, 2.62],
  [1.22, 1.88],
] as const;

export function TruckModel({ position }: { position: WorldPoint }) {
  const wheelRotationRef = useContext(VehicleWheelRotationContext);
  return (
    <group position={position}>
      {/* Main chassis and box body */}
      <ModelBox position={[0, 0.66, -0.05]} size={[2.24, 0.38, 6.45]} color="#73797d" />
      <ModelBox position={[0, 1.98, -0.88]} size={[2.55, 2.72, 4.45]} color="#c8cbcd" />
      <ModelBox position={[0, 3.36, -0.88]} size={[2.62, 0.12, 4.55]} color="#e1e3e4" />
      <ModelBox position={[0, 0.82, -0.88]} size={[2.62, 0.16, 4.55]} color="#a7acaf" />

      {/* Cargo-body edge rails, side seams and rear doors */}
      {[-1.18, 1.18].map((x) => (
        <group key={`body-rails-${x}`}>
          <ModelBox position={[x, 2.0, -0.88]} size={[0.075, 2.68, 4.4]} color="#aeb3b6" />
          <ModelBox position={[x * 1.015, 3.23, -0.88]} size={[0.08, 0.1, 4.32]} color="#f0f1f1" />
          {[-2.55, -1.65, -0.75, 0.15, 0.78].map((z) => (
            <ModelBox key={`side-rib-${x}-${z}`} position={[x * 1.02, 2.0, z]} size={[0.045, 2.45, 0.045]} color="#b2b7ba" />
          ))}
          <ModelBox position={[x * 1.02, 0.98, -0.88]} size={[0.05, 0.08, 4.25]} color="#8f9599" />
        </group>
      ))}
      <ModelBox position={[0, 1.99, -3.13]} size={[2.4, 2.55, 0.10]} color="#b6bbbe" />
      {[-0.55, 0.55].map((x) => (
        <group key={`rear-door-${x}`}>
          <ModelBox position={[x, 2.0, -3.205]} size={[1.05, 2.42, 0.055]} color="#d1d4d6" />
          <ModelBox position={[x, 2.0, -3.24]} size={[0.045, 2.26, 0.035]} color="#93999d" />
          <ModelBox position={[x, 2.0, -3.26]} size={[0.26, 0.06, 0.035]} color="#858b8f" />
        </group>
      ))}
      {[-1.02, 1.02].map((x) => (
        <ModelBox key={`rear-latch-${x}`} position={[x, 2.0, -3.27]} size={[0.055, 2.3, 0.055]} color="#777e82" />
      ))}
      <ModelBox position={[0, 0.72, -3.27]} size={[2.65, 0.22, 0.24]} color="#686e72" />
      <ModelBox position={[0, 0.83, 3.13]} size={[2.45, 0.28, 0.22]} color="#6f7579" />

      {/* Driver cabin: solid faceted silhouette with windshield and side glass */}
      <ProfilePrism width={2.12} profile={cabProfile} color="#b7bdc0" />
      <FlatQuad
        corners={[
          [-0.83, 1.82, 3.235],
          [0.83, 1.82, 3.235],
          [0.72, 2.48, 2.64],
          [-0.72, 2.48, 2.64],
        ]}
        color="#707a80"
      />
      <ModelBox position={[0, 2.54, 1.98]} size={[1.55, 0.08, 0.1]} color="#e4e6e7" />
      {[-1, 1].map((side) => (
        <group key={`cab-side-${side}`}>
          <ModelBox position={[side * 1.075, 2.0, 1.98]} size={[0.055, 0.66, 0.92]} color="#7b858b" />
          <ModelBox position={[side * 1.11, 1.62, 2.06]} size={[0.05, 0.08, 0.7]} color="#d9dcde" />
          <ModelBox position={[side * 1.18, 1.91, 2.67]} size={[0.07, 0.45, 0.08]} color="#747b80" />
          <ModelBox position={[side * 1.31, 2.15, 2.69]} size={[0.34, 0.23, 0.16]} color="#aeb4b7" />
          <ModelBox position={[side * 1.31, 2.15, 2.78]} size={[0.25, 0.15, 0.035]} color="#747e84" />
        </group>
      ))}

      {/* Grille, lights, bumper and front details */}
      <ModelBox position={[0, 1.14, 3.255]} size={[0.88, 0.48, 0.075]} color="#70777c" />
      {Array.from({ length: 5 }, (_, index) => (
        <ModelBox key={`grille-${index}`} position={[0, 0.98 + index * 0.075, 3.30]} size={[0.77, 0.025, 0.025]} color="#c5c9cb" />
      ))}
      {[-0.78, 0.78].map((x) => (
        <group key={`headlight-${x}`}>
          <ModelBox position={[x, 1.35, 3.25]} size={[0.4, 0.28, 0.085]} color="#e5e7e8" />
          <ModelBox position={[x, 1.35, 3.305]} size={[0.23, 0.14, 0.035]} color="#f2f3f3" />
          <ModelBox position={[x, 0.83, 3.30]} size={[0.25, 0.12, 0.08]} color="#8a9094" />
        </group>
      ))}
      <ModelBox position={[0, 0.69, 3.35]} size={[2.38, 0.22, 0.28]} color="#d0d3d5" />
      <ModelBox position={[0, 0.48, 2.4]} size={[0.82, 0.08, 1.2]} color="#858b8f" />

      {/* Fuel tank, side steps and underbody boxes */}
      {[-1, 1].map((side) => (
        <group key={`side-equipment-${side}`}>
          <ModelBox position={[side * 1.17, 0.78, 1.05]} size={[0.22, 0.42, 0.72]} color="#969da1" />
          <ModelBox position={[side * 1.22, 0.52, 2.0]} size={[0.42, 0.10, 0.72]} color="#71787d" />
          <ModelBox position={[side * 1.2, 0.92, -2.55]} size={[0.18, 0.48, 0.48]} color="#969ca0" />
        </group>
      ))}

      {/* Six wheels with separate hubs and visible axle spacing */}
      {[-2.15, -1.12, 2.05].map((z) => (
        <group key={`axle-${z}`}>
          {/* Grey axle tube visibly joins matching left/right wheel assemblies. */}
          <ModelCylinder
            position={[0, 0.48, z]}
            radius={0.135}
            height={2.42}
            color="#858b8f"
            rotation={[0, 0, Math.PI / 2]}
            segments={10}
          />
          <WheelAssembly position={[-1.31, 0.48, z]} radius={0.47} width={0.3} rotationRef={wheelRotationRef} />
          <WheelAssembly position={[1.31, 0.48, z]} radius={0.47} width={0.3} rotationRef={wheelRotationRef} />
        </group>
      ))}
    </group>
  );
}
