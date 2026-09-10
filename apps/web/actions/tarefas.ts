"use server";

import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";
import type { Prioridade, StatusTarefa } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getTarefas() {
  try {
    const userId = await usuarioAtualId();
    return await prisma.tarefa.findMany({
      where: { userId },
      include: { projeto: true },
      orderBy: { criadoEm: "desc" },
    });
  } catch (error) {
    console.error("Erro ao buscar tarefas:", error);
    return [];
  }
}

export async function alternarStatusTarefa(tarefaId: string, statusAtual: StatusTarefa) {
  try {
    const novoStatus: StatusTarefa =
      statusAtual === "concluida" ? "aberta" : "concluida";

    const userId = await usuarioAtualId();
    await prisma.tarefa.updateMany({
      where: { id: tarefaId, userId },
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
    const userId = await usuarioAtualId();
    const novaTarefa = await prisma.tarefa.create({
      data: {
        userId,
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
    const userId = await usuarioAtualId();
    await prisma.tarefa.deleteMany({
      where: { id: tarefaId, userId },
    });

    revalidatePath("/tarefas");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao excluir tarefa:", error);
    return { success: false, error: "Falha ao excluir tarefa." };
  }
}
