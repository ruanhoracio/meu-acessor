"use server";

import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";

/**
 * Cofre de logins e senhas — o servidor só vê texto cifrado.
 *
 * `cifra` chega pronta do navegador (AES-GCM com chave derivada da senha de
 * login; ver lib/cofre-crypto.ts). Aqui não há como decifrar nada: estas
 * ações apenas guardam e devolvem blobs, sempre restritos ao usuário logado.
 */

const LIMITE_CIFRA = 32 * 1024;

export async function obterCofreSalt() {
  try {
    const userId = await usuarioAtualId();
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { cofreSalt: true } });
    return { success: true, salt: u?.cofreSalt ?? null };
  } catch {
    return { success: false, salt: null as string | null };
  }
}

export async function obterCofre() {
  try {
    const userId = await usuarioAtualId();
    const [u, itens] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { cofreSalt: true, cofreVerificador: true } }),
      prisma.cofreItem.findMany({
        where: { userId },
        orderBy: [{ favorito: "desc" }, { nome: "asc" }],
        select: { id: true, nome: true, categoria: true, favorito: true, cifra: true, atualizadoEm: true },
      }),
    ]);
    return {
      success: true,
      salt: u?.cofreSalt ?? null,
      verificador: u?.cofreVerificador ?? null,
      itens: JSON.parse(JSON.stringify(itens)) as {
        id: string; nome: string; categoria: string | null; favorito: boolean; cifra: string; atualizadoEm: string;
      }[],
    };
  } catch (error: any) {
    return { success: false, error: String(error?.message || error), salt: null, verificador: null, itens: [] };
  }
}

/** Primeiro uso: registra salt e verificador. Não sobrescreve um cofre existente. */
export async function inicializarCofre(salt: string, verificador: string) {
  try {
    const userId = await usuarioAtualId();
    const atual = await prisma.user.findUnique({ where: { id: userId }, select: { cofreSalt: true } });
    if (atual?.cofreSalt) return { success: false, error: "O cofre já foi criado." };
    await prisma.user.update({ where: { id: userId }, data: { cofreSalt: salt, cofreVerificador: verificador } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: String(error?.message || error) };
  }
}

export async function salvarItemCofre(data: {
  id?: string;
  nome: string;
  categoria?: string | null;
  favorito?: boolean;
  cifra: string;
}) {
  try {
    const userId = await usuarioAtualId();
    const nome = data.nome.trim();
    if (!nome) return { success: false, error: "Dê um nome ao login (ex.: Google Drive)." };
    if (!data.cifra || data.cifra.length > LIMITE_CIFRA) return { success: false, error: "Conteúdo inválido." };

    if (data.id) {
      const dono = await prisma.cofreItem.findFirst({ where: { id: data.id, userId }, select: { id: true } });
      if (!dono) return { success: false, error: "Item não encontrado." };
      const item = await prisma.cofreItem.update({
        where: { id: data.id },
        data: { nome, categoria: data.categoria || null, favorito: !!data.favorito, cifra: data.cifra },
      });
      return { success: true, item: JSON.parse(JSON.stringify(item)) };
    }

    const item = await prisma.cofreItem.create({
      data: { userId, nome, categoria: data.categoria || null, favorito: !!data.favorito, cifra: data.cifra },
    });
    return { success: true, item: JSON.parse(JSON.stringify(item)) };
  } catch (error: any) {
    console.error("[salvarItemCofre Error]:", error);
    return { success: false, error: String(error?.message || error) };
  }
}

export async function alternarFavoritoCofre(id: string, favorito: boolean) {
  try {
    const userId = await usuarioAtualId();
    await prisma.cofreItem.updateMany({ where: { id, userId }, data: { favorito } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: String(error?.message || error) };
  }
}

export async function excluirItemCofre(id: string) {
  try {
    const userId = await usuarioAtualId();
    const { count } = await prisma.cofreItem.deleteMany({ where: { id, userId } });
    return count > 0 ? { success: true } : { success: false, error: "Item não encontrado." };
  } catch (error: any) {
    return { success: false, error: String(error?.message || error) };
  }
}

/**
 * Troca de senha: o navegador recifra tudo com a chave nova e manda de uma
 * vez. Tudo ou nada — se algo falhar, o cofre continua na chave antiga.
 */
export async function reencriptarCofre(data: { salt: string; verificador: string; itens: { id: string; cifra: string }[] }) {
  try {
    const userId = await usuarioAtualId();
    const meus = await prisma.cofreItem.findMany({ where: { userId }, select: { id: true } });
    const ids = new Set(meus.map((i) => i.id));
    if (data.itens.length !== ids.size || data.itens.some((i) => !ids.has(i.id))) {
      return { success: false, error: "Lista de itens não confere com o cofre atual. Recarregue e tente de novo." };
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { cofreSalt: data.salt, cofreVerificador: data.verificador } }),
      ...data.itens.map((i) => prisma.cofreItem.update({ where: { id: i.id }, data: { cifra: i.cifra } })),
    ]);
    return { success: true };
  } catch (error: any) {
    console.error("[reencriptarCofre Error]:", error);
    return { success: false, error: String(error?.message || error) };
  }
}
