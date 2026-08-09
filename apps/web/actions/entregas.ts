"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getEntregasMensais(projetoId: string | null, mes: number, ano: number) {
  try {
    // Definir intervalo do mês
    const inicioMes = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);

    const whereCondition: any = {
      criadoEm: {
        gte: inicioMes,
        lte: fimMes,
      },
    };

    if (projetoId && projetoId !== "todos") {
      whereCondition.projetoId = projetoId;
    }

    const videos = await prisma.video.findMany({
      where: whereCondition,
      include: {
        projeto: true,
      },
      orderBy: {
        criadoEm: "asc",
      },
    });

    const projetos = await prisma.projeto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });

    return {
      success: true,
      videos: JSON.parse(JSON.stringify(videos)),
      projetos: JSON.parse(JSON.stringify(projetos)),
    };
  } catch (error: any) {
    console.error("[getEntregasMensais Error]:", error);
    return { success: false, error: String(error), videos: [], projetos: [] };
  }
}

export async function toggleVideoConcluido(videoId: string, concluido: boolean) {
  try {
    const videoAtualizado = await prisma.video.update({
      where: { id: videoId },
      data: {
        estagio: concluido ? "entregue" : "briefing",
        entregueEm: concluido ? new Date() : null,
      },
    });

    revalidatePath("/entregas");
    revalidatePath("/pipeline");
    revalidatePath("/");

    return { success: true, video: JSON.parse(JSON.stringify(videoAtualizado)) };
  } catch (error: any) {
    console.error("[toggleVideoConcluido Error]:", error);
    return { success: false, error: String(error) };
  }
}

export async function criarVideoEntrega(data: {
  titulo: string;
  projetoId?: string | null;
  formato?: string;
  mes: number;
  ano: number;
  concluido?: boolean;
}) {
  try {
    if (!data.titulo || !data.titulo.trim()) {
      return { success: false, error: "Título é obrigatório." };
    }

    // Criar com data dentro do mês especificado
    const dataCriacao = new Date(data.ano, data.mes - 1, new Date().getDate(), 12, 0, 0);

    const novoVideo = await prisma.video.create({
      data: {
        titulo: data.titulo.trim(),
        projetoId: data.projetoId && data.projetoId !== "todos" ? data.projetoId : null,
        formato: (data.formato as any) || "outro",
        estagio: data.concluido ? "entregue" : "briefing",
        entregueEm: data.concluido ? new Date() : null,
        criadoEm: dataCriacao,
      },
    });

    revalidatePath("/entregas");
    revalidatePath("/pipeline");
    revalidatePath("/");

    return { success: true, video: JSON.parse(JSON.stringify(novoVideo)) };
  } catch (error: any) {
    console.error("[criarVideoEntrega Error]:", error);
    return { success: false, error: String(error) };
  }
}

export async function excluirVideoEntrega(videoId: string) {
  try {
    await prisma.video.delete({
      where: { id: videoId },
    });

    revalidatePath("/entregas");
    revalidatePath("/pipeline");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("[excluirVideoEntrega Error]:", error);
    return { success: false, error: String(error) };
  }
}
