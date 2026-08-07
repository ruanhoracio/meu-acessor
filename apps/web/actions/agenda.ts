"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

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

    return eventos;
  } catch (error) {
    console.error("Erro ao buscar eventos:", error);
    return [];
  }
}

export async function criarEvento(data: {
  titulo: string;
  inicio: Date;
  fim: Date;
  projetoId?: string;
}) {
  try {
    const novoEvento = await prisma.evento.create({
      data: {
        titulo: data.titulo,
        inicio: data.inicio,
        fim: data.fim,
        projetoId: data.projetoId || null,
      },
    });

    revalidatePath("/agenda");
    revalidatePath("/");
    return { success: true, evento: novoEvento };
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    return { success: false, error: "Falha ao criar evento." };
  }
}

export async function excluirEvento(eventoId: string) {
  try {
    await prisma.evento.delete({
      where: { id: eventoId },
    });

    revalidatePath("/agenda");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
    return { success: false, error: "Falha ao excluir evento." };
  }
}
