/**
 * World data model. A scene is plain data, so the same description draws as isometric art, as the flat
 * 2D Lite view, and (later) as a 3D scene. Scenes contain nothing secret.
 */
export type ObjectKind =
  | "desk" // light desk top on white pedestals
  | "partition" // green desk divider with a grey shelf on top
  | "chair" // dark office chair (dir: way it faces)
  | "armchair" // dark lounge chair
  | "plant" // tall indoor plant in a white pot
  | "reception" // long white reception desk
  | "turnstile" // steel security gate
  | "sofa" // dark sofa (dir)
  | "coffeetable" // low oval table
  | "watercooler" // office water cooler
  | "boardtable" // oval boardroom table
  | "roundtable" // round meeting table
  | "shelf" // wooden shelving unit
  | "planter" // long low green planter (used as a divider)
  | "column" // marble column
  | "cabinet" // low cabinet
  | "printer" // printer station
  | "decor"; // something the person bought for their Workspace (shows its icon)

export type Dir = 0 | 1 | 2 | 3; // 0 faces +x, 1 faces +y, 2 faces -x, 3 faces -y

export interface SceneObject {
  kind: ObjectKind;
  x: number;
  y: number;
  w?: number; // tiles along x (default 1)
  d?: number; // tiles along y (default 1)
  dir?: Dir;
  /** Walkers cannot enter solid objects. Defaults to true. */
  solid?: boolean;
  /** For "decor": the picture shown on it, and a colour for its base. */
  icon?: string;
  tint?: string;
}

export type FloorStyle = "marble" | "office" | "wood";

export type WallFeature =
  | { wall: "x" | "y"; kind: "moss"; from: number; to: number } // moss wall with the Meristem logo
  | { wall: "x" | "y"; kind: "slats"; from: number; to: number } // vertical wood slats
  | { wall: "x" | "y"; kind: "windows"; from: number; to: number } // tall glass windows
  | { wall: "x" | "y"; kind: "liftdoors"; from: number; to: number } // two steel lift doors
  | { wall: "x" | "y"; kind: "screen"; from: number; to: number } // wall display
  | { wall: "x" | "y"; kind: "glass"; from: number; to: number }; // glass-fronted offices

export type HairStyle = "lowcut" | "bald" | "curls" | "afro" | "locs" | "braids" | "classic" | "short" | "bun";
export type Outfit = "casual" | "hoodie" | "office" | "chill" | "sitework";
export type Fabric = "plain" | "ankara" | "adire" | "asooke";

/** How a person looks. The new fields are optional so looks saved before the editor existed still load. */
export interface Skin {
  body?: "man" | "woman";
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit?: Outfit;
  fabric?: Fabric;
  /** Outfit colour. */
  top: string;
  /** Bottoms colour. */
  pants: string;
  shoes?: string;
}

export interface Npc {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  dir: Dir;
  seated?: boolean;
  look: Skin;
}

export interface Portal {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  d: number;
  to: string; // scene id
  /** A lift: walking in asks which floor to go to instead of going straight through. */
  lift?: boolean;
  /** Where the player appears in the destination (a walkable tile). */
  arrive: { x: number; y: number };
}

export interface Hotspot {
  id: string;
  label: string;
  hint: string;
  x: number;
  y: number;
  kind: "workspace" | "info" | "coffee" | "meeting" | "water" | "lunch" | "rest" | "read";
}

export interface Scene {
  id: string;
  /** Which level of the building this room is on (see Building.levels). */
  level: string;
  /** Rooms in the same building connect with no travel step (RULEBOOK §2.7). */
  building: string;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  wallHeight: number;
  floor: FloorStyle;
  features: WallFeature[];
  objects: SceneObject[];
  npcs: Npc[];
  portals: Portal[];
  hotspots: Hotspot[];
  spawn: { x: number; y: number };
}

export interface Level {
  id: string;
  label: string;
}

export interface Building {
  id: string;
  name: string;
  city: string;
  /** Top to bottom as they appear on the map. */
  levels: Level[];
}
