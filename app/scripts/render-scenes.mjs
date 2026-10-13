// Developer tool: renders every scene to PNG files so the art can be checked without a browser.
//   npm run render:scenes [outDir]
// Uses the same drawing code as the game (compiled on the fly by tsx-free transpile via esbuild if present).
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? path.join(root, ".renders");
await mkdir(out, { recursive: true });

const { build } = require("esbuild");
const bundle = path.join(out, "_bundle.mjs");
await build({
  entryPoints: [path.join(root, "scripts", "render-entry.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: bundle,
  external: ["@napi-rs/canvas"],
  alias: { "@": path.join(root, "src") },
  logLevel: "error",
});
const mod = await import(pathToFileURL(bundle).href);
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const logo = await loadImage(path.join(root, "public", "brand", "meristem-logo-white.png"));

for (const id of mod.sceneIds) {
  for (const mode of ["iso", "flat"]) {
    const canvas = createCanvas(1280, 760);
    const ctx = canvas.getContext("2d");
    mod.renderDemo(ctx, id, mode, logo, 1280, 760);
    const file = path.join(out, `${id}-${mode}.png`);
    await writeFile(file, canvas.toBuffer("image/png"));
    console.log(file);
  }
}
