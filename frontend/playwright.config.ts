import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 3,
  timeout: 40_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:5180",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: "list",
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5180 --strictPort",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: false,
    env: {
      VITE_LOUSA_MODE: process.env.VITE_LOUSA_MODE ?? "demo",
      VITE_LOUSA_TEST_TOOLS: "true",
    },
    timeout: 30_000,
  },
});
