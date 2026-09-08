import { test, expect } from "@playwright/test";
import { createThrowawayUser, deleteUserByEmail, login, testPrisma } from "./helpers";

const DIRECTEUR_EMAIL = `test.directeur.${Date.now()}@example.invalid`;

test.describe("Authentification", () => {
  test("connexion réussie avec des identifiants valides redirige vers /admin", async ({ page }) => {
    await login(page, "admin@societe-conseil.fr");
    expect(page.url()).toContain("/admin");
    expect(page.url()).not.toContain("/connexion");
  });

  test("mot de passe incorrect affiche une erreur générique et ne connecte pas", async ({ page }) => {
    await login(page, "admin@societe-conseil.fr", "mauvais-mot-de-passe");
    expect(page.url()).toContain("/connexion");
    await expect(page.locator("p[role=\"alert\"]")).toBeVisible();
  });
});

test.describe("RBAC", () => {
  test("un BM ne peut pas accéder à la gestion des utilisateurs (réservée admin)", async ({ page }) => {
    await login(page, "sophie.martin@societe-conseil.fr");
    await page.goto("/admin/utilisateurs");
    await page.waitForLoadState("networkidle");
    expect(page.url()).not.toContain("/admin/utilisateurs");
  });

  test("un client ne peut pas accéder au back-office", async ({ page }) => {
    await login(page, "contact@client-demo.fr");
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/bibliotheque");
  });

  test("une page /admin non authentifiée redirige vers /connexion", async ({ page }) => {
    await page.goto("/admin/consultants");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/connexion");
  });

  test.describe("Directeur de BU", () => {
    test.beforeAll(async () => {
      await createThrowawayUser({
        email: DIRECTEUR_EMAIL,
        name: "Test Directeur",
        role: "DIRECTEUR_BU",
      });
    });
    test.afterAll(async () => {
      await deleteUserByEmail(DIRECTEUR_EMAIL);
      await testPrisma.$disconnect();
    });

    test("peut prévisualiser l'espace client /bibliotheque (régression proxy.ts)", async ({ page }) => {
      await login(page, DIRECTEUR_EMAIL);
      await page.goto("/bibliotheque");
      await page.waitForLoadState("networkidle");
      // Avant correctif : redirigé vers /connexion faute d'être dans
      // l'allowlist du middleware pour ce rôle.
      expect(page.url()).not.toContain("/connexion");
      expect(page.url()).toContain("/bibliotheque");
    });

    test("a la vue globale sur le back-office (accès /admin/crm)", async ({ page }) => {
      await login(page, DIRECTEUR_EMAIL);
      await page.goto("/admin/crm");
      await page.waitForLoadState("networkidle");
      expect(page.url()).toContain("/admin/crm");
    });
  });
});
