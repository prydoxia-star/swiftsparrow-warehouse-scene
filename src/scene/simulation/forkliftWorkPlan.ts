import type { MotionPose } from "../animations/motionTypes";
import type { WorldPoint } from "../warehouse-scene-data";

export const FORKLIFT_WORK_CYCLE_SECONDS = 40;

export interface ForkliftWorkKeyframe extends MotionPose {
  time: number;
  forkHeight: number;
}

export interface ForkliftWorkSample extends MotionPose {
  forkHeight: number;
  carrying: boolean;
  rackStoredBoxVisible: boolean;
  rackPickupBoxVisible: boolean;
  stagedBoxVisible: boolean;
  transferBoxPosition: WorldPoint | null;
}

const frames: ForkliftWorkKeyframe[] = [
  { time: 0, position: [-12.8, 0, -6.4], rotationY: -Math.PI / 2, reverse: false, forkHeight: 0.12 },
  { time: 3.2, position: [-15.6, 0, -6.4], rotationY: -Math.PI / 2, reverse: false, forkHeight: 0.12 },
  { time: 4.7, position: [-17.7, 0, -6.0], rotationY: -Math.PI / 3, reverse: false, forkHeight: 0.12 },
  { time: 6.2, position: [-18.45, 0, -5.0], rotationY: 0, reverse: false, forkHeight: 0.12 },
  { time: 7.4, position: [-18.45, 0, -5.0], rotationY: 0, reverse: false, forkHeight: 1.15 },
  { time: 10.7, position: [-18.45, 0, -5.0], rotationY: 0, reverse: false, forkHeight: 1.15 },
  { time: 12.0, position: [-18.45, 0, -5.0], rotationY: 0, reverse: false, forkHeight: 0.12 },
  { time: 14.0, position: [-18.45, 0, -7.4], rotationY: 0, reverse: true, forkHeight: 0.12 },
  { time: 15.4, position: [-17.8, 0, -8.0], rotationY: 2.35, reverse: false, forkHeight: 0.12 },
  { time: 16.9, position: [-16.3, 0, -8.0], rotationY: Math.PI / 2, reverse: false, forkHeight: 0.12 },
  { time: 18.6, position: [-14.0, 0, -8.0], rotationY: Math.PI / 2, reverse: false, forkHeight: 0.12 },
  { time: 20.1, position: [-13.95, 0, -6.6], rotationY: 0, reverse: false, forkHeight: 0.12 },
  { time: 21.6, position: [-13.95, 0, -5.0], rotationY: 0, reverse: false, forkHeight: 0.12 },
  { time: 22.7, position: [-13.95, 0, -5.0], rotationY: 0, reverse: false, forkHeight: 1.15 },
  { time: 24.8, position: [-13.95, 0, -5.0], rotationY: 0, reverse: false, forkHeight: 1.15 },
  { time: 25.8, position: [-13.95, 0, -5.0], rotationY: 0, reverse: false, forkHeight: 0.12 },
  { time: 27.1, position: [-13.95, 0, -7.4], rotationY: 0, reverse: true, forkHeight: 0.12 },
  { time: 28.4, position: [-14.6, 0, -8.0], rotationY: -2.35, reverse: false, forkHeight: 0.12 },
  { time: 29.8, position: [-16.2, 0, -8.0], rotationY: -Math.PI / 2, reverse: false, forkHeight: 0.12 },
  { time: 31.9, position: [-18.8, 0, -8.0], rotationY: -Math.PI / 2, reverse: false, forkHeight: 0.12 },
  { time: 34.0, position: [-18.8, 0, -8.0], rotationY: -Math.PI / 2, reverse: false, forkHeight: 0.12 },
  // The forklift backs out along the aisle, returning to its original heading and position.
  { time: 36.0, position: [-16.5, 0, -7.2], rotationY: -2.05, reverse: true, forkHeight: 0.12 },
  { time: 40.0, position: [-12.8, 0, -6.4], rotationY: -Math.PI / 2, reverse: true, forkHeight: 0.12 },
];

// Match the centre of the first and third RACK-A bays so cartons land inside shelf frames.
const rackStoredBox: WorldPoint = [-18.45, 1.93, -2.8];
const rackPickupBox: WorldPoint = [-13.95, 1.93, -2.8];
const stagingBox: WorldPoint = [-21.35, 0.53, -8.0];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function angleDelta(from: number, to: number): number {
  return ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

function mixPoint(a: WorldPoint, b: WorldPoint, t: number): WorldPoint {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function forkWorldPosition(frame: ForkliftWorkKeyframe | MotionPose, forkHeight: number): WorldPoint {
  const reach = 2.12;
  return [
    frame.position[0] + Math.sin(frame.rotationY) * reach,
    0.78 + forkHeight,
    frame.position[2] + Math.cos(frame.rotationY) * reach,
  ];
}

function poseAt(time: number): ForkliftWorkKeyframe {
  let nextIndex = frames.findIndex((frame) => frame.time >= time);
  if (nextIndex < 0) nextIndex = frames.length - 1;
  if (nextIndex === 0) return frames[0];
  const previous = frames[nextIndex - 1];
  const next = frames[nextIndex];
  const progress = ease((time - previous.time) / Math.max(0.001, next.time - previous.time));
  return {
    time,
    position: mixPoint(previous.position, next.position, progress),
    rotationY: previous.rotationY + angleDelta(previous.rotationY, next.rotationY) * progress,
    reverse: next.reverse,
    forkHeight: previous.forkHeight + (next.forkHeight - previous.forkHeight) * progress,
  };
}

/** Pure work-cycle simulation: drive to a rack, put a carton away, retrieve another, and stage it. */
export function sampleForkliftWorkCycle(elapsedSeconds: number): ForkliftWorkSample {
  const time = ((elapsedSeconds % FORKLIFT_WORK_CYCLE_SECONDS) + FORKLIFT_WORK_CYCLE_SECONDS) % FORKLIFT_WORK_CYCLE_SECONDS;
  const pose = poseAt(time);
  const carrying = time < 9.25 || (time >= 25.0 && time < 32.7);
  let transferBoxPosition: WorldPoint | null = null;

  if (time >= 9.25 && time < 10.7) {
    const progress = ease((time - 9.25) / 1.45);
    transferBoxPosition = mixPoint(forkWorldPosition(pose, pose.forkHeight), rackStoredBox, progress);
  } else if (time >= 23.25 && time < 25.0) {
    const progress = ease((time - 23.25) / 1.75);
    transferBoxPosition = mixPoint(rackPickupBox, forkWorldPosition(pose, pose.forkHeight), progress);
  } else if (time >= 32.7 && time < 34.0) {
    const progress = ease((time - 32.7) / 1.3);
    transferBoxPosition = mixPoint(forkWorldPosition(pose, pose.forkHeight), stagingBox, progress);
  }

  return {
    ...pose,
    carrying,
    rackStoredBoxVisible: time >= 10.7,
    rackPickupBoxVisible: time < 23.25,
    stagedBoxVisible: time >= 34.0,
    transferBoxPosition,
  };
}

export const forkliftWorkLayout = {
  rackStoredBox,
  rackPickupBox,
  stagingBox,
  stagingPallet: [-21.35, 0, -8.0] as WorldPoint,
};
