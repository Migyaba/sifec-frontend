import { defineConfig, devices } from "@playwright/test"

/**
 * Parcours réels : l'interface (Vite, port 5174) contre le vrai backend (port 8000), lancé sur une
 * base jetable par `scripts/e2e-backend.sh`. Voir README, « Parcours Playwright ».
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5174",
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "scripts/e2e-backend.sh",
      url: "http://127.0.0.1:8000/api/v1/health/",
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: "ignore",
    },
    {
      command: "npx vite --port 5174 --strictPort",
      url: "http://localhost:5174/connexion",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
