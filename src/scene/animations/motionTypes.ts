import type { WorldPoint } from "../warehouse-scene-data";

/** A world-space waypoint used by the purely presentational scene animator. */
export interface MotionWaypoint {
  position: WorldPoint;
  rotationY: number;
  /** Seconds spent travelling from the previous waypoint. */
  travelSeconds: number;
  /** Seconds to pause after reaching this waypoint. */
  holdSeconds?: number;
  /** The segment ending at this waypoint is driven in reverse gear. */
  reverse?: boolean;
}

export interface MotionPose {
  position: WorldPoint;
  rotationY: number;
  reverse: boolean;
}
