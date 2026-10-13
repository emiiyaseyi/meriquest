import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws outside the React server build; tests run in plain Node.
      "server-only": here("./test/server-only-stub.ts"),
      "@": here("./src"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      STORE: "memory",
      SEED_SAMPLE_STAFF: "true",
      DEFAULT_PASSWORD: "TestDefault#2026!x",
    },
  },
});
