import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const projetos = await prisma.projeto.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(projetos);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
