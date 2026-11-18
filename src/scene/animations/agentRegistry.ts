import type { MotionPose } from "./motionTypes";
import type { WorldPoint } from "../warehouse-scene-data";

export type MotionAgentKind = "truck" | "forklift" | "car" | "worker";

export interface MotionAgentSnapshot {
  id: string;
  kind: MotionAgentKind;
  position: WorldPoint;
  rotationY: number;
  reverse: boolean;
  updatedAt: number;
}

interface Footprint {
  halfLength: number;
  halfWidth: number;
  priority: number;
}

const footprints: Record<MotionAgentKind, Footprint> = {
  truck: { halfLength: 3.85, halfWidth: 1.34, priority: 4 },
  car: { halfLength: 1.78, halfWidth: 0.86, priority: 3 },
  forklift: { halfLength: 2.45, halfWidth: 0.9, priority: 2 },
  worker: { halfLength: 0.5, halfWidth: 0.38, priority: 1 },
};

const agents = new Map<string, MotionAgentSnapshot>();

export function publishAgentPose(
  id: string,
  kind: MotionAgentKind,
  pose: MotionPose,
  now: number,
): void {
  agents.set(id, {
    id,
    kind,
    position: [...pose.position],
    rotationY: pose.rotationY,
    reverse: pose.reverse,
    updatedAt: now,
  });
}

export function removeAgentPose(id: string): void {
  agents.delete(id);
}

export function getAgentPose(id: string): MotionAgentSnapshot | undefined {
  return agents.get(id);
}

function axes(rotationY: number) {
  const sin = Math.sin(rotationY);
  const cos = Math.cos(rotationY);
  return {
    forward: { x: sin, z: cos },
    right: { x: cos, z: -sin },
  };
}

/** Separating-axis test for two oriented vehicle/person footprints on the yard plane. */
function footprintsOverlap(
  a: MotionAgentSnapshot,
  b: MotionAgentSnapshot,
  padding: number,
): boolean {
  const aSize = footprints[a.kind];
  const bSize = footprints[b.kind];
  const aAxes = axes(a.rotationY);
  const bAxes = axes(b.rotationY);
  const dx = b.position[0] - a.position[0];
  const dz = b.position[2] - a.position[2];
  const testAxes = [aAxes.forward, aAxes.right, bAxes.forward, bAxes.right];

  for (const axis of testAxes) {
    const distance = Math.abs(dx * axis.x + dz * axis.z);
    const radiusA =
      aSize.halfLength * Math.abs(aAxes.forward.x * axis.x + aAxes.forward.z * axis.z) +
      aSize.halfWidth * Math.abs(aAxes.right.x * axis.x + aAxes.right.z * axis.z);
    const radiusB =
      bSize.halfLength * Math.abs(bAxes.forward.x * axis.x + bAxes.forward.z * axis.z) +
      bSize.halfWidth * Math.abs(bAxes.right.x * axis.x + bAxes.right.z * axis.z);
    if (distance > radiusA + radiusB + padding) return false;
  }

  return true;
}

function hasRightOfWay(selfId: string, selfKind: MotionAgentKind, other: MotionAgentSnapshot): boolean {
  const selfPriority = footprints[selfKind].priority;
  const otherPriority = footprints[other.kind].priority;
  if (selfPriority !== otherPriority) return selfPriority > otherPriority;
  return selfId.localeCompare(other.id) < 0;
}

/**
 * Shared scene-level collision coordination. Moving entities publish their world pose and
 * sample their next few frames against every other active agent. Trucks have priority over
 * cars, forklifts and pedestrians; stable IDs break ties so two agents never deadlock.
 */
export function getAgentSpeedFactor(
  selfId: string,
  selfKind: MotionAgentKind,
  candidatePoses: readonly MotionPose[],
  now: number,
): number {
  let speedFactor = 1;

  const selfIsRoadVehicle = selfKind === "truck" || selfKind === "car";

  for (const other of agents.values()) {
    if (other.id === selfId || now - other.updatedAt > 0.75) continue;
    const otherIsRoadVehicle = other.kind === "truck" || other.kind === "car";
    const vehiclePair = selfIsRoadVehicle && otherIsRoadVehicle;

    // Cars and trucks share lanes, so right-of-way must never allow one road vehicle
    // to pass through another. Every road vehicle yields to occupied space ahead,
    // including when it is a truck following a smaller car.
    if (!vehiclePair && hasRightOfWay(selfId, selfKind, other)) continue;

    for (const candidate of candidatePoses) {
      const proposed: MotionAgentSnapshot = {
        id: selfId,
        kind: selfKind,
        position: candidate.position,
        rotationY: candidate.rotationY,
        reverse: candidate.reverse,
        updatedAt: now,
      };

      if (vehiclePair) {
        // Hard braking envelope: never advance into another car/truck's current footprint.
        if (footprintsOverlap(proposed, other, 0.28)) return 0;
        if (footprintsOverlap(proposed, other, 0.9)) {
          speedFactor = Math.min(speedFactor, 0.16);
        } else if (footprintsOverlap(proposed, other, 1.8)) {
          speedFactor = Math.min(speedFactor, 0.42);
        } else if (footprintsOverlap(proposed, other, 2.8)) {
          speedFactor = Math.min(speedFactor, 0.72);
        }
        continue;
      }

      if (footprintsOverlap(proposed, other, 0.2)) return 0;
      if (footprintsOverlap(proposed, other, 0.8)) {
        speedFactor = Math.min(speedFactor, 0.18);
      } else if (footprintsOverlap(proposed, other, 1.4)) {
        speedFactor = Math.min(speedFactor, 0.5);
      }
    }
  }

  return speedFactor;
}
