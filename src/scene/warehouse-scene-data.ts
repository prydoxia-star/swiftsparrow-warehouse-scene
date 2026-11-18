import type {
  Dock,
  Forklift,
  InventoryItem,
  Shipment,
  Site,
  Truck,
} from "../data";

export type WorldPoint = [x: number, y: number, z: number];
export type WorldSize = [width: number, height: number, depth: number];

export interface RackLayout {
  position: WorldPoint;
  bays: number;
  levels: number;
  bayWidth: number;
  depth: number;
}

/**
 * Scene placement lives outside the business data model. The domain records
 * remain portable and can later be loaded from an API without Three.js fields.
 */
export interface WarehouseSceneData {
  site: Site;
  docks: Dock[];
  trucks: Truck[];
  forklifts: Forklift[];
  inventory: InventoryItem[];
  shipments: Shipment[];
  layout: {
    warehouse: { position: WorldPoint; size: WorldSize };
    dockPositions: Record<string, WorldPoint>;
    truckParking: Record<string, WorldPoint>;
    storageZones: Record<string, WorldPoint>;
    forkliftPositions: Record<string, WorldPoint>;
    racks: Record<string, RackLayout>;
  };
}

const createdAt = "2026-11-18T08:00:00+08:00";

export const warehouseSceneData: WarehouseSceneData = {
  site: {
    id: "site-sg-main",
    code: "SG-MAIN",
    name: "SwiftSparrow Main Distribution Centre",
    address: {
      line1: "Logistics Avenue",
      city: "Singapore",
      postalCode: "629000",
      country: "Singapore",
    },
    timeZone: "Asia/Singapore",
    status: "active",
    createdAt,
    updatedAt: createdAt,
  },
  docks: [
    { id: "dock-01", siteId: "site-sg-main", code: "D-01", type: "loading", status: "occupied" },
    { id: "dock-02", siteId: "site-sg-main", code: "D-02", type: "flexible", status: "occupied" },
    { id: "dock-03", siteId: "site-sg-main", code: "D-03", type: "unloading", status: "occupied" },
  ],
  trucks: [
    {
      id: "truck-01",
      registrationNumber: "GBX 2148",
      label: "Truck 01",
      homeSiteId: "site-sg-main",
      currentDockId: "dock-01",
      status: "loading",
      capacityKg: 12000,
      lastUpdatedAt: createdAt,
    },
    {
      id: "truck-02",
      registrationNumber: "GBX 3921",
      label: "Truck 02",
      homeSiteId: "site-sg-main",
      currentDockId: "dock-02",
      status: "unloading",
      capacityKg: 10000,
      lastUpdatedAt: createdAt,
    },
    {
      id: "truck-03",
      registrationNumber: "GBX 5804",
      label: "Truck 03",
      homeSiteId: "site-sg-main",
      currentDockId: "dock-03",
      status: "loading",
      capacityKg: 15000,
      lastUpdatedAt: createdAt,
    },
    {
      id: "truck-04",
      registrationNumber: "GBX 7702",
      label: "Yard Truck",
      homeSiteId: "site-sg-main",
      status: "available",
      capacityKg: 8000,
      lastUpdatedAt: createdAt,
    },
  ],
  forklifts: [
    {
      id: "forklift-01",
      siteId: "site-sg-main",
      label: "Forklift A",
      status: "in_use",
      location: { kind: "storage_zone", zoneCode: "RACK-A" },
      maxLoadKg: 2500,
      lastUpdatedAt: createdAt,
    },
    {
      id: "forklift-02",
      siteId: "site-sg-main",
      label: "Forklift B",
      status: "available",
      location: { kind: "dock", dockId: "dock-02" },
      maxLoadKg: 3000,
      lastUpdatedAt: createdAt,
    },
  ],
  inventory: [
    {
      id: "item-001", siteId: "site-sg-main", sku: "MED-GLV-01", name: "Medical gloves",
      category: "medical_supplies", quantity: 24, unit: "box", condition: "good",
      location: { kind: "storage", zoneCode: "RACK-A", aisle: "A", rack: "01", shelf: "02" },
      lastUpdatedAt: createdAt,
    },
    {
      id: "item-002", siteId: "site-sg-main", sku: "MED-MSK-02", name: "Surgical masks",
      category: "medical_supplies", quantity: 18, unit: "box", condition: "good",
      location: { kind: "storage", zoneCode: "RACK-A", aisle: "A", rack: "02", shelf: "02" },
      lastUpdatedAt: createdAt,
    },
    {
      id: "item-003", siteId: "site-sg-main", sku: "MED-MON-03", name: "Patient monitor",
      category: "medical_equipment", quantity: 4, unit: "piece", condition: "good",
      location: { kind: "storage", zoneCode: "RACK-A", aisle: "A", rack: "03", shelf: "01" },
      lastUpdatedAt: createdAt,
    },
    {
      id: "item-004", siteId: "site-sg-main", sku: "MED-KIT-04", name: "First aid kits",
      category: "medical_supplies", quantity: 30, unit: "box", condition: "good",
      location: { kind: "storage", zoneCode: "RACK-B", aisle: "B", rack: "01", shelf: "02" },
      lastUpdatedAt: createdAt,
    },
    {
      id: "item-005", siteId: "site-sg-main", sku: "MED-OXY-05", name: "Oxygen concentrator",
      category: "medical_equipment", quantity: 2, unit: "piece", condition: "good",
      location: { kind: "dock", dockId: "dock-03" },
      lastUpdatedAt: createdAt,
    },
    {
      id: "item-006", siteId: "site-sg-main", sku: "MED-BED-06", name: "Portable bed",
      category: "medical_equipment", quantity: 1, unit: "piece", condition: "good",
      location: { kind: "truck", truckId: "truck-01" },
      lastUpdatedAt: createdAt,
    },
  ],
  shipments: [
    {
      id: "shipment-001", trackingNumber: "SS-2026-001", originSiteId: "site-sg-main",
      destinationSiteId: "site-sg-main", originDockId: "dock-01", truckId: "truck-01",
      items: [{ inventoryItemId: "item-006", quantity: 1 }], status: "loading", priority: "urgent",
      createdAt, lastUpdatedAt: createdAt,
    },
    {
      id: "shipment-002", trackingNumber: "SS-2026-002", originSiteId: "site-sg-main",
      destinationSiteId: "site-sg-main", originDockId: "dock-03",
      items: [{ inventoryItemId: "item-005", quantity: 2 }], status: "ready_for_dispatch", priority: "standard",
      createdAt, lastUpdatedAt: createdAt,
    },
  ],
  layout: {
    warehouse: {
      position: [0, 2.55, -1.7],
      size: [22, 5.1, 13.2],
    },
    dockPositions: {
      "dock-01": [-6.4, 0, 5.1],
      "dock-02": [-1.1, 0, 5.1],
      "dock-03": [4.2, 0, 5.1],
    },
    truckParking: {
      "truck-04": [8.0, 0, 10.8],
    },
    storageZones: {
      "RACK-A": [-16.2, 0, -2.8],
      "RACK-B": [-16.2, 0, 3.6],
    },
    forkliftPositions: {
      "forklift-01": [-12.8, 0, -10.2],
      "forklift-02": [17.8, 0, -1.5],
    },
    racks: {
      "RACK-A": { position: [-16.2, 0, -2.8], bays: 3, levels: 3, bayWidth: 2.25, depth: 1.35 },
      "RACK-B": { position: [-16.2, 0, 3.6], bays: 3, levels: 3, bayWidth: 2.25, depth: 1.35 },
    },
  },
};
