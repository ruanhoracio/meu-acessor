"use server";

import prisma from "@/lib/db";

export async function getEventos(dataInicio: Date, dataFim: Date) {
  try {
    const eventos = await prisma.evento.findMany({
      where: {
        inicio: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      include: {
        projeto: true,
      },
      orderBy: {
        inicio: "asc",
      },
    });

    return { success: true, eventos };
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return { success: false, eventos: [] };
  }
}
