"use server";

import prisma from "@meu-assessor/db";
import { revalidatePath } from "next/cache";

export async function getInboxItems() {
  try {
    const items = await prisma.inboxItem.findMany({
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
    await prisma.inboxItem.update({
      where: { id },
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
      where: { status: { not: "processado" } },
      data: { status: "processado" },
    });
    revalidatePath("/inbox");
    return { success: true };
  } catch (error) {
    console.error("Erro ao marcar todos inbox:", error);
    return { success: false, error: "Falha ao processar inbox." };
  }
}
