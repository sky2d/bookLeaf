import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorizeCredentials } from "@/server/auth/credentials";

/**
 * Auth.js (NextAuth v5) — email/password via the Credentials provider.
 * Sessions are stateless JWTs in an httpOnly cookie; the token carries the user's
 * id, role and authorId so route handlers can authorize without a DB round-trip.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 }, // 12h working session
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (credentials) => authorizeCredentials(credentials),
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on sign-in; copy our fields into the token once.
      if (user) {
        token.uid = user.id!;
        token.role = user.role;
        token.authorId = user.authorId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid;
      session.user.role = token.role;
      session.user.authorId = token.authorId;
      return session;
    },
  },
});
