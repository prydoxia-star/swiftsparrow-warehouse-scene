import { create } from "zustand";
import type { ForkliftStatus, TruckStatus } from "../data";
import { warehouseSceneData } from "../scene/warehouse-scene-data";

export type WarehouseEntityKind =
  | "site"
  | "dock"
  | "truck"
  | "forklift"
  | "storage_zone"
  | "inventory_item"
  | "pallet"
  | "fence"
  | "tree"
  | "yard_lamp"
  | "worker"
  | "road_vehicle";

export interface WarehouseEntitySelection {
  id: string;
  kind: WarehouseEntityKind;
  name: string;
}

export interface LiveEntityStatus {
  state: TruckStatus | ForkliftStatus;
  lastUpdatedAt: string;
}

interface WarehouseStore {
  selectedEntity: WarehouseEntitySelection | null;
  liveStatuses: Record<string, LiveEntityStatus>;
  simulationTick: number;
  selectEntity: (entity: WarehouseEntitySelection) => void;
  clearSelection: () => void;
  simulateLiveUpdate: () => void;
}

const initialTimestamp = new Date().toISOString();

const initialLiveStatuses: Record<string, LiveEntityStatus> = {
  ...Object.fromEntries(
    warehouseSceneData.trucks.map((truck) => [
      truck.id,
      { state: truck.status, lastUpdatedAt: initialTimestamp },
    ]),
  ),
  ...Object.fromEntries(
    warehouseSceneData.forklifts.map((forklift) => [
      forklift.id,
      { state: forklift.status, lastUpdatedAt: initialTimestamp },
    ]),
  ),
};

const truckCycle: TruckStatus[] = ["loading", "in_transit", "unloading", "available"];
const forkliftCycle: ForkliftStatus[] = ["in_use", "available", "charging"];

export const useWarehouseStore = create<WarehouseStore>((set) => ({
  selectedEntity: null,
  liveStatuses: initialLiveStatuses,
  simulationTick: 0,
  selectEntity: (entity) => set({ selectedEntity: entity }),
  clearSelection: () => set({ selectedEntity: null }),
  simulateLiveUpdate: () =>
    set((state) => {
      const nextTick = state.simulationTick + 1;
      const timestamp = new Date().toISOString();
      const nextStatuses = { ...state.liveStatuses };

      warehouseSceneData.trucks.forEach((truck, index) => {
        nextStatuses[truck.id] = {
          state: truckCycle[(nextTick + index) % truckCycle.length],
          lastUpdatedAt: timestamp,
        };
      });

      warehouseSceneData.forklifts.forEach((forklift, index) => {
        nextStatuses[forklift.id] = {
          state: forkliftCycle[(nextTick + index) % forkliftCycle.length],
          lastUpdatedAt: timestamp,
        };
      });

      return { simulationTick: nextTick, liveStatuses: nextStatuses };
    }),
}));
