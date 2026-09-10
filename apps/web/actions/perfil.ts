"use server";

import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";

/**
 * Foto de perfil por conta.
 *
 * Antes a foto vivia no localStorage do navegador: quem entrasse no mesmo
 * aparelho via a foto do outro. Agora fica na coluna avatarDataUrl do User
 * — fora do que o Better Auth devolve na sessão, de propósito: uma imagem
 * em base64 não cabe no cookie de cache da sessão.
 */

const LIMITE_BYTES = 400 * 1024;

export async function obterPerfil() {
  try {
    const userId = await usuarioAtualId();
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, avatarDataUrl: true },
    });
    return { success: true, nome: u?.name ?? "", email: u?.email ?? "", avatar: u?.avatarDataUrl ?? null };
  } catch (error: any) {
    return { success: false, nome: "", email: "", avatar: null as string | null };
  }
}

export async function salvarAvatar(dataUrl: string | null) {
  try {
    const userId = await usuarioAtualId();
    if (dataUrl !== null) {
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl)) {
        return { success: false, error: "Formato de imagem inválido." };
      }
      if (dataUrl.length > LIMITE_BYTES) {
        return { success: false, error: "Imagem grande demais (máx. 400 KB)." };
      }
    }
    await prisma.user.update({ where: { id: userId }, data: { avatarDataUrl: dataUrl } });
    return { success: true };
  } catch (error: any) {
    console.error("[salvarAvatar Error]:", error);
    return { success: false, error: String(error?.message || error) };
  }
}
