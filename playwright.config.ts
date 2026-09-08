import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

// Suite de non-régression sur les parcours critiques (auth, RBAC, verrouillage
// de compte, purge RGPD). Suppose une base seedée (`npm run db:seed`) : les
// comptes de démonstration (admin@societe-conseil.fr, etc.) sont utilisés
// tels quels pour les scénarios non destructifs ; les scénarios destructifs
// (verrouillage) créent et suppriment leurs propres comptes jetables.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Certains environnements d'exécution fournissent un Chromium
        // pré-installé à un chemin fixe (CI restreint côté réseau, sandbox…) ;
        // renseigner PLAYWRIGHT_CHROMIUM_PATH permet de le réutiliser sans
        // déclencher le téléchargement habituel de Playwright.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : undefined,
      },
    },
  ],
});
