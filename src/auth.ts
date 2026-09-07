import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SESSION_IDLE_TIMEOUT_MINUTES } from "@/lib/constants";

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
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)
          ?.trim()
          .toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
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
