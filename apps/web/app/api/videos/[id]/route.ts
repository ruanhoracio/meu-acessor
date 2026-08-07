import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const video = await prisma.video.findUnique({
      where: { id },
      include: { projeto: true },
    });
    if (!video) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
    return NextResponse.json(video);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar vídeo" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { titulo, projetoId, formato, estagio, prazoEntrega, estimativaHoras, aguardando, linkBruto, linkEntrega, rodadasAlteracao } = body;

    const videoAtualizado = await prisma.video.update({
      where: { id },
      data: {
        ...(titulo !== undefined && { titulo: titulo.trim() }),
        ...(projetoId !== undefined && { projetoId: projetoId || null }),
        ...(formato !== undefined && { formato }),
        ...(estagio !== undefined && { estagio }),
        ...(prazoEntrega !== undefined && { prazoEntrega: prazoEntrega ? new Date(prazoEntrega) : null }),
        ...(estimativaHoras !== undefined && { estimativaHoras: Number(estimativaHoras) }),
        ...(aguardando !== undefined && { aguardando }),
        ...(linkBruto !== undefined && { linkBruto }),
        ...(linkEntrega !== undefined && { linkEntrega }),
        ...(rodadasAlteracao !== undefined && { rodadasAlteracao: Number(rodadasAlteracao) }),
      },
      include: { projeto: true },
    });

    return NextResponse.json(videoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar vídeo:", error);
    return NextResponse.json({ error: "Erro ao atualizar vídeo" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.video.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir vídeo:", error);
    return NextResponse.json({ error: "Erro ao excluir vídeo" }, { status: 500 });
  }
}
