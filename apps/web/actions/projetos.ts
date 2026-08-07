"use server";

import prisma from "@/lib/db";
import type { TipoProjeto } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getProjetos() {
  try {
    return await prisma.projeto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
  } catch (error) {
    console.error("Erro ao buscar projetos:", error);
    return [];
  }
}

export async function criarProjeto(data: {
  nome: string;
  tipo: TipoProjeto;
  cor?: string;
}) {
  try {
    const novoProjeto = await prisma.projeto.create({
      data: {
        nome: data.nome,
        tipo: data.tipo,
        cor: data.cor || "#ff5a3d",
      },
    });

    revalidatePath("/config");
    revalidatePath("/pipeline");
    revalidatePath("/");
    return { success: true, projeto: novoProjeto };
  } catch (error) {
    console.error("Erro ao criar projeto:", error);
    return { success: false, error: "Falha ao criar projeto." };
  }
}

export async function excluirProjeto(projetoId: string) {
  try {
    await prisma.projeto.update({
      where: { id: projetoId },
      data: { ativo: false },
    });

    revalidatePath("/config");
    revalidatePath("/pipeline");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Erro ao desativar projeto:", error);
    return { success: false, error: "Falha ao desativar projeto." };
  }
}
