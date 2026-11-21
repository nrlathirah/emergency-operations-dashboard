import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.js"],
    // Each test file gets its own throwaway in-memory SQLite database,
    // seeded fresh — never touches data/dev.sqlite or any real database.
    env: {
      SQLITE_STORAGE: ":memory:",
      DATABASE_URL: "",
      JWT_SECRET: "test-secret-not-used-anywhere-else",
      NODE_ENV: "test",
    },
    // Seeding hashes ~13 passwords with bcrypt — give setup some headroom.
    hookTimeout: 30000,
    testTimeout: 15000,
    fileParallelism: false,
  },
});
