import { defineConfig, devices } from "@playwright/test";

// BASE_URL points the suite at a deployed build (smoke test); otherwise a local dev server is started.
const BASE = process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: { baseURL: BASE ?? "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Pixel 7"], browserName: "chromium" } }],
  webServer: BASE ? undefined : {
    command: "NEXT_PUBLIC_API_MODE=mock npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
