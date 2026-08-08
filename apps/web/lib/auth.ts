import { betterAuth } from "better-auth";
import prisma from "@/lib/db";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "meu-assessor-secret-key-1025",
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "https://meu-acessor-web.vercel.app",
  emailAndPassword: {
    enabled: true,
  },
});
