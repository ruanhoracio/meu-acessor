import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const count = await prisma.inboxItem.count({
      where: { status: "pendente" },
    });
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ count: 0 });
  }
}
