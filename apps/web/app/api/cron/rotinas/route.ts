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

async function enviarResumoAgendado(tipo: "08" | "16" | "19") {
  const hoje = new Date();
  const hojeStr = getDiaString(hoje);
  const chaveDigest = `digest_${tipo}_${hojeStr}`;

  const jaEnviado = await prisma.lembreteEnviado.findFirst({
    where: { tipo: chaveDigest },
  });

  if (jaEnviado) return false;

  // 1. Tarefas de HOJE
  const tarefas = await prisma.tarefa.findMany({
    where: { status: "aberta" },
    include: { projeto: true },
  });

  const tarefasHoje = tarefas.filter((t) => {
    if (!t.prazo) return true;
    return getDiaString(new Date(t.prazo)) <= hojeStr;
  });

  // 2. Agenda de HOJE
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
  const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

  const eventosHoje = await prisma.evento.findMany({
    where: {
      inicio: { gte: inicioDia, lte: fimDia },
    },
    include: { projeto: true },
  });

  // 3. Entregas Pendentes
  const entregas = await prisma.entregaMensal.findMany({
    where: { mes: hoje.getMonth() + 1, ano: hoje.getFullYear(), concluido: false },
    include: { projeto: true },
  });

  const tituloHeader =
    tipo === "08"
      ? "☀️ *Resumo Matinal das 08:00*"
      : tipo === "16"
      ? "⚡ *Acompanhamento da Tarde das 16:00*"
      : "🌙 *Resumo da Noite das 19:00*";

  let msg = `${tituloHeader}\n\n`;

  if (tarefasHoje.length > 0) {
    msg += `📋 *Tarefas do Dia (${tarefasHoje.length}):*\n`;
    tarefasHoje.slice(0, 10).forEach((t) => {
      msg += `• ${t.titulo}${t.projeto ? ` _(${t.projeto.nome})_` : ""}\n`;
    });
    msg += `\n`;
  } else {
    msg += `📋 *Tarefas do Dia:* Nenhuma tarefa pendente!\n\n`;
  }

  if (eventosHoje.length > 0) {
    msg += `📅 *Agenda de Hoje (${eventosHoje.length}):*\n`;
    eventosHoje.forEach((e) => {
      const horaStr = new Date(e.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      msg += `• ${horaStr} — ${e.titulo}\n`;
    });
    msg += `\n`;
  }

  if (entregas.length > 0) {
    msg += `🎬 *Entregas Pendentes do Mês (${entregas.length}):*\n`;
    entregas.slice(0, 5).forEach((e) => {
      msg += `• ${e.titulo}${e.projeto ? ` _(${e.projeto.nome})_` : ""}\n`;
    });
  }

  const targetChatId = ALLOWED_CHAT_ID || "733888488";

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: targetChatId,
      text: msg,
      parse_mode: "Markdown",
    }),
  });

  await prisma.lembreteEnviado.create({
    data: {
      tipo: chaveDigest,
      entidadeId: "cron_digest",
    },
  });

  return true;
}

export async function GET(req: NextRequest) {
  try {
    const agora = new Date();
    // Ajuste de fuso horário BRT (UTC-3)
    const horaBRT = new Date(agora.getTime() - 3 * 60 * 60 * 1000).getUTCHours();

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

    // 2. Disparos dos Resumos Diários das 08:00, 16:00 e 19:00
    if (horaBRT >= 8 && horaBRT < 16) {
      await enviarResumoAgendado("08");
    }
    if (horaBRT >= 16 && horaBRT < 19) {
      await enviarResumoAgendado("16");
    }
    if (horaBRT >= 19) {
      await enviarResumoAgendado("19");
    }

    return NextResponse.json({
      status: "ok",
      horaBRT,
      lembretesProcessados: lembretesPendentes.length,
      timestamp: agora.toISOString(),
    });
  } catch (error: any) {
    console.error("[Cron Rotinas Error]:", error);
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}
