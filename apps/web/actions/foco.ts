"use server";

import prisma from "@meu-assessor/db";
import { revalidatePath } from "next/cache";

export async function iniciarSessaoFoco(videoId: string) {
  try {
    const sessao = await prisma.sessaoFoco.create({
      data: {
        videoId,
        inicio: new Date(),
      },
    });

    revalidatePath(`/pipeline/${videoId}`);
    revalidatePath("/");
    return { success: true, sessaoId: sessao.id };
  } catch (error) {
    console.error("Erro ao iniciar foco:", error);
    return { success: false, error: "Falha ao iniciar sessão de foco." };
  }
}

export async function encerrarSessaoFoco(sessaoId: string) {
  try {
    const sessao = await prisma.sessaoFoco.findUnique({
      where: { id: sessaoId },
    });

    if (!sessao) return { success: false, error: "Sessão não encontrada" };

    const fim = new Date();
    const duracaoMinutos = Math.round((fim.getTime() - sessao.inicio.getTime()) / 60000);

    await prisma.sessaoFoco.update({
      where: { id: sessaoId },
      data: {
        fim,
        duracaoMinutos,
      },
    });

    // Atualiza horas reais no vídeo
    if (sessao.videoId) {
      const totalSessoes = await prisma.sessaoFoco.aggregate({
        where: { videoId: sessao.videoId, duracaoMinutos: { not: null } },
        _sum: { duracaoMinutos: true },
      });

      const totalHoras = ((totalSessoes._sum.duracaoMinutos || 0) + duracaoMinutos) / 60;

      await prisma.video.update({
        where: { id: sessao.videoId },
        data: { horasReais: totalHoras },
      });

      revalidatePath(`/pipeline/${sessao.videoId}`);
    }

    revalidatePath("/");
    return { success: true, duracaoMinutos };
  } catch (error) {
    console.error("Erro ao encerrar foco:", error);
    return { success: false, error: "Falha ao encerrar foco." };
  }
}
