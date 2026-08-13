import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const referencia = await prisma.referencia.update({
      where: { id },
      data: {
        ...(body.url !== undefined && { url: body.url.trim() }),
        ...(body.titulo !== undefined && { titulo: body.titulo?.trim() || null }),
        ...(body.tags !== undefined && { tags: Array.isArray(body.tags) ? body.tags : [] }),
        ...(body.observacao !== undefined && { observacao: body.observacao?.trim() || null }),
      },
    });

    return NextResponse.json(referencia);
  } catch (error) {
    console.error("Erro ao atualizar referência:", error);
    return NextResponse.json({ error: "Erro ao atualizar referência." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.referencia.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir referência:", error);
    return NextResponse.json({ error: "Erro ao excluir referência." }, { status: 500 });
  }
}
