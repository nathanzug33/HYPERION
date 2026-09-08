import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { Page } from "@playwright/test";

// Client Prisma dédié aux tests (process séparé du serveur Next.js) —
// utilisé uniquement pour préparer/nettoyer des comptes jetables autour des
// scénarios destructifs (verrouillage, RBAC par rôle non seedé).
export const testPrisma = new PrismaClient();

export const SEED_PASSWORD = "ChangeMe!2024";

export async function createThrowawayUser(params: {
  email: string;
  name: string;
  role: "ADMIN" | "DIRECTEUR_BU" | "BM" | "CLIENT";
  password?: string;
}) {
  const passwordHash = await bcrypt.hash(params.password ?? SEED_PASSWORD, 12);
  return testPrisma.user.create({
    data: {
      email: params.email,
      name: params.name,
      role: params.role,
      passwordHash,
    },
  });
}

export async function deleteUserByEmail(email: string) {
  await testPrisma.user.deleteMany({ where: { email } });
}

export async function login(page: Page, email: string, password = SEED_PASSWORD) {
  await page.goto("/connexion");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.click('button[type="submit"]'),
  ]);
}
