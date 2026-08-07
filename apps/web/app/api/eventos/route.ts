import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");

    const where: any = {};
    if (inicio && fim) {
      where.inicio = {
        gte: new Date(inicio),
        lte: new Date(fim),
      };
    }

    const eventos = await prisma.evento.findMany({
      where,
      include: { projeto: true },
      orderBy: { inicio: "asc" },
    });

    return NextResponse.json(eventos);
  } catch (error) {
    console.error("Erro no GET /api/eventos:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { titulo, inicio, fim, projetoId } = body;

    if (!titulo || !titulo.trim()) {
      return NextResponse.json({ error: "Título do evento é obrigatório." }, { status: 400 });
    }

    const dataInicio = inicio ? new Date(inicio) : new Date();
    const dataFim = fim ? new Date(fim) : new Date(dataInicio.getTime() + 60 * 60 * 1000);

    const evento = await prisma.evento.create({
      data: {
        titulo: titulo.trim(),
        inicio: dataInicio,
        fim: dataFim,
        projetoId: projetoId || null,
        origem: "web",
      },
      include: { projeto: true },
    });

    return NextResponse.json(evento);
  } catch (error) {
    console.error("Erro no POST /api/eventos:", error);
    return NextResponse.json({ error: "Erro ao criar evento." }, { status: 500 });
  }
}
