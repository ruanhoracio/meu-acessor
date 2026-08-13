import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notas = await prisma.nota.findMany({
      include: { projeto: true },
      orderBy: { atualizadoEm: "desc" },
    });
    return NextResponse.json(notas);
  } catch (error) {
    console.error("Erro no GET /api/notas:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { titulo, conteudo, tags, projetoId } = body;

    if (!conteudo || !conteudo.trim()) {
      return NextResponse.json({ error: "Conteúdo da nota é obrigatório." }, { status: 400 });
    }

    const nota = await prisma.nota.create({
      data: {
        titulo: titulo?.trim() || null,
        conteudo: conteudo.trim(),
        tags: Array.isArray(tags) ? tags : [],
        projetoId: projetoId || null,
      },
      include: { projeto: true },
    });

    return NextResponse.json(nota);
  } catch (error) {
    console.error("Erro no POST /api/notas:", error);
    return NextResponse.json({ error: "Erro ao criar nota." }, { status: 500 });
  }
}
