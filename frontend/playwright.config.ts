import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * E2E: boots a throwaway backend (own SQLite file, port 8765) and a Vite dev server
 * proxied to it (port 5174), then runs the specs in ./e2e against http://localhost:5174.
 * Override with E2E_BACKEND_PORT / E2E_FRONTEND_PORT if those ports are taken.
 */
const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? 8765);
const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? 5174);
const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, "../backend");
const venvBin = path.join(backendDir, ".venv", "bin");

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: [
        `rm -f e2e.db`,
        `${venvBin}/alembic upgrade head`,
        `${venvBin}/uvicorn app.main:app --port ${BACKEND_PORT}`,
      ].join(" && "),
      cwd: backendDir,
      url: `http://127.0.0.1:${BACKEND_PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_URL: "sqlite:///./e2e.db",
        FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`,
        JWT_SECRET: "e2e-only-secret",
      },
    },
    {
      command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}/`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_API_TARGET: `http://127.0.0.1:${BACKEND_PORT}` },
    },
  ],
});
