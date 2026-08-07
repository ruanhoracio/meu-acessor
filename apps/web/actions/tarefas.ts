"use server";

import prisma from "@/lib/db";
import type { Prioridade, StatusTarefa } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function alternarStatusTarefa(tarefaId: string, statusAtual: StatusTarefa) {
  try {
    const novoStatus: StatusTarefa =
      statusAtual === "concluida" ? "aberta" : "concluida";

    await prisma.tarefa.update({
      where: { id: tarefaId },
      data: { status: novoStatus },
    });

    revalidatePath("/tarefas");
    revalidatePath("/");
    return { success: true, novoStatus };
  } catch (error) {
    console.error("Erro ao alternar status da tarefa:", error);
    return { success: false, error: "Falha ao atualizar tarefa." };
  }
}

export async function criarTarefa(data: {
  titulo: string;
  descricao?: string;
  projetoId?: string;
  prazo?: string;
  prioridade?: Prioridade;
  recorrencia?: string;
}) {
  try {
    const novaTarefa = await prisma.tarefa.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao || null,
        projetoId: data.projetoId || null,
        prazo: data.prazo ? new Date(data.prazo) : null,
        prioridade: data.prioridade || "media",
        status: "aberta",
        recorrencia: data.recorrencia || null,
      },
    });

    revalidatePath("/tarefas");
    revalidatePath("/");
    return { success: true, tarefa: novaTarefa };
  } catch (error) {
    console.error("Erro ao criar tarefa:", error);
    return { success: false, error: "Falha ao criar tarefa." };
  }
}

export async function excluirTarefa(tarefaId: string) {
  try {
    await prisma.tarefa.delete({
      where: { id: tarefaId },
    });

    revalidatePath("/tarefas");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir tarefa:", error);
    return { success: false, error: "Falha ao excluir tarefa." };
  }
}
