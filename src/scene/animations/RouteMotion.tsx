import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { MotionWaypoint } from "./motionTypes";
import { VehicleWheelRotationContext } from "./VehicleMotionContext";
import { getRouteDuration, sampleMotionRoute } from "./routeMath";
import {
  getAgentSpeedFactor,
  publishAgentPose,
  removeAgentPose,
  type MotionAgentKind,
} from "./agentRegistry";

export type { MotionPose, MotionWaypoint } from "./motionTypes";
export { getRouteDuration, sampleMotionRoute };

interface RouteMotionProps {
  route: readonly MotionWaypoint[];
  delaySeconds?: number;
  /** Hide scheduled traffic until its start time instead of showing it waiting off-screen. */
  hideUntilDelay?: boolean;
  /** Hide and unregister this entity after it reaches the last waypoint. */
  despawnAtEnd?: boolean;
  /** Optional shared position registration for moving scene entities. */
  agentId?: string;
  agentKind?: MotionAgentKind;
  children: ReactNode;
}

const angleDelta = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

/**
 * Presentational route animator. It owns only interpolation; a shared registry supplies
 * position awareness and right-of-way without coupling model components to business logic.
 */
export function RouteMotion({
  route,
  delaySeconds = 0,
  hideUntilDelay = false,
  despawnAtEnd = false,
  agentId,
  agentKind,
  children,
}: RouteMotionProps) {
  const groupRef = useRef<Group>(null);
  const simulationTime = useRef(0);
  const speedScale = useRef(1);
  const wheelRotation = useRef(0);
  const completed = useRef(false);
  const totalDuration = useMemo(() => getRouteDuration(route), [route]);

  useEffect(() => () => {
    if (agentId) removeAgentPose(agentId);
  }, [agentId]);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group || route.length === 0) return;
    if (completed.current) {
      group.visible = false;
      return;
    }

    const active = clock.elapsedTime >= delaySeconds;
    group.visible = active || !hideUntilDelay;
    if (!active) {
      if (hideUntilDelay) {
        if (agentId) removeAgentPose(agentId);
        return;
      }
      const waitingPose = sampleMotionRoute(route, 0);
      group.position.set(...waitingPose.position);
      group.rotation.y = waitingPose.rotationY;
      if (agentId && agentKind) {
        publishAgentPose(agentId, agentKind, waitingPose, clock.elapsedTime);
      }
      return;
    }

    group.visible = true;
    const frameDelta = Math.min(delta, 0.05);
    let speedFactor = 1;

    if (agentId && agentKind) {
      // Probe the route ahead to leave enough room for long vehicle footprints to brake safely.
      const lookAhead = [0.25, 0.5, 0.85, 1.25, 1.75, 2.3].map((secondsAhead) =>
        sampleMotionRoute(route, simulationTime.current + secondsAhead, !despawnAtEnd),
      );
      speedFactor = getAgentSpeedFactor(agentId, agentKind, lookAhead, clock.elapsedTime);
    }

    // Traffic yielding uses smooth braking/acceleration; route interpolation itself no longer
    // eases to zero at every small steering waypoint.
    const responseRate = speedFactor < speedScale.current ? 5.5 : 2.0;
    const response = 1 - Math.exp(-responseRate * frameDelta);
    speedScale.current += (speedFactor - speedScale.current) * response;
    simulationTime.current += frameDelta * speedScale.current;

    if (despawnAtEnd && simulationTime.current >= totalDuration) {
      const finalPose = sampleMotionRoute(route, totalDuration, false);
      group.position.set(...finalPose.position);
      group.rotation.y = finalPose.rotationY;
      group.visible = false;
      completed.current = true;
      if (agentId) removeAgentPose(agentId);
      return;
    }

    const pose = sampleMotionRoute(route, simulationTime.current, !despawnAtEnd);

    // Roll truck wheels from actual world-space travel distance. Reverse motion naturally
    // spins the wheels in the opposite direction; pausing for traffic leaves them still.
    if (agentKind === "truck") {
      const dx = pose.position[0] - group.position.x;
      const dz = pose.position[2] - group.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 0.00001) {
        const forwardX = Math.sin(pose.rotationY);
        const forwardZ = Math.cos(pose.rotationY);
        const signedDistance = dx * forwardX + dz * forwardZ < 0 ? -distance : distance;
        wheelRotation.current += signedDistance / 0.47;
      }
    }

    group.position.set(...pose.position);

    // Ease steering angle independently so heading changes stay fluid through arcs and U-turns.
    const steeringRate = agentKind === "truck" ? 5.2 : agentKind === "car" ? 7.2 : 8.5;
    const steeringBlend = 1 - Math.exp(-steeringRate * frameDelta);
    group.rotation.y += angleDelta(group.rotation.y, pose.rotationY) * steeringBlend;
    group.userData.reverse = pose.reverse;

    if (agentId && agentKind) {
      publishAgentPose(agentId, agentKind, pose, clock.elapsedTime);
    }
  });

  const initialWaypoint = route[0];
  return (
    <group
      ref={groupRef}
      position={initialWaypoint?.position ?? [0, 0, 0]}
      rotation={initialWaypoint ? [0, initialWaypoint.rotationY, 0] : [0, 0, 0]}
      userData={{ routeDuration: totalDuration, agentId }}
      visible={!hideUntilDelay || delaySeconds <= 0}
    >
      <VehicleWheelRotationContext.Provider value={wheelRotation}>
        {children}
      </VehicleWheelRotationContext.Provider>
    </group>
  );
}
