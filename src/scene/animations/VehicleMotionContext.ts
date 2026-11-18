import { createContext } from "react";
import type { MutableRefObject } from "react";

/** Shared visual-only wheel rotation supplied by the route animator to vehicle meshes. */
export const VehicleWheelRotationContext = createContext<MutableRefObject<number> | null>(null);
