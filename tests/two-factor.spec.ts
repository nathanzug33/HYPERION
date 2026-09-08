import { test, expect } from "@playwright/test";
import { generate } from "otplib";
import { createThrowawayUser, deleteUserByEmail, login, testPrisma } from "./helpers";

const EMAIL = `test.2fa.${Date.now()}@example.invalid`;

async function logout(page: import("@playwright/test").Page) {
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.click('form[action="/api/logout"] button[type="submit"]'),
  ]);
}

test.describe("Double authentification (2FA)", () => {
  test.beforeAll(async () => {
    await createThrowawayUser({ email: EMAIL, name: "Test 2FA", role: "BM" });
  });
  test.afterAll(async () => {
    await deleteUserByEmail(EMAIL);
    await testPrisma.$disconnect();
  });

  test("activation puis connexion avec code TOTP, puis désactivation", async ({ page }) => {
    await login(page, EMAIL);
    await page.goto("/admin/profil");
    await page.waitForLoadState("networkidle");

    // --- Activation ---
    await page.click('button:has-text("Activer la double authentification")');
    await page.waitForSelector('img[alt="QR code de double authentification"]');
    const manualKey = await page
      .locator("span.font-mono")
      .first()
      .innerText();
    expect(manualKey).toMatch(/^[A-Z2-7]+$/);

    const enrollCode = await generate({ secret: manualKey });
    await page.fill('input[name="code"]', enrollCode);
    await page.click('button:has-text("Confirmer l\'activation")');
    await expect(page.locator("text=Double authentification activée")).toBeVisible();

    const userAfterEnroll = await testPrisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(userAfterEnroll.twoFactorEnabled).toBe(true);

    // --- Connexion avec code requis ---
    await logout(page);
    await page.goto("/connexion");
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', "ChangeMe!2024");
    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.click('button[type="submit"]'),
    ]);
    await expect(page.locator('input[name="code"]')).toBeVisible();

    const loginCode = await generate({ secret: userAfterEnroll.twoFactorSecret! });
    await page.fill('input[name="code"]', loginCode);
    await Promise.all([
      page.waitForURL(/\/admin/, { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);
    expect(page.url()).toContain("/admin");
    expect(page.url()).not.toContain("/connexion");

    // --- Désactivation ---
    await page.goto("/admin/profil");
    await page.waitForLoadState("networkidle");
    await page.fill('input[name="password"]', "ChangeMe!2024");
    await page.click('button:has-text("Désactiver")');
    await expect(page.locator("text=Activer la double authentification")).toBeVisible();

    const userAfterDisable = await testPrisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(userAfterDisable.twoFactorEnabled).toBe(false);
    expect(userAfterDisable.twoFactorSecret).toBeNull();
  });
});
