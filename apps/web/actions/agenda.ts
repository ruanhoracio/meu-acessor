"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getEventos(dataInicio: Date, dataFim: Date) {
  try {
    // Buscar todos os eventos do usuário
    const eventos = await prisma.evento.findMany({
      include: {
        projeto: true,
      },
      orderBy: {
        inicio: "asc",
      },
    });

    const resultadoProjetado: any[] = [];

    for (const evt of eventos) {
      const inicioEvt = new Date(evt.inicio);
      const fimEvt = evt.fim ? new Date(evt.fim) : new Date(inicioEvt.getTime() + 3600000);
      const duracaoMs = fimEvt.getTime() - inicioEvt.getTime();

      // Evento Único (sem recorrência)
      if (!evt.recorrencia || evt.recorrencia === "unico") {
        if (inicioEvt <= dataFim && fimEvt >= dataInicio) {
          resultadoProjetado.push(evt);
        }
        continue;
      }

      // Evento Fixo Semanal (Repete toda semana)
      if (evt.recorrencia === "semanal") {
        const diaSemanaTarget = inicioEvt.getDay();
        const curr = new Date(dataInicio);
        curr.setHours(0, 0, 0, 0);

        while (curr <= dataFim) {
          if (curr.getDay() === diaSemanaTarget) {
            const dataProjetada = new Date(
              curr.getFullYear(),
              curr.getMonth(),
              curr.getDate(),
              inicioEvt.getHours(),
              inicioEvt.getMinutes()
            );

            resultadoProjetado.push({
              ...evt,
              id: `${evt.id}_${dataProjetada.getTime()}`,
              idOriginal: evt.id,
              inicio: dataProjetada,
              fim: new Date(dataProjetada.getTime() + duracaoMs),
              isProjetadoRecorrente: true,
            });
          }
          curr.setDate(curr.getDate() + 1);
        }
      }

      // Evento Fixo Mensal (Repete todo mês)
      else if (evt.recorrencia === "mensal") {
        const diaDoMesTarget = inicioEvt.getDate();
        const mesTarget = dataInicio.getMonth();
        const anoTarget = dataInicio.getFullYear();

        const dataProjetada = new Date(
          anoTarget,
          mesTarget,
          diaDoMesTarget,
          inicioEvt.getHours(),
          inicioEvt.getMinutes()
        );

        if (dataProjetada >= dataInicio && dataProjetada <= dataFim) {
          resultadoProjetado.push({
            ...evt,
            id: `${evt.id}_${dataProjetada.getTime()}`,
            idOriginal: evt.id,
            inicio: dataProjetada,
            fim: new Date(dataProjetada.getTime() + duracaoMs),
            isProjetadoRecorrente: true,
          });
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
    // Tratar se for id projetado (ex: cuid_172345678)
    const targetId = eventoId.includes("_") ? eventoId.split("_")[0] : eventoId;

    const eventoAtualizado = await prisma.evento.update({
      where: { id: targetId },
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
    const targetId = eventoId.includes("_") ? eventoId.split("_")[0] : eventoId;

    await prisma.evento.delete({
      where: { id: targetId },
    });

    revalidatePath("/agenda");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
    return { success: false, error: "Falha ao excluir evento." };
  }
}
