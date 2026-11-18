/**
 * SwiftSparrow Logistics — core data-layer types.
 *
 * Relationships are stored as IDs rather than nested objects. This keeps the
 * model serialisable and avoids duplicated copies of related records.
 */

export type SiteId = string;
export type DockId = string;
export type TruckId = string;
export type ForkliftId = string;
export type InventoryItemId = string;
export type ShipmentId = string;

/** ISO-8601 date-time string, e.g. "2026-11-18T09:30:00+08:00". */
export type DateTime = string;

export type SiteStatus = "active" | "temporarily_closed" | "maintenance";

export interface SiteAddress {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
}

/** A warehouse, depot, or distribution facility operated by SwiftSparrow. */
export interface Site {
  id: SiteId;
  code: string;
  name: string;
  address: SiteAddress;
  timeZone: string;
  status: SiteStatus;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export type DockType = "loading" | "unloading" | "flexible";
export type DockStatus = "available" | "occupied" | "reserved" | "out_of_service";

/** A loading/unloading bay belonging to exactly one site. */
export interface Dock {
  id: DockId;
  siteId: SiteId;
  code: string;
  type: DockType;
  status: DockStatus;
}

export type TruckStatus =
  | "available"
  | "loading"
  | "unloading"
  | "in_transit"
  | "maintenance"
  | "offline";

/** A road vehicle. homeSiteId is its base; currentDockId is set while docked. */
export interface Truck {
  id: TruckId;
  registrationNumber: string;
  label: string;
  homeSiteId: SiteId;
  currentDockId?: DockId;
  status: TruckStatus;
  capacityKg: number;
  lastUpdatedAt: DateTime;
}

export type ForkliftStatus =
  | "available"
  | "in_use"
  | "charging"
  | "maintenance"
  | "offline";

/** Where a forklift is currently operating within its site. */
export type ForkliftLocation =
  | { kind: "storage_zone"; zoneCode: string }
  | { kind: "dock"; dockId: DockId };

/** A material-handling vehicle that operates within one site. */
export interface Forklift {
  id: ForkliftId;
  siteId: SiteId;
  label: string;
  status: ForkliftStatus;
  location: ForkliftLocation;
  maxLoadKg: number;
  lastUpdatedAt: DateTime;
}

export type InventoryCategory =
  | "medical_equipment"
  | "medical_supplies"
  | "general_cargo"
  | "other";

export type InventoryCondition = "good" | "damaged" | "quarantined";

/**
 * Current physical position of an inventory record.
 * A forklift or truck location points to the vehicle carrying the item.
 */
export type InventoryLocation =
  | {
      kind: "storage";
      zoneCode: string;
      aisle?: string;
      rack?: string;
      shelf?: string;
    }
  | { kind: "dock"; dockId: DockId }
  | { kind: "truck"; truckId: TruckId }
  | { kind: "forklift"; forkliftId: ForkliftId };

/** A stock record for a particular SKU held or handled by a site. */
export interface InventoryItem {
  id: InventoryItemId;
  siteId: SiteId;
  sku: string;
  name: string;
  description?: string;
  category: InventoryCategory;
  quantity: number;
  unit: "piece" | "box" | "pallet" | "kilogram";
  weightPerUnitKg?: number;
  condition: InventoryCondition;
  location: InventoryLocation;
  lastUpdatedAt: DateTime;
}

export type ShipmentStatus =
  | "draft"
  | "ready_for_dispatch"
  | "loading"
  | "in_transit"
  | "delivered"
  | "delayed"
  | "cancelled";

export type ShipmentPriority = "standard" | "urgent" | "critical";

/** One inventory record and the quantity committed to a shipment. */
export interface ShipmentLine {
  inventoryItemId: InventoryItemId;
  quantity: number;
}

/** A consignment moving inventory between two sites. */
export interface Shipment {
  id: ShipmentId;
  trackingNumber: string;
  originSiteId: SiteId;
  destinationSiteId: SiteId;
  originDockId?: DockId;
  destinationDockId?: DockId;
  truckId?: TruckId;
  items: ShipmentLine[];
  status: ShipmentStatus;
  priority: ShipmentPriority;
  plannedDepartureAt?: DateTime;
  estimatedArrivalAt?: DateTime;
  actualDepartureAt?: DateTime;
  deliveredAt?: DateTime;
  createdAt: DateTime;
  lastUpdatedAt: DateTime;
}
