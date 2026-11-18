import { BeamBetween, ModelBox } from "./primitives";
import type { RackLayout, WorldPoint, WorldSize } from "../warehouse-scene-data";

export function PalletModel({
  position,
  size = [1.3, 0.85, 1.15],
}: {
  position: WorldPoint;
  size?: WorldSize;
}) {
  const [width, height, depth] = size;
  return (
    <group position={position}>
      {/* Timber runners and separated deck boards */}
      {[-0.38, 0, 0.38].map((z) => (
        <ModelBox key={`runner-${z}`} position={[0, 0.11, z * depth]} size={[width + 0.12, 0.2, 0.16]} color="#8c9296" />
      ))}
      {[-0.38, -0.13, 0.13, 0.38].map((x) => (
        <ModelBox key={`deck-${x}`} position={[x * width, 0.24, 0]} size={[0.13, 0.08, depth + 0.1]} color="#c0c4c6" />
      ))}
      {/* Cargo cases with seams and wrap straps */}
      <ModelBox position={[0, 0.28 + height / 2, 0]} size={[width * 0.94, height, depth * 0.92]} color="#c8ccce" />
      <ModelBox position={[0, 0.28 + height + 0.035, 0]} size={[width * 0.98, 0.07, depth * 0.95]} color="#e1e3e4" />
      {[-0.32, 0.32].map((x) => (
        <ModelBox key={`wrap-${x}`} position={[x * width, 0.3 + height / 2, depth * 0.466]} size={[0.055, height * 0.94, 0.025]} color="#92999d" />
      ))}
    </group>
  );
}

export function StorageRackFrame({ rack }: { rack: RackLayout }) {
  const { bays, levels, bayWidth, depth } = rack;
  const rackWidth = bays * bayWidth;
  const frontZ = depth / 2;
  const rearZ = -depth / 2;

  return (
    <group>
      {/* Steel upright frames */}
      {Array.from({ length: bays + 1 }, (_, bay) => {
        const x = -rackWidth / 2 + bay * bayWidth;
        return (
          <group key={`frame-${bay}`}>
            <ModelBox position={[x, 1.82, frontZ]} size={[0.14, 3.64, 0.14]} color="#777f84" />
            <ModelBox position={[x, 1.82, rearZ]} size={[0.14, 3.64, 0.14]} color="#92999d" />
            <ModelBox position={[x, 0.17, frontZ]} size={[0.22, 0.16, 0.26]} color="#c5c9cb" />
            <ModelBox position={[x, 0.17, rearZ]} size={[0.22, 0.16, 0.26]} color="#c5c9cb" />
          </group>
        );
      })}

      {/* Horizontal load beams, back stops and shelf decks */}
      {Array.from({ length: levels }, (_, level) => {
        const y = 0.48 + level * 1.05;
        return (
          <group key={`level-${level}`}>
            <ModelBox position={[0, y, frontZ]} size={[rackWidth + 0.15, 0.15, 0.16]} color="#858d92" />
            <ModelBox position={[0, y, rearZ]} size={[rackWidth + 0.15, 0.15, 0.16]} color="#9aa1a5" />
            <ModelBox position={[0, y - 0.11, 0]} size={[rackWidth, 0.08, depth - 0.14]} color="#c0c4c6" />
            <ModelBox position={[0, y + 0.1, frontZ + 0.03]} size={[rackWidth, 0.035, 0.035]} color="#dfe2e3" />
          </group>
        );
      })}

      {/* Diagonal frame bracing */}
      {Array.from({ length: bays + 1 }, (_, bay) => {
        const x = -rackWidth / 2 + bay * bayWidth;
        return (
          <group key={`brace-${bay}`}>
            <BeamBetween
              start={[x, 0.35, rearZ]}
              end={[x, 3.28, rearZ]}
              thickness={0.055}
              color="#aab0b3"
            />
          </group>
        );
      })}
      {Array.from({ length: bays }, (_, bay) => {
        const x0 = -rackWidth / 2 + bay * bayWidth;
        const x1 = x0 + bayWidth;
        return (
          <group key={`cross-brace-${bay}`}>
            <BeamBetween start={[x0, 0.45, rearZ - 0.02]} end={[x1, 1.85, rearZ - 0.02]} thickness={0.055} color="#92999e" />
            <BeamBetween start={[x1, 0.45, rearZ - 0.02]} end={[x0, 1.85, rearZ - 0.02]} thickness={0.055} color="#92999e" />
          </group>
        );
      })}

      {/* Small zone marker plate */}
      <ModelBox position={[0, 3.45, frontZ + 0.11]} size={[1.1, 0.22, 0.07]} color="#e2e4e5" />
      <ModelBox position={[0, 3.45, frontZ + 0.155]} size={[0.78, 0.08, 0.025]} color="#858d92" />
    </group>
  );
}

export function StorageCarton({
  position,
  size,
  tone = "#c7cbcd",
  variant = 0,
}: {
  position: WorldPoint;
  size: WorldSize;
  tone?: string;
  variant?: number;
}) {
  const [width, height, depth] = size;
  return (
    <group position={position}>
      <ModelBox position={[0, height / 2, 0]} size={size} color={tone} />
      <ModelBox position={[0, height + 0.025, 0]} size={[width * 0.98, 0.05, depth * 0.98]} color="#e2e4e5" />
      <ModelBox position={[0, height / 2, depth / 2 + 0.012]} size={[0.045, height * 0.95, 0.025]} color="#92999d" />
      <ModelBox position={[0, height * 0.72, depth / 2 + 0.03]} size={[width * 0.38, 0.08, 0.025]} color="#aab0b3" />
      {variant % 2 === 0 && (
        <ModelBox position={[width / 2 + 0.012, height * 0.52, 0]} size={[0.025, height * 0.7, depth * 0.16]} color="#969da1" />
      )}
    </group>
  );
}
