"use server";

import { headers } from "next/headers";
import { hashPassword } from "better-auth/crypto";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * Gestão de contas feita por quem já está logado.
 *
 * O cadastro público do Better Auth fica desligado (disableSignUp): num app
 * de uso pessoal, aberto na internet, qualquer um poderia se registrar e ver
 * tudo. Criar usuário aqui exige sessão — na prática, o Ruan cria o acesso
 * da esposa em Configurações.
 */

async function exigirSessao() {
  const sessao = await auth.api.getSession({ headers: await headers() });
  if (!sessao) throw new Error("Não autenticado.");
  return sessao;
}

export async function listarUsuarios() {
  try {
    await exigirSessao();
    const usuarios = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    return { success: true, usuarios: JSON.parse(JSON.stringify(usuarios)) };
  } catch (error: any) {
    return { success: false, error: String(error?.message || error), usuarios: [] };
  }
}

export async function criarUsuario(data: { nome: string; email: string; senha: string }) {
  try {
    await exigirSessao();

    const nome = data.nome.trim();
    const email = data.email.trim().toLowerCase();
    if (!nome) return { success: false, error: "Informe o nome." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: "E-mail inválido." };
    if (data.senha.length < 8) return { success: false, error: "A senha precisa ter pelo menos 8 caracteres." };

    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) return { success: false, error: "Já existe uma conta com esse e-mail." };

    // Mesmo formato que o Better Auth usa ao cadastrar: User + Account
    // "credential" com a senha em hash (scrypt) — o login normal reconhece.
    const senhaHash = await hashPassword(data.senha);
    const id = crypto.randomUUID();
    await prisma.$transaction([
      prisma.user.create({ data: { id, name: nome, email, emailVerified: true } }),
      prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: id,
          providerId: "credential",
          userId: id,
          password: senhaHash,
        },
      }),
    ]);

    return { success: true };
  } catch (error: any) {
    console.error("[criarUsuario Error]:", error);
    return { success: false, error: String(error?.message || error) };
  }
}

export async function excluirUsuario(usuarioId: string) {
  try {
    const sessao = await exigirSessao();
    if (sessao.user.id === usuarioId) {
      return { success: false, error: "Você não pode excluir a própria conta enquanto está logado." };
    }
    const total = await prisma.user.count();
    if (total <= 1) return { success: false, error: "Não dá para excluir o único usuário." };

    // Sessões e contas caem em cascata pela relação
    await prisma.user.delete({ where: { id: usuarioId } });
    return { success: true };
  } catch (error: any) {
    console.error("[excluirUsuario Error]:", error);
    return { success: false, error: String(error?.message || error) };
  }
}
