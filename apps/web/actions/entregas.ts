"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getEntregasMensais(projetoId: string | null, mes: number, ano: number) {
  try {
    const whereCondition: any = {
      mes,
      ano,
    };

    if (projetoId && projetoId !== "todos") {
      whereCondition.projetoId = projetoId;
    }

    const entregas = await prisma.entregaMensal.findMany({
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
      videos: JSON.parse(JSON.stringify(entregas)),
      projetos: JSON.parse(JSON.stringify(projetos)),
    };
  } catch (error: any) {
    console.error("[getEntregasMensais Error]:", error);
    return { success: false, error: String(error), videos: [], projetos: [] };
  }
}

export async function toggleVideoConcluido(entregaId: string, concluido: boolean) {
  try {
    const entregaAtualizada = await prisma.entregaMensal.update({
      where: { id: entregaId },
      data: {
        concluido,
      },
    });

    revalidatePath("/entregas");
    return { success: true, video: JSON.parse(JSON.stringify(entregaAtualizada)) };
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

    const novaEntrega = await prisma.entregaMensal.create({
      data: {
        titulo: data.titulo.trim(),
        projetoId: data.projetoId && data.projetoId !== "todos" ? data.projetoId : null,
        formato: data.formato || "outro",
        concluido: !!data.concluido,
        mes: data.mes,
        ano: data.ano,
      },
    });

    revalidatePath("/entregas");
    return { success: true, video: JSON.parse(JSON.stringify(novaEntrega)) };
  } catch (error: any) {
    console.error("[criarVideoEntrega Error]:", error);
    return { success: false, error: String(error) };
  }
}

export async function atualizarMetaCliente(projetoId: string, meta: number) {
  try {
    if (!projetoId || projetoId === "todos") return { success: false, error: "Selecione um cliente válido." };

    const projetoAtualizado = await prisma.projeto.update({
      where: { id: projetoId },
      data: { metaVideosMensal: meta },
    });

    revalidatePath("/entregas");
    return { success: true, projeto: JSON.parse(JSON.stringify(projetoAtualizado)) };
  } catch (error: any) {
    console.error("[atualizarMetaCliente Error]:", error);
    return { success: false, error: String(error) };
  }
}

export async function excluirVideoEntrega(entregaId: string) {
  try {
    await prisma.entregaMensal.delete({
      where: { id: entregaId },
    });

    revalidatePath("/entregas");
    return { success: true };
  } catch (error: any) {
    console.error("[excluirVideoEntrega Error]:", error);
    return { success: false, error: String(error) };
  }
}
