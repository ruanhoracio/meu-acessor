"use server";

import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";
import { revalidatePath } from "next/cache";

export async function getInboxItems() {
  try {
    const userId = await usuarioAtualId();
    const items = await prisma.inboxItem.findMany({
      where: { userId },
      orderBy: { criadoEm: "desc" },
    });
    return { success: true, items };
  } catch (error) {
    console.error("Erro ao buscar inbox:", error);
    return { success: false, items: [] };
  }
}

export async function marcarInboxProcessado(id: string) {
  try {
    const userId = await usuarioAtualId();
    await prisma.inboxItem.updateMany({
      where: { id, userId },
      data: { status: "processado" },
    });
    revalidatePath("/inbox");
    return { success: true };
  } catch (error) {
    console.error("Erro ao marcar inbox:", error);
    return { success: false, error: "Falha ao atualizar inbox." };
  }
}

export async function marcarTodosInboxProcessados() {
  try {
    await prisma.inboxItem.updateMany({
      where: { status: { not: "processado" }, userId: await usuarioAtualId() },
      data: { status: "processado" },
    });
    revalidatePath("/inbox");
    return { success: true };
  } catch (error) {
    console.error("Erro ao marcar todos inbox:", error);
    return { success: false, error: "Falha ao processar inbox." };
  }
}
