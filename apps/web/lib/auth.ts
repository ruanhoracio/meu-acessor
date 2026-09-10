import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/db";
import { obterSegredoAuth } from "@/lib/auth-secret";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: obterSegredoAuth(),
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "https://meu-acessor-web.vercel.app",
  emailAndPassword: {
    enabled: true,
    // Cadastro público desligado: contas novas só por quem já está logado
    // (actions/usuarios.ts). App pessoal aberto na internet não pode ter
    // "criar conta" livre.
    disableSignUp: true,
    minPasswordLength: 8,
  },
  session: {
    // Sessão assinada no cookie: o proxy valida sem consultar o banco.
    cookieCache: { enabled: true, maxAge: 60 * 60 },
  },
});
