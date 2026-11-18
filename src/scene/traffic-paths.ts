import { warehouseSceneData } from "./warehouse-scene-data";
import type { MotionWaypoint } from "./animations/motionTypes";
import type { WorldPoint } from "./warehouse-scene-data";

export const ROAD_Z = 22.5;
/** Front facade plane of the main distribution centre. */
export const WAREHOUSE_FRONT_Z =
  warehouseSceneData.layout.warehouse.position[2] + warehouseSceneData.layout.warehouse.size[2] / 2;
/**
 * Park truck centres far enough inside the facade that the entire truck model
 * (front bumper through rear doors) clears the doorway and remains within the
 * warehouse footprint. TruckModel's front-most point is local z=+3.35.
 */
export const DOCK_INTERIOR_Z = WAREHOUSE_FRONT_Z - 3.35 - 0.5;
export const ROAD_OUTBOUND_Z = 20.0;
export const ROAD_INBOUND_Z = 25.0;
export const YARD_TRUCK_SLOT: WorldPoint = [8.0, 0, 10.8];
export const YARD_TRUCK_PARK_SECONDS = 12;

interface ArcOptions {
  centerX: number;
  centerZ: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  travelSeconds: number;
  reverse?: boolean;
  segments?: number;
}

/** Build a short polyline arc. Multiple small steering changes create a broad, slow vehicle turn. */
function arcWaypoints({
  centerX,
  centerZ,
  radius,
  startAngle,
  endAngle,
  travelSeconds,
  reverse = false,
  segments = 7,
}: ArcOptions): MotionWaypoint[] {
  const direction = Math.sign(endAngle - startAngle) || 1;
  return Array.from({ length: segments }, (_, index) => {
    const progress = (index + 1) / segments;
    const angle = startAngle + (endAngle - startAngle) * progress;
    const x = centerX + radius * Math.cos(angle);
    const z = centerZ + radius * Math.sin(angle);
    const movementX = -Math.sin(angle) * direction;
    const movementZ = Math.cos(angle) * direction;
    const movementHeading = Math.atan2(movementX, movementZ);
    const rotationY = movementHeading + (reverse ? Math.PI : 0);
    return {
      position: [x, 0, z] as WorldPoint,
      rotationY,
      travelSeconds: travelSeconds / segments,
      reverse,
    };
  });
}

/**
 * Each dock truck drives forward out of its bay, follows a broad 90-degree turn,
 * makes a wide perimeter U-turn, then performs a three-point reverse manoeuvre
 * to line up with its original dock before reversing into the bay.
 */
function createDockTruckRoute(dockPosition: WorldPoint): MotionWaypoint[] {
  const x = dockPosition[0];
  // The parked centre is inside the warehouse. The truck's 3.35-unit nose
  // ends 0.5 units behind the facade plane when it is fully docked.
  const dockZ = DOCK_INTERIOR_Z;
  const forecourtZ = WAREHOUSE_FRONT_Z + 8.1;
  const turnStartZ = 14.5;
  const outboundTurnRadius = ROAD_OUTBOUND_Z - turnStartZ;
  const outerX = 31.5;
  const roadUTurnRadius = (ROAD_INBOUND_Z - ROAD_OUTBOUND_Z) / 2;

  // Return from the inbound lane to a staging point well in front of the facade.
  // A broad semicircle then turns the truck around entirely outside the building;
  // the final straight segment reverses through the dock opening.
  const dockTurnRadius = 3.15;
  const reverseApproachX = x - dockTurnRadius * 2;
  const approachTurnRadius = 3.0;
  const returnLaneStartX = reverseApproachX + approachTurnRadius;
  const approachCornerZ = ROAD_INBOUND_Z - approachTurnRadius;

  return [
    { position: [x, 0, dockZ], rotationY: 0, travelSeconds: 0, holdSeconds: 4.5 },
    // Leave the dock straight before beginning the wide turn onto the road.
    { position: [x, 0, turnStartZ], rotationY: 0, travelSeconds: 3.1 },
    ...arcWaypoints({
      centerX: x + outboundTurnRadius,
      centerZ: turnStartZ,
      radius: outboundTurnRadius,
      startAngle: Math.PI,
      endAngle: Math.PI / 2,
      travelSeconds: 4.2,
      segments: 12,
    }),
    { position: [outerX, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 7.8 },
    // Wide road-end turn keeps the truck inside the marked carriageway.
    ...arcWaypoints({
      centerX: outerX,
      centerZ: ROAD_Z,
      radius: roadUTurnRadius,
      startAngle: -Math.PI / 2,
      endAngle: Math.PI / 2,
      travelSeconds: 5.8,
      segments: 14,
    }),
    { position: [returnLaneStartX, 0, ROAD_INBOUND_Z], rotationY: -Math.PI / 2, travelSeconds: 8.0 },
    // Quarter-turn from the inbound lane into a dedicated dock approach aisle.
    ...arcWaypoints({
      centerX: returnLaneStartX,
      centerZ: approachCornerZ,
      radius: approachTurnRadius,
      startAngle: Math.PI / 2,
      endAngle: Math.PI,
      travelSeconds: 3.4,
      segments: 10,
    }),
    { position: [reverseApproachX, 0, forecourtZ], rotationY: -Math.PI, travelSeconds: 3.8, holdSeconds: 0.5 },
    // A 180-degree forward turn stays wholly on the apron. Its exit is centred
    // on the dock, with the cab facing outward and the rear ready to reverse in.
    ...arcWaypoints({
      centerX: x - dockTurnRadius,
      centerZ: forecourtZ,
      radius: dockTurnRadius,
      startAngle: Math.PI,
      endAngle: Math.PI * 2,
      travelSeconds: 5.8,
      segments: 18,
    }),
    {
      position: [x, 0, dockZ],
      rotationY: 0,
      travelSeconds: 6.1,
      holdSeconds: 6.0,
      reverse: true,
    },
  ];
}

const dockRoutes: Record<string, MotionWaypoint[]> = Object.fromEntries(
  warehouseSceneData.trucks
    .filter((truck) => truck.currentDockId)
    .map((truck) => [
      truck.id,
      createDockTruckRoute(warehouseSceneData.layout.dockPositions[truck.currentDockId!]),
    ]),
);

/** Road-arriving truck enters an open slot, waits, reverses out, then exits the road and despawns. */
export const yardTruckRoute: MotionWaypoint[] = [
  { position: [-35, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 0, holdSeconds: 1.8 },
  { position: [YARD_TRUCK_SLOT[0] - 2.5, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 10.0 },
  // Forward right-hand curve from the access lane into the parking aisle.
  ...arcWaypoints({
    centerX: YARD_TRUCK_SLOT[0] - 2.5,
    centerZ: YARD_TRUCK_SLOT[2] + 6.7,
    radius: 2.5,
    startAngle: Math.PI / 2,
    endAngle: 0,
    travelSeconds: 2.8,
  }),
  { position: [YARD_TRUCK_SLOT[0], 0, 13.0], rotationY: Math.PI, travelSeconds: 1.4 },
  { position: YARD_TRUCK_SLOT, rotationY: Math.PI, travelSeconds: 0.9, holdSeconds: YARD_TRUCK_PARK_SECONDS },
  // Reverse out of the slot and rejoin the outbound road lane.
  { position: [YARD_TRUCK_SLOT[0], 0, YARD_TRUCK_SLOT[2] + 6.7], rotationY: Math.PI, travelSeconds: 2.9, reverse: true },
  ...arcWaypoints({
    centerX: YARD_TRUCK_SLOT[0] - 2.5,
    centerZ: YARD_TRUCK_SLOT[2] + 6.7,
    radius: 2.5,
    startAngle: 0,
    endAngle: Math.PI / 2,
    travelSeconds: 2.8,
    reverse: true,
  }),
  { position: [35, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 8.5 },
  // Leave the visible road completely, then despawn (no teleport back to the start).
  { position: [43, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 2.2 },
];

export const truckRoutes: Record<string, MotionWaypoint[]> = {
  ...dockRoutes,
  "truck-04": yardTruckRoute,
};

export const truckRouteDelays: Record<string, number> = {
  "truck-01": 0,
  "truck-02": 10,
  "truck-03": 20,
  "truck-04": 15.4,
};

const forkliftA = warehouseSceneData.layout.forkliftPositions["forklift-01"];
const forkliftB = warehouseSceneData.layout.forkliftPositions["forklift-02"];

/** Forklifts drive up to a work position and reverse out without spinning in place. */
export const forkliftRoutes: Record<string, MotionWaypoint[]> = {
  "forklift-01": [
    { position: forkliftA, rotationY: 0, travelSeconds: 0, holdSeconds: 2.8 },
    { position: [forkliftA[0], 0, forkliftA[2] + 2.4], rotationY: 0, travelSeconds: 2.8, holdSeconds: 1.1 },
    { position: forkliftA, rotationY: 0, travelSeconds: 2.9, holdSeconds: 1.4, reverse: true },
  ],
  "forklift-02": [
    { position: forkliftB, rotationY: Math.PI, travelSeconds: 0, holdSeconds: 2.1 },
    { position: [forkliftB[0], 0, forkliftB[2] - 2.0], rotationY: Math.PI, travelSeconds: 2.6, holdSeconds: 0.8 },
    { position: forkliftB, rotationY: Math.PI, travelSeconds: 2.6, holdSeconds: 1.4, reverse: true },
  ],
};

export const carRoutes: Record<string, MotionWaypoint[]> = {
  // Cars share the two road lane centre-lines with trucks and make one pass before
  // despawning beyond the road ends. Additional delayed instances keep traffic intermittent.
  "road-car-01": [
    { position: [-41, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 0 },
    { position: [42, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 27.5 },
  ],
  "road-car-02": [
    { position: [42, 0, ROAD_INBOUND_Z], rotationY: -Math.PI / 2, travelSeconds: 0 },
    { position: [-42, 0, ROAD_INBOUND_Z], rotationY: -Math.PI / 2, travelSeconds: 27.5 },
  ],
  "road-car-03": [
    { position: [-41, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 0 },
    { position: [42, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 27.5 },
  ],
  "road-car-04": [
    { position: [42, 0, ROAD_INBOUND_Z], rotationY: -Math.PI / 2, travelSeconds: 0 },
    { position: [-42, 0, ROAD_INBOUND_Z], rotationY: -Math.PI / 2, travelSeconds: 27.5 },
  ],
  "road-car-05": [
    { position: [-41, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 0 },
    { position: [42, 0, ROAD_OUTBOUND_Z], rotationY: Math.PI / 2, travelSeconds: 27.5 },
  ],
  "road-car-06": [
    { position: [42, 0, ROAD_INBOUND_Z], rotationY: -Math.PI / 2, travelSeconds: 0 },
    { position: [-42, 0, ROAD_INBOUND_Z], rotationY: -Math.PI / 2, travelSeconds: 27.5 },
  ],
};

/** Short pedestrian walk loops stay on the marked footpaths and clear of vehicle lanes. */
export const workerRoutes: Record<string, MotionWaypoint[]> = {
  "worker-01": [
    { position: [-9.7, 0, 7.0], rotationY: -Math.PI / 2, travelSeconds: 0, holdSeconds: 1.2 },
    { position: [-13.0, 0, 7.0], rotationY: -Math.PI / 2, travelSeconds: 3.4, holdSeconds: 0.8 },
    { position: [-13.0, 0, 11.0], rotationY: 0, travelSeconds: 3.8, holdSeconds: 1.1 },
    { position: [-9.7, 0, 11.0], rotationY: Math.PI / 2, travelSeconds: 3.4, holdSeconds: 0.7 },
    { position: [-9.7, 0, 7.0], rotationY: Math.PI, travelSeconds: 3.8 },
    { position: [-9.7, 0, 7.0], rotationY: -Math.PI / 2, travelSeconds: 0.55 },
  ],
  "worker-02": [
    { position: [12.0, 0, 3.4], rotationY: Math.PI / 2, travelSeconds: 0, holdSeconds: 2.2 },
    { position: [15.3, 0, 3.4], rotationY: Math.PI / 2, travelSeconds: 3.5, holdSeconds: 0.8 },
    { position: [15.3, 0, 7.4], rotationY: 0, travelSeconds: 4.0, holdSeconds: 0.8 },
    { position: [12.0, 0, 7.4], rotationY: -Math.PI / 2, travelSeconds: 3.5, holdSeconds: 1.2 },
    { position: [12.0, 0, 3.4], rotationY: Math.PI, travelSeconds: 4.0 },
    { position: [12.0, 0, 3.4], rotationY: Math.PI / 2, travelSeconds: 0.55 },
  ],
  "worker-03": [
    { position: [-21.5, 0, -5.2], rotationY: 0, travelSeconds: 0, holdSeconds: 3.2 },
    { position: [-21.5, 0, -9.5], rotationY: Math.PI, travelSeconds: 4.0, holdSeconds: 1.0 },
    { position: [-23.0, 0, -9.5], rotationY: -Math.PI / 2, travelSeconds: 1.8, holdSeconds: 0.8 },
    { position: [-23.0, 0, -5.2], rotationY: 0, travelSeconds: 4.0, holdSeconds: 1.0 },
    { position: [-21.5, 0, -5.2], rotationY: Math.PI / 2, travelSeconds: 1.8 },
    { position: [-21.5, 0, -5.2], rotationY: 0, travelSeconds: 0.55 },
  ],
  "worker-04": [
    { position: [17.0, 0, -6.0], rotationY: Math.PI / 2, travelSeconds: 0, holdSeconds: 1.6 },
    { position: [20.0, 0, -6.0], rotationY: Math.PI / 2, travelSeconds: 3.2, holdSeconds: 0.8 },
    { position: [20.0, 0, -2.0], rotationY: 0, travelSeconds: 4.0, holdSeconds: 1.0 },
    { position: [17.0, 0, -2.0], rotationY: -Math.PI / 2, travelSeconds: 3.2, holdSeconds: 0.8 },
    { position: [17.0, 0, -6.0], rotationY: Math.PI, travelSeconds: 4.0 },
    { position: [17.0, 0, -6.0], rotationY: Math.PI / 2, travelSeconds: 0.55 },
  ],
  "worker-05": [
    { position: [-22.0, 0, 1.2], rotationY: 0, travelSeconds: 0, holdSeconds: 2.0 },
    { position: [-22.0, 0, 5.0], rotationY: 0, travelSeconds: 3.4, holdSeconds: 0.8 },
    { position: [-20.0, 0, 5.0], rotationY: Math.PI / 2, travelSeconds: 2.2, holdSeconds: 0.9 },
    { position: [-20.0, 0, 1.2], rotationY: Math.PI, travelSeconds: 3.4, holdSeconds: 0.8 },
    { position: [-22.0, 0, 1.2], rotationY: -Math.PI / 2, travelSeconds: 2.2 },
    { position: [-22.0, 0, 1.2], rotationY: 0, travelSeconds: 0.55 },
  ],
};
