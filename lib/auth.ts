/**
 * Configuration NextAuth v5 (Auth.js)
 * Providers :
 *   1. Credentials  — login/password local (bcrypt, data/users.json)
 *   2. Keycloak     — OIDC/OAuth2 (activé si AUTH_KEYCLOAK_ID est défini)
 *
 * Les rôles (admin / operator / viewer) sont propagés dans le JWT et la session.
 */
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";
import { getUserByUsername, updateLastLogin } from "./user-store";
import { verifyPassword } from "./user-store";
import type { UserRole } from "@/types";

// ── Augmentation des types NextAuth ──────────────────────────────────────────
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      provider: string;
    } & DefaultSession["user"];
  }
  interface User {
    role?: UserRole;
    provider?: string;
  }
}

// ── Providers actifs ─────────────────────────────────────────────────────────
const providers = [
  Credentials({
    name: "Credentials",
    credentials: {
      username: { label: "Utilisateur", type: "text" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.username || !credentials?.password) return null;

      const user = await getUserByUsername(credentials.username as string);
      if (!user) return null;

      const valid = await verifyPassword(credentials.password as string, user.passwordHash);
      if (!valid) return null;

      await updateLastLogin(user.id);

      return {
        id:       user.id,
        name:     user.username,
        email:    user.email,
        role:     user.role,
        provider: "credentials",
      };
    },
  }),
];

// Keycloak activé uniquement si les variables d'environnement sont définies
if (process.env.AUTH_KEYCLOAK_ID && process.env.AUTH_KEYCLOAK_SECRET && process.env.AUTH_KEYCLOAK_ISSUER) {
  providers.push(
    Keycloak({
      clientId:     process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer:       process.env.AUTH_KEYCLOAK_ISSUER,
    }) as any
  );
}

// ── Export NextAuth ───────────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account }: { token: any; user?: any; account?: any }) {
      if (user) {
        token.sub      = user.id;
        token.role     = (user.role as UserRole) ?? "viewer";
        token.provider = account?.provider ?? "credentials";
      }
      // Pour Keycloak : mapper les rôles depuis le token OIDC
      if (account?.provider === "keycloak" && token) {
        const keycloakRoles = (token.realm_access?.roles as string[]) ?? [];
        if (keycloakRoles.includes("palomalo-admin"))         token.role = "admin";
        else if (keycloakRoles.includes("palomalo-operator")) token.role = "operator";
        else                                                  token.role = "viewer";
        token.provider = "keycloak";
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id       = token.sub ?? "";
        session.user.role     = (token.role as UserRole) ?? "viewer";
        session.user.provider = (token.provider as string) ?? "credentials";
      }
      return session;
    },
  },
});

// ── Helper : vérifier les permissions ────────────────────────────────────────
export function canWrite(role: UserRole): boolean {
  return role === "admin" || role === "operator";
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}
