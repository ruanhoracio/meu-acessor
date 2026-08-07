"use server";

import prisma from "@meu-assessor/db";
import type { EstagioVideo, FormatoVideo, AguardandoQuem } from "@meu-assessor/db";
import { revalidatePath } from "next/cache";

export async function moverEstagioVideo(videoId: string, novoEstagio: EstagioVideo) {
  try {
    const videoAntigo = await prisma.video.findUnique({
      where: { id: videoId },
      select: { estagio: true },
    });

    if (!videoAntigo) return { success: false, error: "Vídeo não encontrado" };

    const estagioAnterior = videoAntigo.estagio;

    await prisma.$transaction([
      prisma.video.update({
        where: { id: videoId },
        data: {
          estagio: novoEstagio,
          entregueEm: novoEstagio === "entregue" ? new Date() : null,
        },
      }),
      prisma.videoEvento.create({
        data: {
          videoId,
          deEstagio: estagioAnterior,
          paraEstagio: novoEstagio,
        },
      }),
    ]);

    revalidatePath("/pipeline");
    revalidatePath(`/pipeline/${videoId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao mover estágio:", error);
    return { success: false, error: "Falha ao atualizar o banco de dados." };
  }
}

export async function criarVideo(data: {
  titulo: string;
  projetoId?: string;
  formato: FormatoVideo;
  prazoEntrega?: string;
  estimativaHoras?: number;
  aguardando?: AguardandoQuem;
  linkBruto?: string;
}) {
  try {
    const novoVideo = await prisma.video.create({
      data: {
        titulo: data.titulo,
        projetoId: data.projetoId || null,
        formato: data.formato,
        estagio: "briefing",
        prazoEntrega: data.prazoEntrega ? new Date(data.prazoEntrega) : null,
        estimativaHoras: data.estimativaHoras || null,
        aguardando: data.aguardando || "eu",
        linkBruto: data.linkBruto || null,
      },
    });

    revalidatePath("/pipeline");
    revalidatePath("/");
    return { success: true, video: novoVideo };
  } catch (error) {
    console.error("Erro ao criar vídeo:", error);
    return { success: false, error: "Falha ao criar o vídeo." };
  }
}

export async function atualizarLinksVideo(
  videoId: string,
  linkBruto?: string,
  linkEntrega?: string
) {
  try {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        linkBruto,
        linkEntrega,
      },
    });

    revalidatePath(`/pipeline/${videoId}`);
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar links:", error);
    return { success: false, error: "Falha ao atualizar links." };
  }
}

export async function incrementarRodadaAlteracao(videoId: string) {
  try {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        rodadasAlteracao: { increment: 1 },
      },
    });

    revalidatePath(`/pipeline/${videoId}`);
    revalidatePath("/pipeline");
    return { success: true };
  } catch (error) {
    console.error("Erro ao incrementar rodada:", error);
    return { success: false, error: "Falha ao incrementar rodada." };
  }
}
