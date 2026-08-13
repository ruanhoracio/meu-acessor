import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Tratar id projetado (ex: cuid_172345678)
    const targetId = id.includes("_") ? id.split("_")[0] : id;

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
    await prisma.evento.delete({ where: { id: targetId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir evento:", error);
    return NextResponse.json({ error: "Erro ao excluir evento." }, { status: 500 });
  }
}
