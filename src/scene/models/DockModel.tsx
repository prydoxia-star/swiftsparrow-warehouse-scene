import { ModelBox } from "./primitives";
import type { Dock } from "../../data";
import type { WorldPoint } from "../warehouse-scene-data";

export function DockModel({ dock, position }: { dock: Dock; position: WorldPoint }) {
  const surface = dock.status === "out_of_service" ? "#a6aaad" : "#d0d4d6";
  return (
    <group position={position}>
      {/* Low concrete apron stops before the truck wheel line to avoid mesh overlap. */}
      <ModelBox position={[0, 0.13, 0.58]} size={[4.05, 0.26, 1.15]} color={surface} />
      <ModelBox position={[0, 0.27, 1.15]} size={[3.4, 0.12, 0.2]} color="#a0a7ab" />
      <ModelBox position={[0, 0.12, 1.0]} size={[3.5, 0.1, 0.13]} color="#eceeef" />

      {/* Dock leveller plate and hinge details. The loading-door frame is part
          of WarehouseBuilding, so it is intentionally not duplicated here. */}
      <ModelBox position={[0, 0.33, 0.75]} size={[2.75, 0.09, 0.9]} color="#969da1" />
      {[-0.78, 0, 0.78].map((x) => (
        <ModelBox key={`leveller-rib-${x}`} position={[x, 0.39, 0.75]} size={[0.045, 0.025, 0.8]} color="#dce0e2" />
      ))}

      {/* Rubber bumpers are kept outside the truck's body width. */}
      {[-2.1, 2.1].map((x) => (
        <group key={`dock-bumper-${x}`}>
          <ModelBox position={[x, 0.6, 0.1]} size={[0.26, 1.05, 0.28]} color="#777f84" />
          <ModelBox position={[x, 1.15, 0.1]} size={[0.34, 0.12, 0.32]} color="#c3c8ca" />
        </group>
      ))}

      {[-2.05, 2.05].map((x) => (
        <group key={`bollard-${x}`}>
          <ModelBox position={[x, 0.1, 0.45]} size={[0.34, 0.16, 0.34]} color="#858c90" />
          <mesh position={[x, 0.54, 0.45]} castShadow>
            <cylinderGeometry args={[0.105, 0.13, 0.78, 8]} />
            <meshStandardMaterial color="#aeb4b7" roughness={0.82} flatShading />
          </mesh>
          <ModelBox position={[x, 0.74, 0.45]} size={[0.23, 0.09, 0.23]} color="#e0e3e4" />
        </group>
      ))}
    </group>
  );
}
