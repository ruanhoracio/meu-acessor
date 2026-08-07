import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tarefas = await prisma.tarefa.findMany({
      include: { projeto: true },
      orderBy: { criadoEm: "desc" },
    });
    return NextResponse.json(tarefas);
  } catch (error) {
    console.error("Erro no GET /api/tarefas:", error);
    return NextResponse.json({ error: "Erro ao buscar tarefas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { titulo, descricao, projetoId, prazo, prioridade } = body;

    if (!titulo || !titulo.trim()) {
      return NextResponse.json({ error: "Título é obrigatório." }, { status: 400 });
    }

    const novaTarefa = await prisma.tarefa.create({
      data: {
        titulo: titulo.trim(),
        descricao: descricao || null,
        projetoId: projetoId || null,
        prazo: prazo ? new Date(prazo) : null,
        prioridade: prioridade || "media",
        status: "aberta",
      },
    });

    return NextResponse.json(novaTarefa);
  } catch (error) {
    console.error("Erro no POST /api/tarefas:", error);
    return NextResponse.json({ error: "Erro ao criar tarefa." }, { status: 500 });
  }
}
