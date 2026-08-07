import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { titulo, projetoId, prioridade, prazo, status, descricao } = body;

    const tarefaAtualizada = await prisma.tarefa.update({
      where: { id },
      data: {
        ...(titulo !== undefined && { titulo: titulo.trim() }),
        ...(projetoId !== undefined && { projetoId: projetoId || null }),
        ...(prioridade !== undefined && { prioridade }),
        ...(prazo !== undefined && { prazo: prazo ? new Date(prazo) : null }),
        ...(status !== undefined && { status }),
        ...(descricao !== undefined && { descricao }),
      },
      include: { projeto: true },
    });

    return NextResponse.json(tarefaAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);
    return NextResponse.json({ error: "Erro ao atualizar tarefa" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.tarefa.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir tarefa:", error);
    return NextResponse.json({ error: "Erro ao excluir tarefa" }, { status: 500 });
  }
}
