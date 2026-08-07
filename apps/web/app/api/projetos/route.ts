import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projetos = await prisma.projeto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(projetos);
  } catch (error: any) {
    console.error("Erro no GET /api/projetos:", error);
    return NextResponse.json({ error: "Erro ao buscar projetos", details: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, tipo, cor } = body;

    if (!nome || !nome.trim()) {
      return NextResponse.json({ error: "Nome do cliente/projeto é obrigatório." }, { status: 400 });
    }

    const projeto = await prisma.projeto.create({
      data: {
        nome: nome.trim(),
        tipo: (tipo || "cliente") as any,
        cor: cor || "#ff5a3d",
      },
    });

    return NextResponse.json(projeto);
  } catch (error: any) {
    console.error("Erro no POST /api/projetos:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar projeto.",
        details: error?.message || String(error),
        code: error?.code,
        meta: error?.meta,
      },
      { status: 500 }
    );
  }
}
