import type { Building, Dir, Npc, Scene, SceneObject, Skin } from "./types";

/**
 * Ikoyi HQ, laid out from the reference photos of the real building: double-height lobby with the moss
 * wall and logo, reception, turnstiles and lifts; open-plan floors with white desks, green partitions and
 * mesh chairs; the oval boardroom; the executive lounge. Fictional people only.
 *
 * Scenes are data, so the same description draws as isometric art, as flat 2D Lite, and later as 3D.
 */
export const BUILDINGS: Building[] = [
  {
    id: "ikoyi-hq",
    name: "Ikoyi HQ",
    city: "Lagos",
    // Confirmed by the owner (13 Oct 2026): Ground floor, Mezzanine floor and Floors 1 to 6.
    // What each floor is used for will be supplied by the owner; until then only sample rooms exist.
    levels: [
      { id: "floor-6", label: "Floor 6" },
      { id: "floor-5", label: "Floor 5" },
      { id: "floor-4", label: "Floor 4" },
      { id: "floor-3", label: "Floor 3" },
      { id: "floor-2", label: "Floor 2" },
      { id: "floor-1", label: "Floor 1" },
      { id: "mezzanine", label: "Mezzanine floor" },
      { id: "ground", label: "Ground floor" },
    ],
  },
];

const look = (skin: string, hair: string, hairStyle: Skin["hairStyle"], top: string, pants = "#1f2a3d", extra: Partial<Skin> = {}): Skin => ({ skin, hair, hairStyle, top, pants, ...extra });

const SKIN = { deep: "#4d2c18", brown: "#7a4a2b", medium: "#a9714a", light: "#c68d63" };

const npc = (id: string, name: string, role: string, x: number, y: number, dir: Dir, l: Skin, seated = false): Npc => ({ id, name, role, x, y, dir, seated, look: l });

/** A pair of desks facing each other with a green partition between them (an open-plan pod). */
function pod(px: number, py: number): SceneObject[] {
  return [
    { kind: "desk", x: px, y: py, w: 3, d: 1 },
    { kind: "partition", x: px, y: py + 1, w: 3, d: 1 },
    { kind: "desk", x: px, y: py + 2, w: 3, d: 1 },
    { kind: "chair", x: px + 1, y: py - 1, dir: 1, solid: false },
    { kind: "chair", x: px + 1, y: py + 3, dir: 3, solid: false },
  ];
}

const lobby: Scene = {
  id: "ikoyi-lobby",
  building: "ikoyi-hq",
  level: "ground",
  name: "Ikoyi HQ Lobby",
  subtitle: "Ground floor · Reception",
  cols: 14,
  rows: 12,
  wallHeight: 3.4,
  floor: "marble",
  features: [
    { wall: "x", kind: "slats", from: 0, to: 3 },
    { wall: "x", kind: "moss", from: 3, to: 9 },
    { wall: "x", kind: "slats", from: 9, to: 12 },
    { wall: "y", kind: "windows", from: 0.5, to: 9.5 },
    { wall: "y", kind: "liftdoors", from: 10, to: 13 },
  ],
  objects: [
    { kind: "reception", x: 3, y: 4, w: 1, d: 4 },
    { kind: "planter", x: 4, y: 4, w: 5, d: 1 },
    { kind: "turnstile", x: 9, y: 4 },
    { kind: "turnstile", x: 11, y: 4 },
    { kind: "turnstile", x: 13, y: 4 },
    { kind: "armchair", x: 1, y: 1, dir: 0 },
    { kind: "plant", x: 1, y: 3 },
    { kind: "plant", x: 7, y: 1 },
    { kind: "plant", x: 1, y: 10 },
    { kind: "plant", x: 13, y: 10 },
    { kind: "sofa", x: 5, y: 9, w: 3, d: 1, dir: 3 },
    { kind: "coffeetable", x: 5, y: 7, w: 2, d: 1 },
    { kind: "column", x: 8, y: 7 },
  ],
  npcs: [
    npc("rec1", "Adaeze", "Front desk", 2, 5, 0, look(SKIN.deep, "#14110f", "braids", "#2d5d41", "#14110f", { body: "woman", outfit: "office" })),
    npc("rec2", "Funmi", "Front desk", 2, 7, 0, look(SKIN.brown, "#14110f", "classic", "#e04848", "#14110f", { body: "woman", outfit: "office" })),
    npc("guard1", "Mr Sule", "Security", 9, 5, 1, look(SKIN.deep, "#14110f", "lowcut", "#1d2433", "#1d2433", { body: "man", outfit: "office" })),
  ],
  portals: [{ id: "to-floor", label: "Lifts", x: 10, y: 1, w: 3, d: 1, to: "ikoyi-floor", arrive: { x: 2, y: 11 }, lift: true }],
  hotspots: [{ id: "frontdesk", label: "Front desk", hint: "Sign in and ask about visitors", x: 4, y: 5, kind: "info" }],
  spawn: { x: 11, y: 9 },
};

const floor: Scene = {
  id: "ikoyi-floor",
  building: "ikoyi-hq",
  level: "floor-1",
  name: "Open-plan floor",
  subtitle: "Sample layout (use of this floor to be confirmed)",
  cols: 18,
  rows: 14,
  wallHeight: 3.4,
  floor: "office",
  features: [
    { wall: "x", kind: "glass", from: 1, to: 5 },
    { wall: "x", kind: "screen", from: 6, to: 9 },
    { wall: "x", kind: "liftdoors", from: 10, to: 13 },
    { wall: "y", kind: "windows", from: 0.5, to: 17.5 },
  ],
  objects: [
    ...pod(3, 2),
    ...pod(8, 2),
    ...pod(13, 2),
    ...pod(3, 8),
    ...pod(8, 8),
    ...pod(13, 8),
    { kind: "shelf", x: 1, y: 6, w: 1, d: 3 },
    { kind: "printer", x: 16, y: 12 },
    { kind: "cabinet", x: 12, y: 12, w: 2, d: 1 },
    { kind: "watercooler", x: 10, y: 12 },
    { kind: "plant", x: 6, y: 6 },
    { kind: "plant", x: 11, y: 6 },
    { kind: "plant", x: 16, y: 6 },
    { kind: "plant", x: 1, y: 1 },
  ],
  npcs: [
    npc("col1", "Chidi", "Colleague", 4, 1, 1, look(SKIN.brown, "#14110f", "lowcut", "#f3efe6", "#2b4a7a", { body: "man", outfit: "casual" }), true),
    npc("col2", "Aisha", "Colleague", 9, 1, 1, look(SKIN.medium, "#14110f", "curls", "#2f6fe0", "#14110f", { body: "woman", outfit: "casual", fabric: "adire" }), true),
    npc("col3", "Tobi", "Colleague", 9, 5, 3, look(SKIN.deep, "#14110f", "afro", "#17b2a6", "#1f2a3d", { body: "man", outfit: "hoodie" }), true),
    npc("col4", "Ngozi", "Colleague", 14, 5, 3, look(SKIN.brown, "#14110f", "locs", "#7c5cf0", "#14110f", { body: "woman", outfit: "casual", fabric: "ankara" }), true),
    npc("col5", "Femi", "Colleague", 14, 11, 3, look(SKIN.light, "#2a1d14", "lowcut", "#d4a62a", "#4a4f57", { body: "man", outfit: "casual", fabric: "asooke" }), true),
    npc("col6", "Bayo", "Colleague", 9, 11, 3, look(SKIN.deep, "#14110f", "bald", "#e04848", "#b9a77a", { body: "man", outfit: "sitework" }), true),
  ],
  portals: [
    { id: "to-lobby", label: "Lifts", x: 1, y: 10, w: 1, d: 3, to: "ikoyi-lobby", arrive: { x: 11, y: 2 }, lift: true },
    { id: "to-boardroom", label: "Boardroom", x: 17, y: 1, w: 1, d: 2, to: "ikoyi-boardroom", arrive: { x: 10, y: 5 } },
    { id: "to-lounge", label: "Executive lounge", x: 17, y: 8, w: 1, d: 2, to: "ikoyi-lounge", arrive: { x: 10, y: 5 } },
  ],
  hotspots: [
    { id: "workspace", label: "My Workspace", hint: "Your desk. Customise it and start your day", x: 4, y: 11, kind: "workspace" },
    { id: "coffee", label: "Coffee point", hint: "Recharge with a coffee", x: 15, y: 12, kind: "coffee" },
    { id: "water", label: "Water cooler", hint: "Stay hydrated", x: 10, y: 12, kind: "water" },
    { id: "pantry", label: "Pantry", hint: "Have lunch", x: 12, y: 12, kind: "lunch" },
    { id: "library", label: "Bookshelf", hint: "Read up on something new", x: 1, y: 7, kind: "read" },
  ],
  spawn: { x: 2, y: 11 },
};

const boardroom: Scene = {
  id: "ikoyi-boardroom",
  building: "ikoyi-hq",
  level: "floor-1",
  name: "Boardroom",
  subtitle: "Sample room (floor to be confirmed)",
  cols: 12,
  rows: 10,
  wallHeight: 3.4,
  floor: "marble",
  features: [
    { wall: "x", kind: "screen", from: 3, to: 7 },
    { wall: "y", kind: "windows", from: 1, to: 11 },
  ],
  objects: [
    { kind: "boardtable", x: 3, y: 3, w: 6, d: 4 },
    ...[3, 4, 5, 6, 7, 8].map((x): SceneObject => ({ kind: "chair", x, y: 2, dir: 1, solid: false })),
    ...[3, 4, 5, 6, 7, 8].map((x): SceneObject => ({ kind: "chair", x, y: 7, dir: 3, solid: false })),
    { kind: "chair", x: 2, y: 4, dir: 0, solid: false },
    { kind: "chair", x: 2, y: 5, dir: 0, solid: false },
    { kind: "chair", x: 9, y: 4, dir: 2, solid: false },
    { kind: "chair", x: 9, y: 5, dir: 2, solid: false },
    { kind: "plant", x: 1, y: 1 },
    { kind: "plant", x: 10, y: 1 },
    { kind: "plant", x: 10, y: 8 },
    { kind: "plant", x: 1, y: 8 },
  ],
  npcs: [],
  portals: [{ id: "to-floor", label: "Open-plan floor", x: 11, y: 4, w: 1, d: 2, to: "ikoyi-floor", arrive: { x: 16, y: 1 } }],
  hotspots: [{ id: "board-seat", label: "Take a seat", hint: "Join a meeting here", x: 2, y: 4, kind: "meeting" }],
  spawn: { x: 10, y: 5 },
};

const lounge: Scene = {
  id: "ikoyi-lounge",
  building: "ikoyi-hq",
  level: "floor-1",
  name: "Executive lounge",
  subtitle: "Sample room (floor to be confirmed)",
  cols: 12,
  rows: 10,
  wallHeight: 3.4,
  floor: "marble",
  features: [
    { wall: "x", kind: "slats", from: 0, to: 10 },
    { wall: "y", kind: "windows", from: 1, to: 11 },
  ],
  objects: [
    { kind: "sofa", x: 3, y: 2, w: 3, d: 1, dir: 1 },
    { kind: "sofa", x: 3, y: 6, w: 3, d: 1, dir: 3 },
    { kind: "coffeetable", x: 3, y: 4, w: 3, d: 2 },
    { kind: "armchair", x: 2, y: 4, dir: 0 },
    { kind: "armchair", x: 6, y: 4, dir: 2 },
    { kind: "roundtable", x: 8, y: 6, w: 2, d: 2 },
    { kind: "chair", x: 7, y: 6, dir: 0, solid: false },
    { kind: "chair", x: 10, y: 7, dir: 2, solid: false },
    { kind: "chair", x: 8, y: 5, dir: 1, solid: false },
    { kind: "chair", x: 9, y: 8, dir: 3, solid: false },
    { kind: "plant", x: 1, y: 1 },
    { kind: "plant", x: 10, y: 1 },
    { kind: "plant", x: 1, y: 8 },
  ],
  npcs: [],
  portals: [{ id: "to-floor", label: "Open-plan floor", x: 11, y: 4, w: 1, d: 2, to: "ikoyi-floor", arrive: { x: 16, y: 9 } }],
  hotspots: [
    { id: "client-meeting", label: "Meet a client", hint: "Client meetings start here", x: 7, y: 3, kind: "meeting" },
    { id: "sofa", label: "Sofa", hint: "Take a quiet break", x: 4, y: 2, kind: "rest" },
  ],
  spawn: { x: 10, y: 5 },
};

export const SCENES: Record<string, Scene> = {
  [lobby.id]: lobby,
  [floor.id]: floor,
  [boardroom.id]: boardroom,
  [lounge.id]: lounge,
};

export const FIRST_SCENE = lobby.id;

export function getScene(id: string): Scene | undefined {
  return Object.prototype.hasOwnProperty.call(SCENES, id) ? SCENES[id] : undefined;
}
