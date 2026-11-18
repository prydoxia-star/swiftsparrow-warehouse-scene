# SwiftSparrow — 3D Warehouse Scene

An interactive, monochrome isometric warehouse simulation built with React, TypeScript, React Three Fiber, drei, and Zustand. Vehicles and storage are rendered as detailed low-poly meshes assembled from lightweight Three.js geometry.

## Run locally

Open this folder in VS Code, then run:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

To create a production build:

```powershell
npm.cmd run build
npm.cmd run preview
```

## Scene interaction

- **Click an object:** select it, show its outline, and open the live details panel.
- **Left mouse drag:** pan across the yard.
- **Mouse wheel:** zoom in and out.
- **Camera angle:** fixed isometric angle with map-area limits.
- **Live simulation:** truck and forklift states update in Zustand every two seconds; the details panel reacts without remounting the 3D scene.
- **Open vehicle entrance:** the swing gate has been removed; the perimeter fence leaves a wide, permanently open entrance for trucks.
- **Vehicle traffic:** the three dock trucks leave through the open fence entrance, follow broad curved perimeter-road turns, then return and use a three-point manoeuvre to reverse into their loading bays.
- **Yard truck visit:** Truck 04 approaches from the road, turns into the marked empty parking slot, waits for 12 seconds (`YARD_TRUCK_PARK_SECONDS` in `src/scene/traffic-paths.ts`), then reverses out, aligns with the access lane and rejoins the road.
- **Road traffic:** three low-poly cars pass one at a time in separate lanes in both directions, with long gaps between appearances.
- **Pedestrians:** five selectable low-poly workers walk on separate footpaths with animated arm and leg cycles. Each session shuffles six appearance presets, so workers get varied skin tones, workwear, reflective vests, helmets, boots and proportions without flickering during the simulation.
- **Living landscape:** expanded planted beds include low-poly shrubs, small flowers, stones and wind-swaying grass; the tree crowns also move gently in the breeze.
- **Clipping fixes:** the road and ground extend beyond the traffic loop, the parking bay stays clear of the security booth and loading docks, the open entrance remains clear for vehicles, and pedestrians follow paths away from rack and vehicle footprints.
- **Position tracking and collision avoidance:** trucks, forklifts, cars and pedestrians register live world positions in a shared scene registry. Oriented footprints are checked ahead of each movement; right-of-way is deterministic (truck → car → forklift → pedestrian), and yielding entities slow or stop before overlapping.
- **Realistic driving:** cars and trucks follow cubic-Hermite route segments with continuous velocity and path-tangent steering. Vehicles keep moving smoothly through intermediate steering points; they brake only for explicit stops, obstacles, or forward/reverse gear changes. Dock trucks use broad multi-point steering arcs and reverse-gear segments when docking. Forklifts reverse out of work positions instead of spinning in place.
- **Clean warehouse facade:** removed the projecting entrance canopy and its two support posts that created the protruding roof-like piece in the reference screenshot; the main warehouse roof and facade remain.
- **Forklift operator:** both forklifts include a seated, hard-hat-wearing operator with hands at the controls.
- **Forklift warehouse work:** Forklift A has a seated operator and performs a looping pick-and-put-away task at RACK-A. It raises its forks to a shelf, transfers a visible carton onto the first rack bay, backs out, retrieves a second carton from the third bay, and places it on a floor pallet. Boxes visibly travel between the forks, rack and staging pallet; the two animated inventory records are excluded from the static rack render so they are not duplicated. The moving cartons and staging pallet remain clickable and selectable.
- **Fully-entering dock trucks:** the warehouse is built as a real shell with three clear loading apertures instead of a single solid block. Docked truck centre positions are calculated from the facade plane and the truck nose length, leaving the whole 6.62-unit truck footprint inside the building with a front clearance. Trucks reverse through the open dock aperture and finish entirely within the warehouse footprint; the dock shutter opens to a 3.9-unit clear height while a truck approaches or occupies the bay. The partial cutaway roof makes the interior vehicles visible from the isometric camera.
- **Wall-mounted dock doors:** each roll-up shutter is mounted to the distribution-centre facade. Side tracks and the raised roller header are fixed to the building; only the shutter panel animates upward into the header.
- **Rolling truck wheels:** each truck wheel spins from actual world-distance travelled, so wheels rotate with forward travel and reverse in the opposite direction. Wheels share identical geometry on both sides, with matching grey hub faces and a grey axle tube joining the pair.
- **Perimeter terminal gate:** the wide central vehicle entrance remains permanently open, while the far-right end of the front perimeter fence finishes with a framed, mesh sliding-style gate panel, including a diagonal brace, latch and ground rollers.

## Project structure

```text
src/
├── components/
│   └── StatusPanel.tsx
├── data/                         # Original domain model — unchanged
│   ├── index.ts
│   └── types.ts
├── scene/
│   ├── models/
│   │   ├── primitives.tsx
│   │   ├── TruckModel.tsx
│   │   ├── ForkliftModel.tsx
│   │   ├── DockModel.tsx
│   │   ├── DockShutter.tsx        # Vehicle-synchronised roll-up dock doors
│   │   ├── CarModel.tsx
│   │   ├── WorkerModel.tsx
│   │   ├── TreeModel.tsx             # Wind-swaying low-poly trees
│   │   └── StorageModels.tsx
│   ├── animations/
│   │   ├── motionTypes.ts         # Shared route and pose types
│   │   ├── VehicleMotionContext.ts # Visual wheel-rotation ref supplied by RouteMotion
│   │   ├── RouteMotion.tsx        # Presentational route animator
│   │   ├── routeMath.ts           # Continuous Hermite path sampling and steering tangents
│   │   └── agentRegistry.ts       # Shared positions and collision/right-of-way coordination
│   ├── LivingYard.tsx             # Wind-swaying grass and landscaped beds
│   ├── simulation/
│   │   ├── forkliftWorkPlan.ts    # Pure forklift pick/put-away work-cycle plan
│   │   └── ForkliftWorkMotion.tsx # Applies the work plan to forklift and cargo meshes
│   ├── traffic-paths.ts           # Truck, car, forklift and pedestrian routes
│   ├── CameraRig.tsx
│   ├── SelectableObject.tsx
│   ├── WarehouseScene.tsx
│   └── warehouse-scene-data.ts
├── store/
│   ├── warehouseStore.ts
│   └── entityDetails.ts
├── App.tsx
├── main.tsx
└── styles.css
```

## Data and world placement

The original domain types use IDs for relationships and intentionally contain no Three.js coordinates. `warehouse-scene-data.ts` supplies example `Site`, `Dock`, `Truck`, `Forklift`, `InventoryItem`, and `Shipment` records, then maps entity IDs and storage-zone codes to world positions separately. The original `src/data/` files are preserved unchanged.

The demo records are illustrative. Replace them with API data while retaining the separate layout mapping for the physical site plan.

## Shared road lanes and vehicle collision handling

- Cars now use the same road lane centre-lines as trucks: outbound `z = 20` and inbound `z = 25`.
- Cars travel in one direction along the appropriate lane centre-line and leave the visible road at its far end; they do not U-turn or loop back.
- Cars and trucks now use mutual footprint checks. Neither vehicle type is exempt from collision checks based on right-of-way, so a truck also brakes for a car ahead.
- Vehicle motion samples a longer look-ahead window and smoothly brakes before another road vehicle's oriented footprint, then accelerates again when the lane clears.


## Latest traffic and dock updates

- Dock trucks now turn around on a wide apron path outside the warehouse facade, align to the loading bay, and reverse straight into the open dock aperture. The turning arc remains clear of the facade before the reversing segment begins.
- The security guardpost / booth has been removed from the scene and selectable entity types.
- Road cars are one-way pass-through traffic on the two lane centre-lines. Six staggered car arrivals keep traffic intermittent; each car despawns beyond the visible road boundary instead of looping back.
- The yard truck visits its parking slot, reverses out, rejoins the outbound lane, and despawns beyond the road end.


## Latest presentation update

- Removed the outlined white parking-bay rectangle from the yard-truck staging area so the open apron has no extra box-like marking. The truck route and parking behaviour remain unchanged.
- Added eight selectable low-poly roadside lamp posts, with faceted masts, cantilever arms and softly emissive lamp heads. Posts are placed outside the two traffic lane footprints.
- The current source had no separate asset-selector widget; the selected-object details card remains available for click-to-inspect, with its heading renamed from “Asset Details” to “Object Details.”

## Hosting the website

See [HOSTING.md](./HOSTING.md) for step-by-step Vercel, Netlify and manual static-hosting instructions. The current scene and live status simulation are client-side demo data; real shared operations would need a backend API and database.
