import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  SESSION_IDLE_TIMEOUT_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
} from "@/lib/constants";
import { verifyTwoFactorCode } from "@/lib/two-factor";

// Signalés depuis authorize() pour que connexion/actions.ts distingue "il
// faut un code 2FA" et "le code fourni est invalide" du cas générique
// "identifiants incorrects" (voir doc CredentialsSignin : `type` reste
// disponible sur l'AuthError attrapée côté Server Action).
export class TwoFactorRequiredError extends CredentialsSignin {
  static type = "TwoFactorRequired";
}
export class InvalidTwoFactorCodeError extends CredentialsSignin {
  static type = "InvalidTwoFactorCode";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    // Déconnexion automatique après une période d'inactivité (§5.1).
    maxAge: SESSION_IDLE_TIMEOUT_MINUTES * 60,
    updateAge: 5 * 60,
  },
  pages: {
    signIn: "/connexion",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        code: { label: "Code de vérification", type: "text" },
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)
          ?.trim()
          .toLowerCase();
        const password = credentials?.password as string | undefined;
        // Un champ absent peut arriver ici sérialisé en la chaîne littérale
        // "undefined" (comportement de signIn() côté next-auth) : à traiter
        // comme "pas de code", pas comme un code invalide.
        const rawCode = (credentials?.code as string | undefined)?.trim();
        const code = rawCode && rawCode !== "undefined" ? rawCode : null;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        // Compte temporairement verrouillé après trop d'échecs consécutifs :
        // aucun essai supplémentaire n'est décompté tant que le verrou tient.
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const attempts = user.failedLoginAttempts + 1;
          const lock = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: lock ? 0 : attempts,
              lockedUntil: lock
                ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
                : null,
            },
          });
          await prisma.loginLog.create({
            data: { userId: user.id, success: false },
          });
          return null;
        }

        if (user.twoFactorEnabled) {
          if (!code) {
            throw new TwoFactorRequiredError();
          }
          const codeValid = await verifyTwoFactorCode(user.twoFactorSecret!, code);
          if (!codeValid) {
            await prisma.loginLog.create({
              data: { userId: user.id, success: false },
            });
            throw new InvalidTwoFactorCodeError();
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
        });
        await prisma.loginLog.create({
          data: { userId: user.id, success: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          clientOrganizationId: user.clientOrganizationId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.clientOrganizationId = user.clientOrganizationId ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.clientOrganizationId =
          (token.clientOrganizationId as string | null) ?? null;
      }
      return session;
    },
  },
});
