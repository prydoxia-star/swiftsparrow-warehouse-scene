import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import { warehouseSceneData } from "../warehouse-scene-data";
import { truckRouteDelays, truckRoutes, DOCK_INTERIOR_Z } from "../traffic-paths";
import { sampleMotionRoute } from "../animations/RouteMotion";
import { getAgentPose } from "../animations/agentRegistry";
import { ModelBox } from "./primitives";

/** A wall-mounted roll-up loading door. Side tracks and lintel stay fixed to the facade. */
export function DockShutter({ dockId, x, z }: { dockId: string; x: number; z: number }) {
  const shutterRef = useRef<Group>(null);
  const openness = useRef(0);
  const truck = warehouseSceneData.trucks.find((record) => record.currentDockId === dockId);
  const route = truck ? truckRoutes[truck.id] : undefined;
  const delay = truck ? truckRouteDelays[truck.id] ?? 0 : 0;
  const dockZ = DOCK_INTERIOR_Z;

  useFrame(({ clock }, delta) => {
    if (!route || !truck) return;
    const pose = getAgentPose(truck.id) ?? sampleMotionRoute(route, clock.elapsedTime - delay);
    const distance = Math.hypot(pose.position[0] - x, pose.position[2] - dockZ);
    // Open well before the truck begins its reverse approach, not at the last moment.
    const shouldOpen = distance < 15.0;
    openness.current = MathUtils.damp(openness.current, shouldOpen ? 1 : 0, shouldOpen ? 3.8 : 1.8, delta);
    if (shutterRef.current) {
      // The lower edge travels upward while the visible door panel compresses into the head box.
      shutterRef.current.position.y = 0.18 + openness.current * 3.9;
      shutterRef.current.scale.y = Math.max(0.015, 1 - openness.current);
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* Fixed jambs, guide rails and roller casing are attached flush to the building face. */}
      <ModelBox position={[-1.86, 2.0, 0.035]} size={[0.13, 4.0, 0.2]} color="#e0e3e4" />
      <ModelBox position={[1.86, 2.0, 0.035]} size={[0.13, 4.0, 0.2]} color="#e0e3e4" />
      <ModelBox position={[0, 4.08, 0.035]} size={[3.88, 0.24, 0.28]} color="#858d92" />
      <ModelBox position={[0, 4.2, 0.04]} size={[3.96, 0.08, 0.32]} color="#dfe2e3" />
      <ModelBox position={[0, 0.12, 0.055]} size={[3.76, 0.16, 0.22]} color="#777f84" />
      <group ref={shutterRef} position={[0, 0.18, 0]}>
        <ModelBox position={[0, 1.86, 0.025]} size={[3.56, 3.72, 0.09]} color="#aeb4b8" />
        {Array.from({ length: 10 }, (_, index) => (
          <ModelBox
            key={`shutter-rib-${index}`}
            position={[0, 0.18 + index * 0.36, 0.08]}
            size={[3.44, 0.035, 0.028]}
            color="#7b8388"
            castShadow={false}
          />
        ))}
        <ModelBox position={[0, 0.04, 0.08]} size={[3.54, 0.08, 0.06]} color="#d4d8da" />
      </group>
    </group>
  );
}
