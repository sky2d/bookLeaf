import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "prisma/**/*.test.ts"],
    // `server-only` throws outside a React Server environment; stub it in unit tests.
    alias: { "server-only": fileURLToPath(new URL("./src/test/serverOnlyStub.ts", import.meta.url)) },
  },
});
