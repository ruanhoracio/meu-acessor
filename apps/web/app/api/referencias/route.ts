import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const referencias = await prisma.referencia.findMany({
      orderBy: { criadoEm: "desc" },
    });
    return NextResponse.json(referencias);
  } catch (error) {
    console.error("Erro no GET /api/referencias:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, titulo, tags, observacao } = body;

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "URL da referência é obrigatória." }, { status: 400 });
    }

    const referencia = await prisma.referencia.create({
      data: {
        url: url.trim(),
        titulo: titulo?.trim() || null,
        tags: Array.isArray(tags) ? tags : [],
        observacao: observacao?.trim() || null,
      },
    });

    return NextResponse.json(referencia);
  } catch (error) {
    console.error("Erro no POST /api/referencias:", error);
    return NextResponse.json({ error: "Erro ao salvar referência." }, { status: 500 });
  }
}
