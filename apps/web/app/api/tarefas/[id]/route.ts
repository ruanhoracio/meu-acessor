import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { titulo, projetoId, prioridade, prazo, status, descricao } = body;
    const userId = await usuarioAtualId();
    const dona = await prisma.tarefa.findFirst({ where: { id, userId }, select: { id: true } });
    if (!dona) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

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
    const userId = await usuarioAtualId();
    const { count } = await prisma.tarefa.deleteMany({ where: { id, userId } });
    if (count === 0) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir tarefa:", error);
    return NextResponse.json({ error: "Erro ao excluir tarefa" }, { status: 500 });
  }
}
