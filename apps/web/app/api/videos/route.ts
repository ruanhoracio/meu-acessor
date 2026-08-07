import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      include: { projeto: true },
      orderBy: { criadoEm: "desc" },
    });
    return NextResponse.json(videos);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
