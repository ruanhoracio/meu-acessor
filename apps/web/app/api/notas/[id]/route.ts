import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

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
    await prisma.nota.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir nota:", error);
    return NextResponse.json({ error: "Erro ao excluir nota." }, { status: 500 });
  }
}
