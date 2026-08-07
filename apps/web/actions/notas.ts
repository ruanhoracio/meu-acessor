"use server";

import prisma from "@meu-assessor/db";
import { revalidatePath } from "next/cache";

export async function criarNota(data: {
  titulo?: string;
  conteudo: string;
  tags?: string[];
  projetoId?: string;
  videoId?: string;
}) {
  try {
    const novaNota = await prisma.nota.create({
      data: {
        titulo: data.titulo || null,
        conteudo: data.conteudo,
        tags: data.tags || [],
        projetoId: data.projetoId || null,
        videoId: data.videoId || null,
      },
    });

    revalidatePath("/notas");
    if (data.videoId) revalidatePath(`/pipeline/${data.videoId}`);
    return { success: true, nota: novaNota };
  } catch (error) {
    console.error("Erro ao criar nota:", error);
    return { success: false, error: "Falha ao criar nota." };
  }
}

export async function excluirNota(notaId: string) {
  try {
    await prisma.nota.delete({
      where: { id: notaId },
    });

    revalidatePath("/notas");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir nota:", error);
    return { success: false, error: "Falha ao excluir nota." };
  }
}
