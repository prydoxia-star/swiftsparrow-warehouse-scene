import { memo, useMemo, type MutableRefObject } from "react";
import { ContactShadows, Grid, SoftShadows } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { InventoryItem, Truck } from "../data";
import type { CameraControlsApi } from "./CameraRig";
import { SelectableObject } from "./SelectableObject";
import { TruckModel } from "./models/TruckModel";
import { CarModel } from "./models/CarModel";
import { WorkerModel } from "./models/WorkerModel";
import { LivingYard } from "./LivingYard";
import { ForkliftModel } from "./models/ForkliftModel";
import { DockModel } from "./models/DockModel";
import { DockShutter } from "./models/DockShutter";
import { TreeModel } from "./models/TreeModel";
import { PalletModel, StorageCarton, StorageRackFrame } from "./models/StorageModels";
import type { WarehouseEntitySelection } from "../store/warehouseStore";
import { CameraRig } from "./CameraRig";
import { RouteMotion } from "./animations/RouteMotion";
import { ForkliftWorkMotion } from "./simulation/ForkliftWorkMotion";
import { carRoutes, forkliftRoutes, truckRouteDelays, truckRoutes, workerRoutes, DOCK_INTERIOR_Z, WAREHOUSE_FRONT_Z } from "./traffic-paths";
import {
  warehouseSceneData,
  type RackLayout,
  type WorldPoint,
  type WorldSize,
} from "./warehouse-scene-data";

const palette = {
  ground: "#dedfe0",
  building: "#c9cbcd",
  buildingLight: "#e0e1e2",
  glass: "#92999e",
  wheel: "#666b70",
  crate: "#bfc2c4",
};

function Block({
  position,
  size,
  color,
  castShadow = true,
  receiveShadow = true,
}: {
  position: WorldPoint;
  size: WorldSize;
  color: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  return (
    <mesh position={position} castShadow={castShadow} receiveShadow={receiveShadow}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.88} flatShading />
    </mesh>
  );
}

function Cylinder({
  position,
  radius,
  height,
  color,
  rotation = [0, 0, 0],
  segments = 8,
}: {
  position: WorldPoint;
  radius: number;
  height: number;
  color: string;
  rotation?: [number, number, number];
  segments?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, segments]} />
      <meshStandardMaterial color={color} roughness={0.9} flatShading />
    </mesh>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[76, 60]} />
        <meshStandardMaterial color={palette.ground} roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.015, 0]}
        args={[76, 60]}
        cellSize={1}
        cellThickness={0.35}
        cellColor="#c6c9cb"
        sectionSize={5}
        sectionThickness={0.7}
        sectionColor="#b8bbbe"
        fadeDistance={64}
        fadeStrength={1}
        infiniteGrid={false}
      />
      <Block position={[0, 0.005, 22.5]} size={[76, 0.01, 13.2]} color="#c5c8ca" />
      {Array.from({ length: 18 }, (_, i) => (
        <Block
          key={`road-mark-${i}`}
          position={[-24 + i * 2.8, 0.022, 22.5]}
          size={[1.45, 0.02, 0.12]}
          color="#eeeeef"
          castShadow={false}
        />
      ))}
      {[-8.5, -2.4, 3.7].map((x) => (
        <group key={`yard-bay-${x}`}>
          <Block position={[x, 0.025, 10.3]} size={[0.09, 0.02, 6.4]} color="#f0f1f1" castShadow={false} />
          <Block position={[x + 4.8, 0.025, 10.3]} size={[0.09, 0.02, 6.4]} color="#f0f1f1" castShadow={false} />
          <Block position={[x + 2.4, 0.025, 7.1]} size={[4.9, 0.02, 0.09]} color="#f0f1f1" castShadow={false} />
        </group>
      ))}
      {/* The yard-truck staging area is intentionally unmarked to keep this apron visually clear. */}
      {/* Road shoulder lines and a broken centre marking add scale to the traffic lanes. */}
      <Block position={[0, 0.021, 16.0]} size={[76, 0.018, 0.08]} color="#eceeef" castShadow={false} />
      <Block position={[0, 0.021, 29.0]} size={[76, 0.018, 0.08]} color="#eceeef" castShadow={false} />
    </>
  );
}

function WarehouseBuilding({
  position,
  size,
  dockPositions,
}: {
  position: WorldPoint;
  size: WorldSize;
  dockPositions: Record<string, WorldPoint>;
}) {
  const [width, height, depth] = size;
  const leftX = position[0] - width / 2;
  const rightX = position[0] + width / 2;
  const backZ = position[2] - depth / 2;
  const frontZ = WAREHOUSE_FRONT_Z;
  const wallThickness = 0.34;
  const doorWidth = 3.9;
  const clearDoorHeight = 3.9;
  const roofY = position[1] + height / 2 + 0.18;
  const dockEntries = Object.entries(dockPositions).sort((a, b) => a[1][0] - b[1][0]);

  // Build the warehouse as an actual shell with open loading apertures. A single
  // solid box here made trucks appear to stop outside even when their route entered.
  const frontWallSegments: Array<{ centerX: number; segmentWidth: number }> = [];
  let wallCursor = leftX;
  for (const [, dockPosition] of dockEntries) {
    const openingLeft = dockPosition[0] - doorWidth / 2;
    const openingRight = dockPosition[0] + doorWidth / 2;
    if (openingLeft > wallCursor) {
      frontWallSegments.push({ centerX: (wallCursor + openingLeft) / 2, segmentWidth: openingLeft - wallCursor });
    }
    wallCursor = openingRight;
  }
  if (wallCursor < rightX) {
    frontWallSegments.push({ centerX: (wallCursor + rightX) / 2, segmentWidth: rightX - wallCursor });
  }

  return (
    <group>
      {/* Continuous interior floor and three surrounding walls. */}
      <Block position={[position[0], 0.012, position[2]]} size={[width - 0.35, 0.024, depth - 0.35]} color="#bfc3c5" />
      <Block position={[position[0], position[1], backZ + wallThickness / 2]} size={[width, height, wallThickness]} color={palette.building} />
      <Block position={[leftX + wallThickness / 2, position[1], position[2]]} size={[wallThickness, height, depth]} color={palette.building} />
      <Block position={[rightX - wallThickness / 2, position[1], position[2]]} size={[wallThickness, height, depth]} color={palette.building} />

      {/* Front facade segments stop at each real truck aperture. */}
      {frontWallSegments.map((segment, index) => (
        <Block
          key={`front-wall-${index}`}
          position={[segment.centerX, position[1], frontZ - wallThickness / 2]}
          size={[segment.segmentWidth, height, wallThickness]}
          color={palette.building}
        />
      ))}

      {/* Solid lintels sit above each opening; the full 3.9-unit clear height
          comfortably exceeds the truck's 3.42-unit model height. */}
      {dockEntries.map(([dockId, dockPosition]) => (
        <group key={`loading-door-${dockId}`}>
          <Block
            position={[dockPosition[0], (clearDoorHeight + height) / 2, frontZ - wallThickness / 2]}
            size={[doorWidth, height - clearDoorHeight, wallThickness]}
            color={palette.building}
          />
          <Block
            position={[dockPosition[0], clearDoorHeight / 2, frontZ - wallThickness - 0.025]}
            size={[doorWidth - 0.12, clearDoorHeight - 0.08, 0.035]}
            color="#535b60"
            castShadow={false}
          />
          <DockShutter dockId={dockId} x={dockPosition[0]} z={frontZ + 0.08} />
        </group>
      ))}

      {/* Cutaway roof: a rear roof deck plus slim side wings keeps the warehouse
          recognisable while making the interior and fully-entered vehicles visible. */}
      <Block
        position={[position[0], roofY, backZ + 3.65]}
        size={[width + 0.65, 0.36, 6.95]}
        color={palette.buildingLight}
      />
      <Block
        position={[leftX + 0.95, roofY, position[2]]}
        size={[1.9, 0.36, depth + 0.65]}
        color={palette.buildingLight}
      />
      <Block
        position={[rightX - 0.95, roofY, position[2]]}
        size={[1.9, 0.36, depth + 0.65]}
        color={palette.buildingLight}
      />

      {/* Roof vents are placed only on the retained rear roof deck. */}
      {[-7.4, -3.6, 0.2, 4.0].map((x, index) => (
        <group key={`roof-vent-${index}`} position={[x, roofY + 0.31, backZ + 2.0 + (index % 2) * 2.8]}>
          <Block position={[0, 0.18, 0]} size={[1.35, 0.32, 0.95]} color="#aeb2b5" />
          <Block position={[0, 0.37, 0]} size={[1.58, 0.08, 1.15]} color="#e5e6e7" />
        </group>
      ))}

      {/* Front upper glazing remains above the dock lintels. */}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={`front-window-${i}`}>
          <Block position={[-8.6 + i * 2.35, 4.55, frontZ + 0.04]} size={[1.72, 0.48, 0.07]} color={palette.glass} />
          <Block position={[-8.6 + i * 2.35, 4.55, frontZ + 0.085]} size={[0.055, 0.48, 0.035]} color="#dfe1e2" />
        </group>
      ))}

      {/* Left-side office glazing and trim. */}
      <Block position={[-9.55, 2.45, frontZ + 0.08]} size={[2.15, 1.12, 0.12]} color={palette.glass} />
      {Array.from({ length: 3 }, (_, i) => (
        <Block key={`entry-window-${i}`} position={[-10.2 + i * 0.65, 2.45, frontZ + 0.16]} size={[0.07, 1.12, 0.06]} color="#dfe1e2" />
      ))}
      <Block position={[-9.55, 3.05, frontZ + 0.16]} size={[2.35, 0.12, 0.12]} color="#e1e2e3" />
      <Block position={[-9.55, 1.86, frontZ + 0.16]} size={[2.35, 0.12, 0.12]} color="#e1e2e3" />

      {Array.from({ length: 8 }, (_, i) => (
        <Block
          key={`side-window-${i}`}
          position={[rightX + 0.08, 4.25, position[2] - 5.0 + i * 1.25]}
          size={[0.08, 0.46, 0.92]}
          color={palette.glass}
        />
      ))}
    </group>
  );
}

function RackRow({
  zoneCode,
  rack,
  inventory,
  selectedEntityId,
  onSelect,
}: {
  zoneCode: string;
  rack: RackLayout;
  inventory: InventoryItem[];
  selectedEntityId: string | null;
  onSelect: (entity: WarehouseEntitySelection) => void;
}) {
  const { bays, levels, bayWidth, depth, position } = rack;
  const rackWidth = bays * bayWidth;
  const storageItems = inventory.filter(
    (item) =>
      item.location.kind === "storage" &&
      item.location.zoneCode === zoneCode &&
      // These two RACK-A cartons are animated by the forklift work simulation.
      !(zoneCode === "RACK-A" && (item.id === "item-001" || item.id === "item-003")),
  );

  return (
    <group position={position}>
      <StorageRackFrame rack={rack} />
      {storageItems.map((item, index) => {
        const bay = index % bays;
        const level = 1 + (index % Math.max(1, levels - 1));
        const x = -rackWidth / 2 + bayWidth * (bay + 0.5);
        const y = 0.56 + level * 1.05;
        const width = item.category === "medical_equipment" ? 1.38 : 1.12;
        const height = item.category === "medical_equipment" ? 0.72 : 0.58;
        const cartonSize: WorldSize = [width, height, depth * 0.64];
        return (
          <SelectableObject
            key={item.id}
            entity={{ id: item.id, kind: "inventory_item", name: item.name }}
            selectedEntityId={selectedEntityId}
            onSelect={onSelect}
            bounds={{ center: [x, y + height / 2, 0], size: [width + 0.2, height + 0.16, depth * 0.72] }}
          >
            <StorageCarton
              position={[x, y, 0]}
              size={cartonSize}
              tone={item.condition === "damaged" ? "#a9afb2" : index % 2 === 0 ? "#c9cdd0" : "#d5d8da"}
              variant={index}
            />
          </SelectableObject>
        );
      })}
    </group>
  );
}

function BoundaryFence() {
  const fenceZ = 15.9;
  const gateEdge = 10.5;
  const gateStart = 20.5;
  const gateWidth = 3.5;
  return (
    <group>
      {/* Front fence rails stop at the dedicated right-hand gate panel. */}
      {[-24, -20.5, -17, -13.5, -gateEdge, gateEdge, 13.5, 17, gateStart, 24].map((x) => (
        <group key={`fence-post-${x}`} position={[x, 0, fenceZ]}>
          <Block position={[0, 1.1, 0]} size={[0.16, 2.2, 0.16]} color="#aeb2b5" />
          <Block position={[0, 2.22, 0]} size={[0.24, 0.08, 0.24]} color="#969da1" />
        </group>
      ))}
      {[-1, 1].map((side) => {
        const spanEnd = side === 1 ? gateStart : -gateEdge;
        const spanStart = side === 1 ? gateEdge : -24;
        const span = spanEnd - spanStart;
        const centerX = (spanStart + spanEnd) / 2;
        return (
          <group key={`fence-span-${side}`}>
            <Block position={[centerX, 1.92, fenceZ]} size={[span, 0.12, 0.1]} color="#aeb2b5" />
            <Block position={[centerX, 0.35, fenceZ]} size={[span, 0.12, 0.1]} color="#aeb2b5" />
            {Array.from({ length: Math.max(2, Math.floor(span / 1.35)) }, (_, index) => {
              const x = spanStart + ((index + 1) / (Math.floor(span / 1.35) + 1)) * span;
              return (
                <Block
                  key={`fence-mesh-${side}-${index}`}
                  position={[x, 1.1, fenceZ]}
                  size={[0.035, 1.45, 0.07]}
                  color="#c4c7c9"
                />
              );
            })}
          </group>
        );
      })}

      {/* Static sliding-style mesh gate forms a finished end section of the fence. */}
      <group position={[gateStart + gateWidth / 2, 0, fenceZ]}>
        <Block position={[0, 1.94, 0]} size={[gateWidth, 0.11, 0.11]} color="#92999e" />
        <Block position={[0, 0.28, 0]} size={[gateWidth, 0.11, 0.11]} color="#92999e" />
        <Block position={[0, 1.1, 0]} size={[gateWidth, 0.09, 0.09]} color="#a6adb1" />
        {[-gateWidth / 2 + 0.08, gateWidth / 2 - 0.08].map((x) => (
          <Block key={`gate-upright-${x}`} position={[x, 1.1, 0]} size={[0.11, 1.8, 0.12]} color="#858d92" />
        ))}
        {Array.from({ length: 13 }, (_, index) => (
          <Block
            key={`gate-mesh-${index}`}
            position={[-1.55 + index * 0.258, 1.1, 0]}
            size={[0.035, 1.5, 0.065]}
            color="#bfc4c7"
          />
        ))}
        <mesh position={[0, 1.1, 0.015]} rotation={[0, 0, 0.43]} castShadow>
          <boxGeometry args={[gateWidth - 0.25, 0.075, 0.075]} />
          <meshStandardMaterial color="#92999e" roughness={0.88} flatShading />
        </mesh>
        {/* Hinges and latch make the final panel read clearly as a gate. */}
        <Block position={[-1.66, 0.48, -0.085]} size={[0.16, 0.22, 0.15]} color="#737b80" />
        <Block position={[-1.66, 1.68, -0.085]} size={[0.16, 0.22, 0.15]} color="#737b80" />
        <Block position={[1.62, 1.05, -0.09]} size={[0.11, 0.32, 0.14]} color="#737b80" />
        {[-1.35, 1.35].map((x) => (
          <Cylinder key={`gate-roller-${x}`} position={[x, 0.16, 0]} radius={0.12} height={0.12} color="#70777c" rotation={[Math.PI / 2, 0, 0]} segments={8} />
        ))}
      </group>

      {[-24, 24].map((x) => (
        <group key={`side-fence-${x}`}>
          <Block position={[x, 1.05, 0]} size={[0.12, 2.1, 31.8]} color="#aeb2b5" />
          {Array.from({ length: 10 }, (_, i) => (
            <Block key={i} position={[x, 1.05, -15 + i * 3.3]} size={[0.16, 2.2, 0.16]} color="#aeb2b5" />
          ))}
        </group>
      ))}
    </group>
  );
}

function Trees({
  selectedEntityId,
  onSelect,
}: {
  selectedEntityId: string | null;
  onSelect: (entity: WarehouseEntitySelection) => void;
}) {
  const positions: WorldPoint[] = [
    [-22, 0, -12], [-19.5, 0, -12.5], [20, 0, -12.4], [22.6, 0, -8.5], [20.5, 0, 12.4],
  ];
  return (
    <>
      {positions.map((position, index) => (
        <SelectableObject
          key={`tree-${index}`}
          entity={{ id: `tree-${index + 1}`, kind: "tree", name: `Yard tree ${index + 1}` }}
          selectedEntityId={selectedEntityId}
          onSelect={onSelect}
          bounds={{ center: [position[0], 2.25, position[2]], size: [2.6, 4.7, 2.6] }}
        >
          <TreeModel position={position} variant={index} />
        </SelectableObject>
      ))}
    </>
  );
}

function YardLamps({
  selectedEntityId,
  onSelect,
}: {
  selectedEntityId: string | null;
  onSelect: (entity: WarehouseEntitySelection) => void;
}) {
  // Eight low-poly streetlights sit just outside the two road shoulders.
  // Their inward-facing cantilevers light the lanes without entering vehicle footprints.
  const posts = [-20, -7, 7, 20].flatMap((x) => [
    { x, z: 16.8, direction: 1 },
    { x, z: 28.2, direction: -1 },
  ]);

  return (
    <>
      {posts.map(({ x, z, direction }, index) => (
        <SelectableObject
          key={`lamp-${index + 1}`}
          entity={{ id: `yard-lamp-${index + 1}`, kind: "yard_lamp", name: `Road lamp ${index + 1}` }}
          selectedEntityId={selectedEntityId}
          onSelect={onSelect}
          bounds={{ center: [x, 2.55, z + direction * 0.4], size: [1.35, 5.35, 2.05] }}
        >
          <group position={[x, 0, z]}>
            {/* Wide foot plate and tapered-looking faceted mast. */}
            <Cylinder position={[0, 0.14, 0]} radius={0.24} height={0.28} color="#858c91" segments={6} />
            <Cylinder position={[0, 0.34, 0]} radius={0.12} height={0.16} color="#aeb4b7" segments={6} />
            <Cylinder position={[0, 2.35, 0]} radius={0.075} height={4.0} color="#747c81" segments={6} />
            <Cylinder position={[0, 4.25, 0]} radius={0.095} height={0.18} color="#92999d" segments={6} />

            {/* Angled support and short arm extend over the road. */}
            <Cylinder
              position={[0, 4.58, direction * 0.38]}
              radius={0.052}
              height={0.92}
              color="#858c91"
              rotation={[direction * 0.72, 0, 0]}
              segments={6}
            />
            <Block
              position={[0, 4.88, direction * 0.78]}
              size={[0.11, 0.11, 0.92]}
              color="#92999d"
            />

            {/* Low-poly lamp head with a warm, softly glowing underside. */}
            <Block
              position={[0, 4.91, direction * 1.12]}
              size={[0.62, 0.18, 0.48]}
              color="#858d92"
            />
            <mesh position={[0, 4.805, direction * 1.12]}>
              <boxGeometry args={[0.48, 0.025, 0.34]} />
              <meshStandardMaterial
                color="#fff0cf"
                emissive="#e9d3a5"
                emissiveIntensity={0.72}
                roughness={0.7}
              />
            </mesh>
            <Block
              position={[0, 5.015, direction * 1.12]}
              size={[0.68, 0.045, 0.52]}
              color="#cbd0d2"
              castShadow={false}
            />
          </group>
        </SelectableObject>
      ))}
    </>
  );
}

function resolveTruckPosition(truck: Truck): WorldPoint {
  const { dockPositions, truckParking } = warehouseSceneData.layout;
  if (truck.currentDockId) {
    const dockPosition = dockPositions[truck.currentDockId];
    if (dockPosition) return [dockPosition[0], 0, DOCK_INTERIOR_Z];
  }
  return truckParking[truck.id] ?? [-13, 0, 14];
}


function WarehouseContents({
  selectedEntityId,
  onSelectEntity,
}: {
  selectedEntityId: string | null;
  onSelectEntity: (entity: WarehouseEntitySelection) => void;
}) {
  const data = warehouseSceneData;
  const trucks = useMemo(
    () => data.trucks.map((truck) => ({ truck, position: resolveTruckPosition(truck) })),
    [data.trucks],
  );
  const forklifts = useMemo(
    () => data.forklifts.map((forklift) => ({ forklift, position: data.layout.forkliftPositions[forklift.id] })),
    [data.forklifts, data.layout.forkliftPositions],
  );

  return (
    <>
      <Ground />
      <SelectableObject
        entity={{ id: data.site.id, kind: "site", name: "Main Distribution Centre" }}
        selectedEntityId={selectedEntityId}
        onSelect={onSelectEntity}
        bounds={{ center: data.layout.warehouse.position, size: [24.3, 6.2, 15.5] }}
      >
        <WarehouseBuilding position={data.layout.warehouse.position} size={data.layout.warehouse.size} dockPositions={data.layout.dockPositions} />
      </SelectableObject>

      {data.docks.map((dock) => (
        <SelectableObject
          key={dock.id}
          entity={{ id: dock.id, kind: "dock", name: `Dock ${dock.code}` }}
          selectedEntityId={selectedEntityId}
          onSelect={onSelectEntity}
          bounds={{ center: [data.layout.dockPositions[dock.id][0], 1.85, data.layout.dockPositions[dock.id][2] + 1.0], size: [4.8, 3.9, 3.8] }}
        >
          <DockModel dock={dock} position={data.layout.dockPositions[dock.id]} />
        </SelectableObject>
      ))}

      {Object.entries(data.layout.racks).map(([zoneCode, rack]) => (
        <SelectableObject
          key={zoneCode}
          entity={{ id: `storage-${zoneCode}`, kind: "storage_zone", name: zoneCode }}
          selectedEntityId={selectedEntityId}
          onSelect={onSelectEntity}
          bounds={{ center: [rack.position[0], 1.8, rack.position[2]], size: [rack.bays * rack.bayWidth + 0.7, 3.9, rack.depth + 0.7] }}
        >
          <RackRow
            zoneCode={zoneCode}
            rack={rack}
            inventory={data.inventory}
            selectedEntityId={selectedEntityId}
            onSelect={onSelectEntity}
          />
        </SelectableObject>
      ))}

      {Object.entries(data.layout.racks).map(([zoneCode, rack]) => {
        const palletPosition: WorldPoint = [rack.position[0] - 5.1, 0, rack.position[2] + 0.2];
        return (
          <SelectableObject
            key={`bulk-pallet-${zoneCode}`}
            entity={{ id: `pallet-${zoneCode.toLowerCase()}`, kind: "pallet", name: `Bulk pallet ${zoneCode}` }}
            selectedEntityId={selectedEntityId}
            onSelect={onSelectEntity}
            bounds={{ center: [palletPosition[0], 1.05, palletPosition[2]], size: [2.1, 2.5, 1.9] }}
          >
            <PalletModel position={palletPosition} size={[1.7, 1.15, 1.5]} />
          </SelectableObject>
        );
      })}

      {trucks.map(({ truck, position }, index) => {
        const selectable = (
          <SelectableObject
            entity={{ id: truck.id, kind: "truck", name: truck.label }}
            selectedEntityId={selectedEntityId}
            onSelect={onSelectEntity}
            bounds={{ center: [0, 1.7, 0], size: [3.4, 3.6, 8.1] }}
          >
            <TruckModel position={[0, 0, 0]} />
          </SelectableObject>
        );
        const route = truckRoutes[truck.id];
        return route ? (
          <RouteMotion key={truck.id} route={route} delaySeconds={truckRouteDelays[truck.id] ?? index * 2.4} hideUntilDelay={truck.id === "truck-04"} despawnAtEnd={truck.id === "truck-04"} agentId={truck.id} agentKind="truck">
            {selectable}
          </RouteMotion>
        ) : (
          <group key={truck.id} position={position}>
            {selectable}
          </group>
        );
      })}

      {forklifts.map(({ forklift, position }, index) => {
        const entity = { id: forklift.id, kind: "forklift" as const, name: forklift.label };
        const route = forkliftRoutes[forklift.id];
        if (forklift.id === "forklift-01") {
          return (
            <ForkliftWorkMotion
              key={forklift.id}
              agentId={forklift.id}
              selectedEntityId={selectedEntityId}
              onSelect={onSelectEntity}
            >
              {({ liftHeightRef, cargoVisibleRef }) => (
                <SelectableObject
                  entity={entity}
                  selectedEntityId={selectedEntityId}
                  onSelect={onSelectEntity}
                  bounds={{ center: [0, 1.46, 0.65], size: [2.35, 3.15, 5.0] }}
                >
                  <ForkliftModel
                    position={[0, 0, 0]}
                    liftHeightRef={liftHeightRef}
                    cargoVisibleRef={cargoVisibleRef}
                  />
                </SelectableObject>
              )}
            </ForkliftWorkMotion>
          );
        }
        const selectable = (
          <SelectableObject
            entity={entity}
            selectedEntityId={selectedEntityId}
            onSelect={onSelectEntity}
            bounds={{ center: [0, 1.46, 0.65], size: [2.35, 3.15, 5.0] }}
          >
            <ForkliftModel position={[0, 0, 0]} />
          </SelectableObject>
        );
        return route ? (
          <RouteMotion key={forklift.id} route={route} delaySeconds={index * 1.6} agentId={forklift.id} agentKind="forklift">
            {selectable}
          </RouteMotion>
        ) : (
          <group key={forklift.id} position={position}>
            {selectable}
          </group>
        );
      })}

      {Object.entries(carRoutes).map(([carId, route], index) => (
        <RouteMotion key={carId} route={route} delaySeconds={index * 18.8} hideUntilDelay despawnAtEnd agentId={carId} agentKind="car">
          <SelectableObject
            entity={{ id: carId, kind: "road_vehicle", name: `Road car ${index + 1}` }}
            selectedEntityId={selectedEntityId}
            onSelect={onSelectEntity}
            bounds={{ center: [0, 0.82, 0], size: [2.0, 1.8, 3.8] }}
          >
            <CarModel />
          </SelectableObject>
        </RouteMotion>
      ))}

      {Object.entries(workerRoutes).map(([workerId, route], index) => (
        <RouteMotion key={workerId} route={route} delaySeconds={index * 3.8} agentId={workerId} agentKind="worker">
          <SelectableObject
            entity={{ id: workerId, kind: "worker", name: `Warehouse worker ${index + 1}` }}
            selectedEntityId={selectedEntityId}
            onSelect={onSelectEntity}
            bounds={{ center: [0, 0.9, 0], size: [1.0, 1.95, 1.0] }}
          >
            <WorkerModel variant={index} />
          </SelectableObject>
        </RouteMotion>
      ))}

      <SelectableObject
        entity={{ id: "yard-fence", kind: "fence", name: "Perimeter fence" }}
        selectedEntityId={selectedEntityId}
        onSelect={onSelectEntity}
        bounds={{ center: [0, 1.1, 15.9], size: [50, 2.5, 2.0] }}
      >
        <BoundaryFence />
      </SelectableObject>

      <Trees selectedEntityId={selectedEntityId} onSelect={onSelectEntity} />
      <YardLamps selectedEntityId={selectedEntityId} onSelect={onSelectEntity} />
      <LivingYard />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.24} scale={64} blur={2.6} far={32} resolution={512} color="#74787b" />
    </>
  );
}

interface WarehouseSceneProps {
  controlsRef: MutableRefObject<CameraControlsApi | null>;
  selectedEntityId: string | null;
  onSelectEntity: (entity: WarehouseEntitySelection) => void;
}

function WarehouseSceneView({ controlsRef, selectedEntityId, onSelectEntity }: WarehouseSceneProps) {
  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 1.7]}
      camera={{ position: [30, 28, 30], zoom: 30, near: 0.1, far: 180 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onCreated={({ gl }) => {
        gl.setClearColor("#d7d8da", 1);
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <color attach="background" args={["#d7d8da"]} />
      <fog attach="fog" args={["#d7d8da", 42, 92]} />
      <ambientLight intensity={1.25} />
      <hemisphereLight args={["#ffffff", "#a3a6a9", 0.8]} />
      <directionalLight
        position={[-18, 32, 18]}
        intensity={2.25}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-bias={-0.00018}
      />
      <SoftShadows size={18} samples={14} focus={0} />
      <CameraRig controlsRef={controlsRef} />
      <WarehouseContents selectedEntityId={selectedEntityId} onSelectEntity={onSelectEntity} />
    </Canvas>
  );
}

export const WarehouseScene = memo(WarehouseSceneView);
