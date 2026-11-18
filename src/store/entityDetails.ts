import type { LiveEntityStatus, WarehouseEntitySelection } from "./warehouseStore";
import { warehouseSceneData } from "../scene/warehouse-scene-data";

export interface EntityDetailsViewModel {
  id: string;
  kindLabel: string;
  name: string;
  state: string;
  currentShipment: string;
  lastUpdatedAt: string;
  isLive: boolean;
}

const activeShipmentStatuses = new Set(["ready_for_dispatch", "loading", "in_transit", "delayed"]);

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatShipment(trackingNumber: string, status: string): string {
  return `${trackingNumber} · ${formatLabel(status)}`;
}

function latestTimestamp(values: Array<string | undefined>): string {
  const timestamps = values.filter((value): value is string => Boolean(value));
  if (timestamps.length === 0) return warehouseSceneData.site.updatedAt;
  return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function shipmentsForSelection(selection: WarehouseEntitySelection): string[] {
  const { shipments, inventory } = warehouseSceneData;
  const activeShipments = shipments.filter((shipment) => activeShipmentStatuses.has(shipment.status));
  let matching = activeShipments;

  switch (selection.kind) {
    case "site":
      matching = activeShipments.filter(
        (shipment) =>
          shipment.originSiteId === selection.id || shipment.destinationSiteId === selection.id,
      );
      break;
    case "truck":
      matching = activeShipments.filter((shipment) => shipment.truckId === selection.id);
      break;
    case "dock":
      matching = activeShipments.filter(
        (shipment) =>
          shipment.originDockId === selection.id || shipment.destinationDockId === selection.id,
      );
      break;
    case "forklift": {
      const forklift = warehouseSceneData.forklifts.find((record) => record.id === selection.id);
      const relatedItemIds = inventory
        .filter((item) => item.location.kind === "forklift" && item.location.forkliftId === selection.id)
        .map((item) => item.id);
      matching = activeShipments.filter((shipment) =>
        shipment.items.some((line) => relatedItemIds.includes(line.inventoryItemId)),
      );
      const forkliftLocation = forklift?.location;
      if (matching.length === 0 && forkliftLocation?.kind === "dock") {
        const dockId = forkliftLocation.dockId;
        matching = activeShipments.filter(
          (shipment) => shipment.originDockId === dockId || shipment.destinationDockId === dockId,
        );
      }
      break;
    }
    case "inventory_item":
      matching = activeShipments.filter((shipment) =>
        shipment.items.some((line) => line.inventoryItemId === selection.id),
      );
      break;
    case "storage_zone": {
      const zoneItemIds = inventory
        .filter((item) => item.location.kind === "storage" && item.location.zoneCode === selection.name)
        .map((item) => item.id);
      matching = activeShipments.filter((shipment) =>
        shipment.items.some((line) => zoneItemIds.includes(line.inventoryItemId)),
      );
      break;
    }
    default:
      matching = [];
  }

  return matching.map((shipment) => formatShipment(shipment.trackingNumber, shipment.status));
}

function resolveStaticState(selection: WarehouseEntitySelection): string {
  switch (selection.kind) {
    case "site":
      return formatLabel(warehouseSceneData.site.status);
    case "dock": {
      const dock = warehouseSceneData.docks.find((record) => record.id === selection.id);
      return dock ? formatLabel(dock.status) : "Unknown";
    }
    case "storage_zone":
      return "Operational";
    case "inventory_item": {
      const item = warehouseSceneData.inventory.find((record) => record.id === selection.id);
      return item ? formatLabel(item.condition) : "Unknown";
    }
    case "pallet":
    case "fence":
    case "tree":
    case "yard_lamp":
      return "In place";
    case "worker":
      return "On shift";
    case "road_vehicle":
      return "Passing traffic";
    default:
      return "Unknown";
  }
}

function resolveStaticTimestamp(selection: WarehouseEntitySelection): string {
  switch (selection.kind) {
    case "site":
      return warehouseSceneData.site.updatedAt;
    case "dock":
      return warehouseSceneData.site.updatedAt;
    case "inventory_item":
      return (
        warehouseSceneData.inventory.find((item) => item.id === selection.id)?.lastUpdatedAt ??
        warehouseSceneData.site.updatedAt
      );
    case "storage_zone": {
      const timestamps = warehouseSceneData.inventory
        .filter((item) => item.location.kind === "storage" && item.location.zoneCode === selection.name)
        .map((item) => item.lastUpdatedAt);
      return latestTimestamp(timestamps);
    }
    default:
      return warehouseSceneData.site.updatedAt;
  }
}

export function resolveEntityDetails(
  selection: WarehouseEntitySelection,
  liveStatus?: LiveEntityStatus,
): EntityDetailsViewModel {
  const liveEntity = selection.kind === "truck" || selection.kind === "forklift";
  const shipmentLabels = shipmentsForSelection(selection);

  return {
    id: selection.id,
    kindLabel: formatLabel(selection.kind),
    name: selection.name,
    state: liveEntity && liveStatus ? formatLabel(liveStatus.state) : resolveStaticState(selection),
    currentShipment: shipmentLabels.length > 0 ? shipmentLabels.join(", ") : "No active shipment",
    lastUpdatedAt: liveEntity && liveStatus ? liveStatus.lastUpdatedAt : resolveStaticTimestamp(selection),
    isLive: liveEntity,
  };
}
