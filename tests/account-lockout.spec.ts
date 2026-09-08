import { test, expect } from "@playwright/test";
import {
  createThrowawayUser,
  deleteUserByEmail,
  login,
  testPrisma,
  SEED_PASSWORD,
} from "./helpers";

const EMAIL = `test.lockout.${Date.now()}@example.invalid`;

test.describe("Verrouillage de compte après échecs répétés", () => {
  test.beforeAll(async () => {
    await createThrowawayUser({ email: EMAIL, name: "Test Lockout", role: "BM" });
  });
  test.afterAll(async () => {
    await deleteUserByEmail(EMAIL);
    await testPrisma.$disconnect();
  });

  test("le compte se verrouille après 5 échecs et bloque même le bon mot de passe", async ({
    page,
  }) => {
    // MAX_FAILED_LOGIN_ATTEMPTS = 5 (src/lib/constants.ts) — 5 échecs verrouillent le compte.
    for (let i = 0; i < 5; i++) {
      await login(page, EMAIL, "mauvais-mot-de-passe");
      expect(page.url()).toContain("/connexion");
    }

    // Le compte est maintenant verrouillé : même le bon mot de passe échoue.
    await login(page, EMAIL, SEED_PASSWORD);
    expect(page.url()).toContain("/connexion");
    await expect(page.locator("p[role=\"alert\"]")).toBeVisible();

    const user = await testPrisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    expect(user.lockedUntil).not.toBeNull();
    expect(user.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

    const failedLogs = await testPrisma.loginLog.count({
      where: { userId: user.id, success: false },
    });
    expect(failedLogs).toBeGreaterThanOrEqual(5);
  });
});
