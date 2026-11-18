import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { StatusPanel } from "./components/StatusPanel";
import { WarehouseScene } from "./scene/WarehouseScene";
import type { CameraControlsApi } from "./scene/CameraRig";
import { resolveEntityDetails } from "./store/entityDetails";
import { useWarehouseStore } from "./store/warehouseStore";

interface DragState {
  pointerId: number;
  x: number;
  y: number;
}

export default function App() {
  const controlsRef = useRef<CameraControlsApi | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);
  const selectedEntity = useWarehouseStore((state) => state.selectedEntity);
  const liveStatuses = useWarehouseStore((state) => state.liveStatuses);
  const selectEntity = useWarehouseStore((state) => state.selectEntity);
  const clearSelection = useWarehouseStore((state) => state.clearSelection);
  const simulateLiveUpdate = useWarehouseStore((state) => state.simulateLiveUpdate);

  useEffect(() => {
    const intervalId = window.setInterval(simulateLiveUpdate, 2000);
    return () => window.clearInterval(intervalId);
  }, [simulateLiveUpdate]);

  const details = useMemo(() => {
    if (!selectedEntity) return null;
    return resolveEntityDetails(selectedEntity, liveStatuses[selectedEntity.id]);
  }, [selectedEntity, liveStatuses]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest(".status-panel")) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setDragging(true);
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    controlsRef.current?.pan(deltaX, deltaY);
  }, []);

  const endDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }, []);

  const handleWheel = useCallback((event: WheelEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest(".status-panel")) return;
    event.preventDefault();
    controlsRef.current?.zoom(event.deltaY);
  }, []);

  return (
    <main
      className={`warehouse-viewport${dragging ? " is-dragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onWheel={handleWheel}
      aria-label="Interactive isometric SwiftSparrow warehouse scene"
    >
      <WarehouseScene
        controlsRef={controlsRef}
        selectedEntityId={selectedEntity?.id ?? null}
        onSelectEntity={selectEntity}
      />
      {details && <StatusPanel details={details} onClose={clearSelection} />}
    </main>
  );
}
