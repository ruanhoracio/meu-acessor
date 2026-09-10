import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Tratar id projetado (ex: cuid_172345678)
    const targetId = id.includes("_") ? id.split("_")[0] : id;

    const userId = await usuarioAtualId();
    const dono = await prisma.evento.findFirst({ where: { id: targetId, userId }, select: { id: true } });
    if (!dono) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    const updated = await prisma.evento.update({
      where: { id: targetId },
      data: {
        ...(body.titulo && { titulo: body.titulo.trim() }),
        ...(body.inicio && { inicio: new Date(body.inicio) }),
        ...(body.fim && { fim: new Date(body.fim) }),
        ...(body.projetoId !== undefined && { projetoId: body.projetoId || null }),
        ...(body.recorrencia !== undefined && { recorrencia: body.recorrencia }),
      },
      include: { projeto: true },
    });

    return NextResponse.json({ success: true, evento: updated });
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
    return NextResponse.json({ error: "Erro ao atualizar evento." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const targetId = id.includes("_") ? id.split("_")[0] : id;
    const userId = await usuarioAtualId();
    const { count } = await prisma.evento.deleteMany({ where: { id: targetId, userId } });
    if (count === 0) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
    return NextResponse.json({ error: "Erro ao excluir evento." }, { status: 500 });
  }
}
