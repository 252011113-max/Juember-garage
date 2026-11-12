import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import authConfig from "@/auth.config";
import {
  clearLoginAttempts,
  isLoginRateLimited,
  recordFailedLogin,
} from "@/lib/auth/login-rate-limit";
import { prisma } from "@/lib/prisma";
import { isRole } from "@/lib/roles";
import { loginSchema } from "@/lib/validation/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata sandi", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const address =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";

        if (isLoginRateLimited(email, address)) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        const passwordMatches =
          user !== null &&
          (await bcrypt.compare(parsed.data.password, user.passwordHash));

        if (!user || !user.isActive || !passwordMatches || !isRole(user.role)) {
          recordFailedLogin(email, address);
          return null;
        }

        clearLoginAttempts(email, address);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
