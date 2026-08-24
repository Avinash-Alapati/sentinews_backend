import NextAuth, { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { verifyUserCredentials, findOrCreateGoogleUser } from "@/modules/auth/services/auth.service";
import {
  recordLoginHistory,
  sendLoginAlertEmail,
  shouldSendLoginAlert,
} from "@/modules/auth/services/security.service";
import { resetLoginAttempts } from "@/services/loginRateLimitService";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt" as const,
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const forwardedFor = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
        const ipAddress = forwardedFor.split(",")[0]?.trim() ?? "unknown";

        const user = await verifyUserCredentials({
          email,
          password,
        });

        if (!user || "blocked" in user) {
          return null;
        }

        await resetLoginAttempts({
          ipAddress,
          email,
        });

        const userAgent = request.headers.get("user-agent");
        const shouldAlert = await shouldSendLoginAlert({ userId: user.id, ipAddress, userAgent });
        await recordLoginHistory({ user: { id: user.id }, ipAddress, userAgent, location: null });

        if (shouldAlert) {
          await sendLoginAlertEmail({
            to: user.email,
            ipAddress,
            browser: null,
            operatingSystem: null,
            location: null,
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                scope: "openid profile email",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google" && profile) {
        const googleUser = await findOrCreateGoogleUser({
          googleId: profile.sub as string,
          email: profile.email as string,
          name:
            (profile.name as string | undefined) ??
            (profile.email?.split("@")[0] as string) ??
            "Google User",
          image: profile.picture as string | undefined,
        });

        token.id = googleUser.id;
        token.role = googleUser.role;
        token.email = googleUser.email;
        token.name = googleUser.name;
        token.picture = googleUser.image;
      }

      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
