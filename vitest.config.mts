import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**"],
      reporter: ["text", "lcov", "json-summary"],
      thresholds: { lines: 70, branches: 70, functions: 70, statements: 70 },
    },
  },
});
