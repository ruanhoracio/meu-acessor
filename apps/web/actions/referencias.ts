"use server";

import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";
import { revalidatePath } from "next/cache";

export async function criarReferencia(data: {
  url: string;
  titulo?: string;
  tags?: string[];
  observacao?: string;
  thumbnail?: string;
}) {
  try {
    const userId = await usuarioAtualId();
    const novaRef = await prisma.referencia.create({
      data: {
        userId,
        url: data.url,
        titulo: data.titulo || null,
        tags: data.tags || [],
        observacao: data.observacao || null,
        thumbnail: data.thumbnail || null,
      },
    });

    revalidatePath("/referencias");
    return { success: true, referencia: novaRef };
  } catch (error) {
    console.error("Erro ao criar referência:", error);
    return { success: false, error: "Falha ao salvar referência." };
  }
}
