import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const userId = await usuarioAtualId();
    const dona = await prisma.nota.findFirst({ where: { id, userId }, select: { id: true } });
    if (!dona) return NextResponse.json({ error: "Nota não encontrada." }, { status: 404 });
    const nota = await prisma.nota.update({
      where: { id },
      data: {
        ...(body.titulo !== undefined && { titulo: body.titulo?.trim() || null }),
        ...(body.conteudo !== undefined && { conteudo: body.conteudo.trim() }),
        ...(body.tags !== undefined && { tags: Array.isArray(body.tags) ? body.tags : [] }),
        ...(body.projetoId !== undefined && { projetoId: body.projetoId || null }),
      },
      include: { projeto: true },
    });

    return NextResponse.json(nota);
  } catch (error) {
    console.error("Erro ao atualizar nota:", error);
    return NextResponse.json({ error: "Erro ao atualizar nota." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await usuarioAtualId();
    const { count } = await prisma.nota.deleteMany({ where: { id, userId } });
    if (count === 0) return NextResponse.json({ error: "Nota não encontrada." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir nota:", error);
    return NextResponse.json({ error: "Erro ao excluir nota." }, { status: 500 });
  }
}
