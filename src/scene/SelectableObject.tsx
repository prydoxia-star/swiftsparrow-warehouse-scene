import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { WarehouseEntitySelection } from "../store/warehouseStore";
import type { WorldPoint, WorldSize } from "./warehouse-scene-data";

interface SelectableObjectProps {
  entity: WarehouseEntitySelection;
  selectedEntityId: string | null;
  onSelect: (entity: WarehouseEntitySelection) => void;
  bounds: { center: WorldPoint; size: WorldSize };
  children: ReactNode;
}

/**
 * Presentational interaction wrapper. It knows how to report a click and draw
 * a selection frame, but it contains no warehouse rules or data lookups.
 */
export function SelectableObject({
  entity,
  selectedEntityId,
  onSelect,
  bounds,
  children,
}: SelectableObjectProps) {
  const isSelected = selectedEntityId === entity.id;
  const outlineGeometry = useMemo(
    () =>
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(bounds.size[0], bounds.size[1], bounds.size[2]),
      ),
    [bounds.size[0], bounds.size[1], bounds.size[2]],
  );

  const handleClick = (event: THREE.Event & { stopPropagation: () => void }) => {
    event.stopPropagation();
    onSelect(entity);
  };

  return (
    <group onClick={handleClick}>
      {children}
      {isSelected && (
        <lineSegments
          position={bounds.center}
          geometry={outlineGeometry}
          raycast={() => null}
        >
          <lineBasicMaterial color="#e5a63d" depthTest={false} transparent opacity={0.98} />
        </lineSegments>
      )}
    </group>
  );
}
