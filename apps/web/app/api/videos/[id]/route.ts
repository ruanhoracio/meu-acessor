import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";
import { NextResponse } from "next/server";
import { sincronizarEntregaDoVideo } from "@/lib/sincronizar-entrega";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await usuarioAtualId();
    const video = await prisma.video.findFirst({
      where: { id, userId },
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

    // Só a server action registrava entregueEm; esta rota (Kanban, Tarefas)
    // deixava a data em branco e a entrega cairia no mês errado.
    const userId = await usuarioAtualId();
    const atual = await prisma.video.findFirst({ where: { id, userId }, select: { entregueEm: true } });
    if (!atual) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
    const entregueEm =
      estagio === "entregue"
        ? atual?.entregueEm ?? new Date()
        : estagio !== undefined
          ? null
          : undefined;

    const videoAtualizado = await prisma.video.update({
      where: { id },
      data: {
        ...(titulo !== undefined && { titulo: titulo.trim() }),
        ...(projetoId !== undefined && { projetoId: projetoId || null }),
        ...(formato !== undefined && { formato }),
        ...(estagio !== undefined && { estagio }),
        ...(entregueEm !== undefined && { entregueEm }),
        ...(prazoEntrega !== undefined && { prazoEntrega: prazoEntrega ? new Date(prazoEntrega) : null }),
        ...(estimativaHoras !== undefined && { estimativaHoras: Number(estimativaHoras) }),
        ...(aguardando !== undefined && { aguardando }),
        ...(linkBruto !== undefined && { linkBruto }),
        ...(linkEntrega !== undefined && { linkEntrega }),
        ...(rodadasAlteracao !== undefined && { rodadasAlteracao: Number(rodadasAlteracao) }),
      },
      include: { projeto: true },
    });

    // Título, cliente, formato ou estágio mudaram → espelha na aba Entregas
    await sincronizarEntregaDoVideo(id);

    return NextResponse.json(videoAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar vídeo:", error);
    return NextResponse.json({ error: "Erro ao atualizar vídeo" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await usuarioAtualId();
    const { count } = await prisma.video.deleteMany({ where: { id, userId } });
    if (count === 0) return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir vídeo:", error);
    return NextResponse.json({ error: "Erro ao excluir vídeo" }, { status: 500 });
  }
}
