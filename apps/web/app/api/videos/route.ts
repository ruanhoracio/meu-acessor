import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      include: { projeto: true },
      orderBy: { criadoEm: "desc" },
    });
    return NextResponse.json(videos);
  } catch (error) {
    console.error("Erro no GET /api/videos:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { titulo, projetoId, formato, estagio, prazoEntrega, estimativaHoras, aguardando, linkBruto } = body;

    if (!titulo || !titulo.trim()) {
      return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
    }

    const video = await prisma.video.create({
      data: {
        titulo: titulo.trim(),
        projetoId: projetoId || null,
        formato: formato || "outro",
        estagio: estagio || "briefing",
        prazoEntrega: prazoEntrega ? new Date(prazoEntrega) : null,
        estimativaHoras: estimativaHoras ? Number(estimativaHoras) : null,
        aguardando: aguardando || "eu",
        linkBruto: linkBruto || null,
      },
      include: { projeto: true },
    });

    return NextResponse.json(video);
  } catch (error) {
    console.error("Erro no POST /api/videos:", error);
    return NextResponse.json({ error: "Erro ao criar vídeo." }, { status: 500 });
  }
}
