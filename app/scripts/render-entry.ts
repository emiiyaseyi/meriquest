import { SCENES } from "../src/lib/world/scenes";
import { renderScene } from "../src/lib/iso/render";
import "../src/lib/iso/render-flat";
import type { Skin } from "../src/lib/world/types";

export const sceneIds = Object.keys(SCENES);

const me: Skin = { skin: "#8a5a3c", hair: "#14110f", hairStyle: "short", top: "#2d5d41", pants: "#1f2a3d" };

export function renderDemo(ctx: unknown, id: string, mode: "iso" | "flat", logo: unknown, width: number, height: number): void {
  const scene = SCENES[id];
  renderScene(ctx as CanvasRenderingContext2D, scene, {
    mode,
    width,
    height,
    time: 700,
    logo: logo as CanvasImageSource,
    player: { x: scene.spawn.x, y: scene.spawn.y, fx: -1, fy: 0, walking: false, look: me, name: "You" },
    hover: null,
    path: [],
    labels: true,
  });
}
