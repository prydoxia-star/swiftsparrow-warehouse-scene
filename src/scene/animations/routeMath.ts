import type { MotionPose, MotionWaypoint } from "./motionTypes";

const EPSILON = 1e-4;
const ZERO: [number, number, number] = [0, 0, 0];

const distanceXZ = (a: MotionWaypoint["position"], b: MotionWaypoint["position"]): number =>
  Math.hypot(b[0] - a[0], b[2] - a[2]);

const angleFromDirection = (dx: number, dz: number, fallback: number): number =>
  Math.hypot(dx, dz) > EPSILON ? Math.atan2(dx, dz) : fallback;

export function getRouteDuration(route: readonly MotionWaypoint[]): number {
  if (route.length === 0) return 0;
  return route.reduce(
    (sum, waypoint) => sum + Math.max(0, waypoint.travelSeconds) + (waypoint.holdSeconds ?? 0),
    0,
  );
}

/**
 * Estimate the world-space velocity at a waypoint. A real hold intentionally sets the
 * tangent to zero; otherwise a time-weighted central tangent keeps speed continuous
 * between adjacent route segments, including the small points that describe steering arcs.
 */
function waypointTangent(
  route: readonly MotionWaypoint[],
  index: number,
): [number, number, number] {
  if (index <= 0 || index >= route.length - 1) return ZERO;

  const current = route[index];
  const next = route[index + 1];
  // Stop at explicit waits and at forward/reverse gear changes; the vehicle should
  // settle before changing direction instead of snapping its heading mid-manoeuvre.
  if ((current.holdSeconds ?? 0) > 0) return ZERO;
  if ((current.reverse ?? false) !== (next.reverse ?? false)) return ZERO;

  const previous = route[index - 1];
  const beforeSeconds = Math.max(current.travelSeconds, 0.001);
  const afterSeconds = Math.max(next.travelSeconds, 0.001);
  const interval = beforeSeconds + afterSeconds;

  let vx = (next.position[0] - previous.position[0]) / interval;
  let vz = (next.position[2] - previous.position[2]) / interval;

  // Limit the tangent to the slower neighbouring segment so tight corners do not overshoot.
  const incomingSpeed = distanceXZ(previous.position, current.position) / beforeSeconds;
  const outgoingSpeed = distanceXZ(current.position, next.position) / afterSeconds;
  const maximumSpeed = Math.min(incomingSpeed, outgoingSpeed) * 1.12;
  const tangentSpeed = Math.hypot(vx, vz);
  if (tangentSpeed > maximumSpeed && tangentSpeed > EPSILON) {
    const scale = maximumSpeed / tangentSpeed;
    vx *= scale;
    vz *= scale;
  }

  return [vx, 0, vz];
}

function hermitePosition(
  start: MotionWaypoint["position"],
  end: MotionWaypoint["position"],
  startVelocity: [number, number, number],
  endVelocity: [number, number, number],
  duration: number,
  t: number,
): { position: [number, number, number]; derivative: [number, number, number] } {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const dh00 = 6 * t2 - 6 * t;
  const dh10 = 3 * t2 - 4 * t + 1;
  const dh01 = -6 * t2 + 6 * t;
  const dh11 = 3 * t2 - 2 * t;

  const position = [0, 1, 2].map((axis) =>
    h00 * start[axis] +
    h10 * startVelocity[axis] * duration +
    h01 * end[axis] +
    h11 * endVelocity[axis] * duration,
  ) as [number, number, number];

  const derivative = [0, 1, 2].map((axis) =>
    (dh00 * start[axis] +
      dh10 * startVelocity[axis] * duration +
      dh01 * end[axis] +
      dh11 * endVelocity[axis] * duration) /
    Math.max(duration, 0.001),
  ) as [number, number, number];

  return { position, derivative };
}

/**
 * Samples a route using cubic Hermite segments instead of easing every waypoint to a stop.
 * Intermediate steering points now share a continuous velocity and heading. Explicit holds
 * and forward/reverse gear changes deliberately bring a vehicle to a complete stop.
 */
export function sampleMotionRoute(
  route: readonly MotionWaypoint[],
  elapsedSeconds: number,
  loop = true,
): MotionPose {
  if (route.length === 0) return { position: [0, 0, 0], rotationY: 0, reverse: false };

  const initial = route[0];
  const totalDuration = getRouteDuration(route);
  if (totalDuration <= 0) {
    return { position: initial.position, rotationY: initial.rotationY, reverse: initial.reverse ?? false };
  }

  if (!loop && elapsedSeconds >= totalDuration) {
    const last = route[route.length - 1];
    return { position: last.position, rotationY: last.rotationY, reverse: last.reverse ?? false };
  }
  let remaining = loop
    ? ((elapsedSeconds % totalDuration) + totalDuration) % totalDuration
    : Math.max(0, elapsedSeconds);
  const initialHold = initial.holdSeconds ?? 0;
  if (remaining < initialHold || route.length === 1) {
    return { position: initial.position, rotationY: initial.rotationY, reverse: initial.reverse ?? false };
  }
  remaining -= initialHold;

  let previous = initial;
  for (let index = 1; index < route.length; index += 1) {
    const current = route[index];
    const travel = Math.max(0, current.travelSeconds);

    if (travel > 0 && remaining < travel) {
      const t = Math.max(0, Math.min(1, remaining / travel));
      const startVelocity = waypointTangent(route, index - 1);
      const endVelocity = waypointTangent(route, index);
      const sampled = hermitePosition(
        previous.position,
        current.position,
        startVelocity,
        endVelocity,
        travel,
        t,
      );
      const reverse = current.reverse ?? false;
      const fallbackMovementHeading = current.rotationY - (reverse ? Math.PI : 0);
      const movementHeading = angleFromDirection(
        sampled.derivative[0],
        sampled.derivative[2],
        fallbackMovementHeading,
      );

      return {
        position: sampled.position,
        rotationY: movementHeading + (reverse ? Math.PI : 0),
        reverse,
      };
    }

    remaining -= travel;
    const hold = current.holdSeconds ?? 0;
    if (remaining < hold) {
      return {
        position: current.position,
        rotationY: current.rotationY,
        reverse: current.reverse ?? false,
      };
    }
    remaining -= hold;
    previous = current;
  }

  const last = route[route.length - 1];
  return {
    position: loop ? initial.position : last.position,
    rotationY: loop ? initial.rotationY : last.rotationY,
    reverse: loop ? (initial.reverse ?? false) : (last.reverse ?? false),
  };
}
