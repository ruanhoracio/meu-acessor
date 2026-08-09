import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID || "";

function getDiaString(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export async function GET(req: NextRequest) {
  try {
    const agora = new Date();

    // 1. Checagem de Lembretes Agendados (Aviso 5 minutos antes 24/7)
    const lembretesPendentes = await prisma.lembreteAgendado.findMany({
      where: {
        enviado: false,
        horarioNotificar: { lte: agora },
      },
    });

    for (const l of lembretesPendentes) {
      const horAlvoStr = new Date(l.horarioAlvo).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const targetChatId = l.chatId || ALLOWED_CHAT_ID;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: `⏰ *LEMBRETE PROATIVO (Faltam 5 minutos!)*\n\n📌 *${l.mensagem}*\n🕒 Agendado para às *${horAlvoStr}*`,
          parse_mode: "Markdown",
        }),
      });

      await prisma.lembreteAgendado.update({
        where: { id: l.id },
        data: { enviado: true },
      });
    }

    return NextResponse.json({
      status: "ok",
      lembretesProcessados: lembretesPendentes.length,
      timestamp: agora.toISOString(),
    });
  } catch (error: any) {
    console.error("[Cron Rotinas Error]:", error);
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}
