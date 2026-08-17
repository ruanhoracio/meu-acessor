import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { enviarTelegram, escaparMarkdown, telegramConfigurado } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID || "";

// Brasil não usa horário de verão: UTC-3 o ano inteiro.
const BRT_OFFSET_HORAS = 3;

/** Componentes de calendário do instante informado, no fuso de Brasília. */
function partesBRT(data: Date) {
  const d = new Date(data.getTime() - BRT_OFFSET_HORAS * 3600000);
  return {
    ano: d.getUTCFullYear(),
    mes: d.getUTCMonth(),
    dia: d.getUTCDate(),
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
    diaSemana: d.getUTCDay(),
  };
}

/** "YYYY-MM-DD" do dia em Brasília — usado como chave de idempotência. */
function diaBRT(data: Date): string {
  const p = partesBRT(data);
  return `${p.ano}-${String(p.mes + 1).padStart(2, "0")}-${String(p.dia).padStart(2, "0")}`;
}

/** Instante UTC correspondente à meia-noite (BRT) do dia informado. */
function inicioDoDiaBRT(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes, dia, BRT_OFFSET_HORAS, 0, 0, 0));
}

function horaBRTFormatada(data: Date): string {
  return data.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dataBRTFormatada(data: Date): string {
  return data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Eventos que ocorrem no dia BRT informado, projetando recorrências
 * (semanal/mensal) — mesma lógica da agenda do app. Sem isso, "Culto toda
 * semana" só aparecia no resumo na data original em que foi criado.
 */
async function eventosDoDiaBRT(ano: number, mes: number, dia: number) {
  const todos = await prisma.evento.findMany({ include: { projeto: true } });

  const inicioDia = inicioDoDiaBRT(ano, mes, dia);
  const fimDia = new Date(inicioDia.getTime() + 24 * 3600000 - 1);
  // Normaliza estouro de mês (ex.: dia 32 vira dia 1 do mês seguinte)
  const pDiaAlvo = partesBRT(inicioDia);
  const ocorrencias: { evento: (typeof todos)[number]; inicio: Date }[] = [];

  for (const evt of todos) {
    const inicioEvt = new Date(evt.inicio);

    if (!evt.recorrencia || evt.recorrencia === "unico") {
      if (inicioEvt >= inicioDia && inicioEvt <= fimDia) {
        ocorrencias.push({ evento: evt, inicio: inicioEvt });
      }
      continue;
    }

    // Ocorrência candidata: mesmo horário BRT do evento original, no dia alvo
    const pEvt = partesBRT(inicioEvt);
    const candidato = new Date(
      Date.UTC(pDiaAlvo.ano, pDiaAlvo.mes, pDiaAlvo.dia, pEvt.hora + BRT_OFFSET_HORAS, pEvt.minuto, 0, 0)
    );
    if (candidato < inicioEvt) continue; // antes da primeira ocorrência

    const bate =
      evt.recorrencia === "semanal"
        ? pDiaAlvo.diaSemana === pEvt.diaSemana
        : evt.recorrencia === "mensal"
          ? pEvt.dia === pDiaAlvo.dia
          : false;

    if (bate) ocorrencias.push({ evento: evt, inicio: candidato });
  }

  ocorrencias.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  return ocorrencias;
}

/** Registra o envio só depois de confirmado, para não "queimar" o lembrete do dia. */
async function enviarERegistrar(chave: string, texto: string, chatId: string): Promise<boolean> {
  const jaEnviado = await prisma.lembreteEnviado.findFirst({ where: { tipo: chave } });
  if (jaEnviado) return false;

  const resultado = await enviarTelegram(chatId, texto);
  if (!resultado.ok) {
    console.error(`[Cron] Falha ao enviar "${chave}":`, resultado.erro);
    return false;
  }

  await prisma.lembreteEnviado.create({
    data: { tipo: chave, entidadeId: "cron" },
  });
  return true;
}

// ── Resumo diário (08:00 e 16:00 BRT) ──────────────────────────────
async function enviarResumoAgendado(tipo: "08" | "16", agora: Date, chatId: string) {
  const hojeStr = diaBRT(agora);
  const p = partesBRT(agora);

  const tarefas = await prisma.tarefa.findMany({
    where: { status: { in: ["aberta", "fazendo"] } },
    include: { projeto: true },
    orderBy: { prioridade: "asc" },
  });
  const tarefasHoje = tarefas.filter((t) => !t.prazo || diaBRT(new Date(t.prazo)) <= hojeStr);

  // Inclui recorrentes (semanal/mensal) projetados para hoje
  const eventosHoje = await eventosDoDiaBRT(p.ano, p.mes, p.dia);

  const entregas = await prisma.entregaMensal.findMany({
    where: { mes: p.mes + 1, ano: p.ano, concluido: false },
    include: { projeto: true },
  });

  let msg =
    tipo === "08"
      ? `☀️ *Bom dia, Ruan!* Seu resumo de ${dataBRTFormatada(agora)}\n\n`
      : `⚡ *Checagem da tarde (16:00)* — ${dataBRTFormatada(agora)}\n\n`;

  if (eventosHoje.length > 0) {
    msg += `📅 *Agenda de hoje (${eventosHoje.length}):*\n`;
    eventosHoje.forEach(({ evento: e, inicio }) => {
      msg += `• ${horaBRTFormatada(inicio)} — ${escaparMarkdown(e.titulo)}`;
      msg += e.projeto ? ` _(${escaparMarkdown(e.projeto.nome)})_\n` : "\n";
    });
    msg += `\n`;
  } else {
    msg += `📅 *Agenda:* nenhum compromisso hoje.\n\n`;
  }

  if (tarefasHoje.length > 0) {
    msg += `📋 *Tarefas do dia (${tarefasHoje.length}):*\n`;
    tarefasHoje.slice(0, 10).forEach((t) => {
      msg += `• ${escaparMarkdown(t.titulo)}`;
      msg += t.projeto ? ` _(${escaparMarkdown(t.projeto.nome)})_\n` : "\n";
    });
    if (tarefasHoje.length > 10) msg += `_...e mais ${tarefasHoje.length - 10}._\n`;
    msg += `\n`;
  } else {
    msg += `📋 *Tarefas:* nenhuma pendente. 🎉\n\n`;
  }

  if (entregas.length > 0) {
    msg += `🎬 *Entregas pendentes do mês (${entregas.length}):*\n`;
    entregas.slice(0, 5).forEach((e) => {
      msg += `• ${escaparMarkdown(e.titulo)}`;
      msg += e.projeto ? ` _(${escaparMarkdown(e.projeto.nome)})_\n` : "\n";
    });
    msg += `\n`;
  }

  msg += tipo === "08" ? `🚀 *Bom trabalho hoje!*` : `💪 *Reta final — bora fechar essas!*`;

  return enviarERegistrar(`digest_${tipo}_${hojeStr}`, msg, chatId);
}

// ── Lembretes de compromissos: 2 dias antes e 1 dia antes ──────────
async function enviarLembretesDeAgenda(agora: Date, chatId: string) {
  const p = partesBRT(agora);
  const enviados: string[] = [];

  for (const distancia of [2, 1] as const) {
    // Também projeta recorrentes: um evento semanal gera lembrete a cada ocorrência
    const ocorrencias = await eventosDoDiaBRT(p.ano, p.mes, p.dia + distancia);

    for (const { evento: ev, inicio } of ocorrencias) {
      const chave = `agenda_d${distancia}_${ev.id}_${diaBRT(inicio)}`;
      const cabecalho = distancia === 2 ? "*Faltam 2 dias*" : "*É amanhã!*";

      const msg =
        `🔔 ${cabecalho}\n\n` +
        `📌 *${escaparMarkdown(ev.titulo)}*\n` +
        `📅 ${dataBRTFormatada(inicio)} às *${horaBRTFormatada(inicio)}*` +
        (ev.projeto ? `\n👤 Cliente: _${escaparMarkdown(ev.projeto.nome)}_` : "");

      if (await enviarERegistrar(chave, msg, chatId)) enviados.push(chave);
    }
  }

  return enviados;
}

// ── Lembretes pontuais criados pelo usuário (5 min antes) ──────────
async function enviarLembretesPontuais(agora: Date, chatIdPadrao: string) {
  const pendentes = await prisma.lembreteAgendado.findMany({
    where: { enviado: false, horarioNotificar: { lte: agora } },
  });

  let enviados = 0;
  for (const l of pendentes) {
    const msg =
      `⏰ *LEMBRETE*\n\n` +
      `📌 *${escaparMarkdown(l.mensagem)}*\n` +
      `🕒 Agendado para às *${horaBRTFormatada(new Date(l.horarioAlvo))}*`;

    const resultado = await enviarTelegram(l.chatId || chatIdPadrao, msg);
    if (resultado.ok) {
      await prisma.lembreteAgendado.update({ where: { id: l.id }, data: { enviado: true } });
      enviados++;
    } else {
      console.error("[Cron] Falha no lembrete pontual:", resultado.erro);
    }
  }
  return enviados;
}

export async function GET(_req: NextRequest) {
  try {
    if (!telegramConfigurado()) {
      console.error("[Cron] TELEGRAM_BOT_TOKEN ausente — nenhum envio possível.");
      return NextResponse.json(
        { status: "error", motivo: "TELEGRAM_BOT_TOKEN não configurado na Vercel" },
        { status: 500 }
      );
    }

    const chatId = ALLOWED_CHAT_ID;
    if (!chatId) {
      return NextResponse.json(
        { status: "error", motivo: "TELEGRAM_ALLOWED_CHAT_ID não configurado na Vercel" },
        { status: 500 }
      );
    }

    const agora = new Date();
    const horaBRT = partesBRT(agora).hora;

    const lembretesPontuais = await enviarLembretesPontuais(agora, chatId);
    const lembretesAgenda = await enviarLembretesDeAgenda(agora, chatId);

    // Janelas amplas: se o cron atrasar, o resumo ainda sai no mesmo dia.
    let resumoEnviado: string | null = null;
    if (horaBRT >= 6 && horaBRT < 16) {
      if (await enviarResumoAgendado("08", agora, chatId)) resumoEnviado = "08";
    } else if (horaBRT >= 16) {
      if (await enviarResumoAgendado("16", agora, chatId)) resumoEnviado = "16";
    }

    return NextResponse.json({
      status: "ok",
      horaBRT,
      resumoEnviado,
      lembretesAgenda: lembretesAgenda.length,
      lembretesPontuais,
      timestamp: agora.toISOString(),
    });
  } catch (error: any) {
    console.error("[Cron Rotinas Error]:", error);
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}
