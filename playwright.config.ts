import { defineConfig, devices } from "@playwright/test";

const deployedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: deployedBaseUrl ?? "http://127.0.0.1:8787",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: deployedBaseUrl
    ? undefined
    : {
        command: "npm run preview",
        url: "http://127.0.0.1:8787/health",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
