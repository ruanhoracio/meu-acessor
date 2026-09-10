import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const count = await prisma.inboxItem.count({
      where: { status: "pendente", userId: await usuarioAtualId() },
    });
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ count: 0 });
  }
}
