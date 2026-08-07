"use server";

import prisma from "@meu-assessor/db";

export async function getDashboardData() {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const [tarefasHoje, tarefasConcluidas, videosAtivos, eventosHoje, todosVideosAtivos] = await Promise.all([
      prisma.tarefa.findMany({
        where: {
          status: { in: ["aberta", "fazendo"] },
          OR: [
            { prazo: null },
            { prazo: { lte: amanha } },
          ],
        },
        include: { projeto: true },
        orderBy: { prioridade: "asc" },
      }),
      prisma.tarefa.findMany({
        where: {
          status: "concluida",
          criadoEm: { gte: hoje },
        },
        include: { projeto: true },
      }),
      prisma.video.findMany({
        where: {
          estagio: { notIn: ["entregue", "aprovado"] },
        },
        include: { projeto: true },
        orderBy: { prazoEntrega: "asc" },
      }),
      prisma.evento.findMany({
        where: {
          inicio: { gte: hoje, lt: amanha },
        },
        include: { projeto: true },
        orderBy: { inicio: "asc" },
      }),
      prisma.video.findMany({
        where: { estagio: { notIn: ["entregue", "aprovado"] } },
        select: { estimativaHoras: true, criadoEm: true, id: true },
      }),
    ]);

    // Cálculo de travados (>3 dias)
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

    const travados = todosVideosAtivos.filter(v => v.criadoEm <= tresDiasAtras).length;

    return {
      success: true,
      tarefasHoje,
      tarefasConcluidas,
      videosAtivos,
      eventosHoje,
      travadosCount: travados,
    };
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    return {
      success: false,
      tarefasHoje: [],
      tarefasConcluidas: [],
      videosAtivos: [],
      eventosHoje: [],
      travadosCount: 0,
    };
  }
}
