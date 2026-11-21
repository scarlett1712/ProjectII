import { compare } from "bcryptjs";
import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/shared/infrastructure/db";
import { ROUTES } from "@/shared/config/routes";
import { LOGIN_RATE_LIMITED_ERROR } from "@/shared/config/auth";
import { globalRateLimiter } from "./rateLimiter";

/** Allow up to 10 sign-in attempts per email address in a 15-minute window. */
const LOGIN_RATE_LIMIT = { maxRequests: 10, windowMs: 15 * 60 * 1000 };

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email và mật khẩu",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;
        if (!globalRateLimiter.check(`login:${email}`, LOGIN_RATE_LIMIT).success) {
          throw new Error(LOGIN_RATE_LIMITED_ERROR);
        }

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role ?? "USER",
          tokenVersion: user.tokenVersion ?? 0,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: ROUTES.login,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        token.tokenVersion = (user as any).tokenVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "USER";
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, email: true, role: true, tokenVersion: true },
          });
          if (dbUser) {
            // Check if password changed and tokenVersion was bumped
            if (
              token.tokenVersion !== undefined &&
              dbUser.tokenVersion !== undefined &&
              (token.tokenVersion as number) < dbUser.tokenVersion
            ) {
              // Token is revoked! Empty user out so session is invalid
              return {} as any;
            }
            session.user.name = dbUser.name;
            session.user.email = dbUser.email;
            session.user.role = dbUser.role ?? "USER";
          }
        } catch (e) {
          console.error("Error fetching session user name from DB:", e);
        }
      }
      return session;
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);
