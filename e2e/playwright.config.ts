import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const backendPort = process.env.E2E_BACKEND_PORT ?? "3010";
const frontendPort = process.env.E2E_FRONTEND_PORT ?? "5175";
const backendUrl = `http://localhost:${backendPort}`;
const frontendUrl = `http://localhost:${frontendPort}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  reporter: isCi ? "github" : "list",
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `npm run start:e2e`,
      cwd: "../backend",
      url: `${backendUrl}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: backendPort,
        DATABASE_URL: "file:./prisma/e2e.db",
      },
    },
    {
      command: `npm run dev -- --port ${frontendPort}`,
      cwd: "../frontend",
      url: frontendUrl,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_PROXY: backendUrl,
      },
    },
  ],
});
