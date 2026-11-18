import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { getAgentSpeedFactor, publishAgentPose, removeAgentPose } from "../animations/agentRegistry";
import { SelectableObject } from "../SelectableObject";
import type { WarehouseEntitySelection } from "../../store/warehouseStore";
import { ModelBox } from "../models/primitives";
import {
  FORKLIFT_WORK_CYCLE_SECONDS,
  forkliftWorkLayout,
  sampleForkliftWorkCycle,
} from "./forkliftWorkPlan";

export interface ForkliftVisualRefs {
  liftHeightRef: MutableRefObject<number>;
  cargoVisibleRef: MutableRefObject<boolean>;
}

interface ForkliftWorkMotionProps {
  agentId: string;
  selectedEntityId: string | null;
  onSelect: (entity: WarehouseEntitySelection) => void;
  children: (visualRefs: ForkliftVisualRefs) => ReactNode;
}

function Carton({ color = "#c8ccce" }: { color?: string }) {
  return (
    <group>
      <ModelBox position={[0, 0, 0]} size={[0.92, 0.64, 0.82]} color={color} />
      <ModelBox position={[0, 0.335, 0]} size={[0.94, 0.045, 0.84]} color="#e3e5e6" castShadow={false} />
      <ModelBox position={[0, 0, 0.421]} size={[0.045, 0.58, 0.025]} color="#92999d" castShadow={false} />
      <ModelBox position={[0.18, 0.12, 0.435]} size={[0.32, 0.12, 0.022]} color="#aab0b3" castShadow={false} />
    </group>
  );
}

/**
 * Animation controller only: it consumes the pure work-cycle sample and drives visual refs.
 * Picking, put-away and staging timings live in forkliftWorkPlan.ts, not in the mesh models.
 */
export function ForkliftWorkMotion({
  agentId,
  selectedEntityId,
  onSelect,
  children,
}: ForkliftWorkMotionProps) {
  const forkliftRef = useRef<Group>(null);
  const transferBoxRef = useRef<Group>(null);
  const rackStoredBoxRef = useRef<Group>(null);
  const rackPickupBoxRef = useRef<Group>(null);
  const stagedBoxRef = useRef<Group>(null);
  const liftHeightRef = useRef(0.12);
  const cargoVisibleRef = useRef(true);
  const simulationTime = useRef(0);
  const speedScale = useRef(1);

  useEffect(() => () => removeAgentPose(agentId), [agentId]);

  useFrame(({ clock }, delta) => {
    const forklift = forkliftRef.current;
    if (!forklift) return;
    const frameDelta = Math.min(delta, 0.05);
    const lookAhead = [0.3, 0.65, 1.0].map((seconds) =>
      sampleForkliftWorkCycle(simulationTime.current + seconds),
    );
    const requestedSpeed = getAgentSpeedFactor(agentId, "forklift", lookAhead, clock.elapsedTime);
    const responseRate = requestedSpeed < speedScale.current ? 5.5 : 2.0;
    speedScale.current += (requestedSpeed - speedScale.current) * (1 - Math.exp(-responseRate * frameDelta));
    simulationTime.current = (simulationTime.current + frameDelta * speedScale.current) % FORKLIFT_WORK_CYCLE_SECONDS;

    const sample = sampleForkliftWorkCycle(simulationTime.current);
    forklift.position.set(...sample.position);
    forklift.rotation.y = sample.rotationY;
    liftHeightRef.current = sample.forkHeight;
    cargoVisibleRef.current = sample.carrying;

    if (transferBoxRef.current) {
      transferBoxRef.current.visible = sample.transferBoxPosition !== null;
      if (sample.transferBoxPosition) transferBoxRef.current.position.set(...sample.transferBoxPosition);
    }
    if (rackStoredBoxRef.current) rackStoredBoxRef.current.visible = sample.rackStoredBoxVisible;
    if (rackPickupBoxRef.current) rackPickupBoxRef.current.visible = sample.rackPickupBoxVisible;
    if (stagedBoxRef.current) stagedBoxRef.current.visible = sample.stagedBoxVisible;

    publishAgentPose(agentId, "forklift", sample, clock.elapsedTime);
  });

  const visualRefs = { liftHeightRef, cargoVisibleRef };
  return (
    <>
      <group ref={forkliftRef}>
        {children(visualRefs)}
      </group>

      {/* The pallet is a permanent selectable floor location; the carton appears after unloading. */}
      <group position={forkliftWorkLayout.stagingPallet}>
        <SelectableObject
          entity={{ id: "forklift-staging-pallet", kind: "pallet", name: "Forklift staging pallet" }}
          selectedEntityId={selectedEntityId}
          onSelect={onSelect}
          bounds={{ center: [0, 0.22, 0], size: [1.55, 0.5, 1.18] }}
        >
          <ModelBox position={[0, 0.12, 0]} size={[1.45, 0.18, 1.08]} color="#8d9498" />
          {[-0.42, 0, 0.42].map((x) => (
            <ModelBox key={x} position={[x, 0.055, 0]} size={[0.13, 0.11, 0.96]} color="#727a7f" />
          ))}
        </SelectableObject>
        <group ref={stagedBoxRef} position={[0, 0.53, 0]} visible={false}>
          <SelectableObject
            entity={{ id: "item-003", kind: "inventory_item", name: "Patient monitor" }}
            selectedEntityId={selectedEntityId}
            onSelect={onSelect}
            bounds={{ center: [0, 0, 0], size: [0.98, 0.72, 0.88] }}
          >
            <Carton color="#d0d3d5" />
          </SelectableObject>
        </group>
      </group>

      {/* The first carton remains on the shelf after the put-away movement. */}
      <group ref={rackStoredBoxRef} position={forkliftWorkLayout.rackStoredBox} visible={false}>
        <SelectableObject
          entity={{ id: "item-001", kind: "inventory_item", name: "Medical gloves" }}
          selectedEntityId={selectedEntityId}
          onSelect={onSelect}
          bounds={{ center: [0, 0, 0], size: [0.98, 0.72, 0.88] }}
        >
          <Carton color="#c5cace" />
        </SelectableObject>
      </group>
      {/* A second carton begins in the rack, is picked, then carried to the floor pallet. */}
      <group ref={rackPickupBoxRef} position={forkliftWorkLayout.rackPickupBox}>
        <SelectableObject
          entity={{ id: "item-003", kind: "inventory_item", name: "Patient monitor" }}
          selectedEntityId={selectedEntityId}
          onSelect={onSelect}
          bounds={{ center: [0, 0, 0], size: [0.98, 0.72, 0.88] }}
        >
          <Carton color="#d5d8da" />
        </SelectableObject>
      </group>
      <group ref={transferBoxRef} visible={false}>
        <SelectableObject
          entity={{ id: "item-003", kind: "inventory_item", name: "Patient monitor" }}
          selectedEntityId={selectedEntityId}
          onSelect={onSelect}
          bounds={{ center: [0, 0, 0], size: [0.98, 0.72, 0.88] }}
        >
          <Carton color="#cbd0d2" />
        </SelectableObject>
      </group>
    </>
  );
}
