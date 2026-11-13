import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/lib/health/**/*.ts",
        "src/lib/chat/**/*.ts",
        "src/lib/rateLimit.ts",
        "src/lib/api.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "src/lib/db.ts",
        "src/lib/backgroundWorker.ts",
      ],
    },
  },
});
