import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./jest.setup.ts"],
    // Reset every mock (calls and implementations) before each test, so one
    // test can never leak a return value into the next.
    mockReset: true,
  },
});