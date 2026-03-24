import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { checkRateLimit, RATE_LIMITS } from "./rate-limit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Rate limit login attempts by email
        const rateLimitKey = `login:${credentials.email.toLowerCase()}`;
        const { allowed } = checkRateLimit(rateLimitKey, RATE_LIMITS.login);
        if (!allowed) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { organization: true },
        });

        if (!user || !user.isActive) {
          throw new Error("Invalid credentials");
        }

        // Check if account is locked
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          const minutesLeft = Math.ceil(
            (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
          );
          throw new Error(
            `Account locked. Try again in ${minutesLeft} minute(s).`
          );
        }

        // Check if organization is active
        if (!user.organization.isActive) {
          throw new Error("Organization is deactivated. Contact support.");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          // Increment failed attempts
          const failedAttempts = user.failedLoginAttempts + 1;
          const updateData: any = { failedLoginAttempts: failedAttempts };

          if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            updateData.lockedUntil = new Date(
              Date.now() + LOCKOUT_DURATION_MS
            );
          }

          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            throw new Error("Too many failed attempts. Account locked for 15 minutes.");
          }

          throw new Error("Invalid credentials");
        }

        // Reset failed attempts on successful login
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).organizationId = token.organizationId as string;
        (session.user as any).organizationName = token.organizationName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
