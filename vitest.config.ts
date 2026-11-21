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
    // Test-only configuration. The application reads these environment variables at runtime and has no fallback.
    env: {
      // Run tests in UTC like the production server to catch local date boundary errors in Vietnam.
      TZ: "UTC",
      NEXTAUTH_SECRET: "test-secret",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/features/**/*.ts",
        "src/shared/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "src/shared/infrastructure/db.ts",
        "src/features/notifications/infrastructure/backgroundWorker.ts",
      ],
    },
  },
});
