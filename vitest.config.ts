import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    passWithNoTests: true,
    include: [
      "apps/**/*.{test,spec}.{ts,tsx}",
      "worker/**/*.{test,spec}.{ts,tsx}",
      "test/**/*.{test,spec}.{ts,tsx}"
    ],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});
