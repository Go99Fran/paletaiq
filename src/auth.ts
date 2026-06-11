import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertUser } from "@/infrastructure/db/user.mysql.repository";
import type { UserRole } from "@/types/next-auth";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        await upsertUser({
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        });
      } catch (err) {
        // El login no se rompe si la DB está caída; el perfil se sincroniza en el próximo login.
        console.error("No se pudo sincronizar el usuario en la DB:", err);
      }
      return true;
    },
    async jwt({ token }) {
      token.role =
        token.email && adminEmails().includes(token.email.toLowerCase())
          ? "admin"
          : "user";
      return token;
    },
    async session({ session, token }) {
      session.user.role = (token.role as UserRole | undefined) ?? "user";
      return session;
    },
  },
});
