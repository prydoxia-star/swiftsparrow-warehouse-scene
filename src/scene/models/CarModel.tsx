import { FlatQuad, ModelBox, WheelAssembly } from "./primitives";

/** Small monochrome commuter car for ambient traffic on the perimeter road. */
export function CarModel() {
  return (
    <group>
      <ModelBox position={[0, 0.52, 0]} size={[1.62, 0.42, 3.25]} color="#858b90" />
      <ModelBox position={[0, 0.88, -0.12]} size={[1.55, 0.46, 1.75]} color="#c5c9cc" />
      <ModelBox position={[0, 1.14, -0.12]} size={[1.38, 0.12, 1.46]} color="#e0e3e5" />
      <FlatQuad
        corners={[
          [-0.62, 0.92, 0.78],
          [0.62, 0.92, 0.78],
          [0.54, 1.48, 0.27],
          [-0.54, 1.48, 0.27],
        ]}
        color="#69747b"
      />
      <FlatQuad
        corners={[
          [-0.62, 0.92, -0.92],
          [0.62, 0.92, -0.92],
          [0.54, 1.48, -0.49],
          [-0.54, 1.48, -0.49],
        ]}
        color="#737e84"
      />
      {[-0.69, 0.69].map((x) => (
        <group key={`car-side-${x}`}>
          <ModelBox position={[x, 0.91, -0.1]} size={[0.055, 0.46, 1.48]} color="#aeb4b8" />
          <ModelBox position={[x, 0.55, -1.42]} size={[0.07, 0.15, 0.38]} color="#666d72" />
          <ModelBox position={[x, 0.56, 1.42]} size={[0.07, 0.15, 0.38]} color="#666d72" />
        </group>
      ))}
      <ModelBox position={[0, 0.56, 1.65]} size={[1.72, 0.22, 0.16]} color="#d8dcde" />
      <ModelBox position={[0, 0.58, -1.65]} size={[1.72, 0.2, 0.16]} color="#656c71" />
      {[-0.57, 0.57].map((x) => (
        <group key={`car-lights-${x}`}>
          <ModelBox position={[x, 0.72, 1.72]} size={[0.28, 0.18, 0.06]} color="#f0f1f1" />
          <ModelBox position={[x, 0.72, -1.72]} size={[0.25, 0.16, 0.06]} color="#a4a9ad" />
        </group>
      ))}
      {[-1.0, 1.0].map((z) => (
        <group key={`car-axle-${z}`}>
          <WheelAssembly position={[-0.78, 0.37, z]} radius={0.34} width={0.2} />
          <WheelAssembly position={[0.78, 0.37, z]} radius={0.34} width={0.2} />
        </group>
      ))}
    </group>
  );
}
