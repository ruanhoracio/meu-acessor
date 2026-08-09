"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getEventos(dataInicio: Date, dataFim: Date) {
  try {
    // Buscar todos os eventos no período OU eventos recorrentes
    const eventos = await prisma.evento.findMany({
      where: {
        OR: [
          {
            inicio: {
              gte: dataInicio,
              lte: dataFim,
            },
          },
          {
            recorrencia: { in: ["semanal", "mensal"] },
          },
        ],
      },
      include: {
        projeto: true,
      },
      orderBy: {
        inicio: "asc",
      },
    });

    // Projetar eventos recorrentes (Mensal / Semanal) dentro da janela visualizada se não caírem originalmente nela
    const resultadoProjetado: any[] = [];
    const idsProcessados = new Set();

    for (const evt of eventos) {
      const inicioEvt = new Date(evt.inicio);
      const fimEvt = evt.fim ? new Date(evt.fim) : null;
      const duracaoMs = fimEvt ? fimEvt.getTime() - inicioEvt.getTime() : 3600000; // 1h default

      if (inicioEvt >= dataInicio && inicioEvt <= dataFim) {
        resultadoProjetado.push(evt);
        idsProcessados.add(evt.id);
        continue;
      }

      // Se for recorrente mensal
      if (evt.recorrencia === "mensal") {
        const diaDoMes = inicioEvt.getDate();
        // Projetar para o ano e mês da dataInicio
        const mesTarget = dataInicio.getMonth();
        const anoTarget = dataInicio.getFullYear();

        const dataProjetada = new Date(anoTarget, mesTarget, diaDoMes, inicioEvt.getHours(), inicioEvt.getMinutes());
        if (dataProjetada >= dataInicio && dataProjetada <= dataFim) {
          resultadoProjetado.push({
            ...evt,
            inicio: dataProjetada,
            fim: new Date(dataProjetada.getTime() + duracaoMs),
            isProjetadoRecorrente: true,
          });
        }
      } else if (evt.recorrencia === "semanal") {
        const diaSemanaTarget = inicioEvt.getDay();
        // Iterar pelos dias do intervalo
        const curr = new Date(dataInicio);
        while (curr <= dataFim) {
          if (curr.getDay() === diaSemanaTarget) {
            const dataProjetada = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), inicioEvt.getHours(), inicioEvt.getMinutes());
            resultadoProjetado.push({
              ...evt,
              inicio: dataProjetada,
              fim: new Date(dataProjetada.getTime() + duracaoMs),
              isProjetadoRecorrente: true,
            });
          }
          curr.setDate(curr.getDate() + 1);
        }
      }
    }

    return JSON.parse(JSON.stringify(resultadoProjetado));
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
  recorrencia?: string;
}) {
  try {
    const novoEvento = await prisma.evento.create({
      data: {
        titulo: data.titulo.trim(),
        inicio: data.inicio,
        fim: data.fim,
        projetoId: data.projetoId || null,
        recorrencia: data.recorrencia || "unico",
      },
    });

    revalidatePath("/agenda");
    revalidatePath("/");
    return { success: true, evento: JSON.parse(JSON.stringify(novoEvento)) };
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    return { success: false, error: "Falha ao criar evento." };
  }
}

export async function atualizarEvento(
  eventoId: string,
  data: {
    titulo?: string;
    inicio?: Date;
    fim?: Date;
    projetoId?: string | null;
    recorrencia?: string;
  }
) {
  try {
    const eventoAtualizado = await prisma.evento.update({
      where: { id: eventoId },
      data: {
        ...(data.titulo && { titulo: data.titulo.trim() }),
        ...(data.inicio && { inicio: data.inicio }),
        ...(data.fim && { fim: data.fim }),
        ...(data.projetoId !== undefined && { projetoId: data.projetoId }),
        ...(data.recorrencia !== undefined && { recorrencia: data.recorrencia }),
      },
    });

    revalidatePath("/agenda");
    revalidatePath("/");
    return { success: true, evento: JSON.parse(JSON.stringify(eventoAtualizado)) };
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
    return { success: false, error: "Falha ao atualizar evento." };
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
