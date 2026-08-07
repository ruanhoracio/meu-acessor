import cron from "node-cron";
import { Bot } from "grammy";
import prisma from "@meu-assessor/db";
import { config } from "../config";
import { ESTAGIO_LABELS } from "@meu-assessor/core";

export function iniciarRotinasAgendadas(bot: Bot) {
  if (!config.allowedChatId) {
    console.log("[Jobs] TELEGRAM_ALLOWED_CHAT_ID não configurado. Rotinas agendadas desativadas.");
    return;
  }

  const chatId = config.allowedChatId;

  // 1. Relatório Matinal completo das 08:00 AM
  cron.schedule("0 8 * * *", async () => {
    console.log("[Jobs] Executando resumo matinal das 08:00...");
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const [eventos, tarefas, videos] = await Promise.all([
        prisma.evento.findMany({
          where: { inicio: { gte: hoje, lt: amanha } },
          include: { projeto: true },
          orderBy: { inicio: "asc" },
        }),
        prisma.tarefa.findMany({
          where: { status: { in: ["aberta", "fazendo"] } },
          include: { projeto: true },
          orderBy: { prioridade: "asc" },
        }),
        prisma.video.findMany({
          where: { estagio: { notIn: ["entregue", "aprovado"] } },
          include: { projeto: true },
          orderBy: { prazoEntrega: "asc" },
        }),
      ]);

      let text = `☀️ *Bom dia, Ruan! Seu Resumo das 08:00*\n\n`;

      if (eventos.length > 0) {
        text += `📅 *Compromissos na Agenda (${eventos.length}):*\n`;
        eventos.forEach((e) => {
          const hor = new Date(e.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          text += `  • ${hor} — *${e.titulo}*${e.projeto ? ` (_${e.projeto.nome}_)` : ""}\n`;
        });
        text += `\n`;
      } else {
        text += `📅 *Agenda:* Nenhum compromisso marcado para hoje.\n\n`;
      }

      if (tarefas.length > 0) {
        text += `📋 *Tarefas do Dia (${tarefas.length}):*\n`;
        tarefas.slice(0, 5).forEach((t) => {
          text += `  • *${t.titulo}*${t.projeto ? ` (_${t.projeto.nome}_)` : ""}\n`;
        });
        if (tarefas.length > 5) text += `  _...e mais ${tarefas.length - 5} tarefas._\n`;
        text += `\n`;
      } else {
        text += `📋 *Tarefas:* Nenhuma tarefa pendente.\n\n`;
      }

      if (videos.length > 0) {
        text += `🎬 *Vídeos em Edição (${videos.length}):*\n`;
        videos.slice(0, 4).forEach((v) => {
          const est = ESTAGIO_LABELS[v.estagio] || v.estagio;
          text += `  • *${v.titulo}* — _${est}_${v.projeto ? ` (${v.projeto.nome})` : ""}\n`;
        });
        text += `\n`;
      }

      text += `🚀 *Bom trabalho hoje!* Qualquer ideia, compromisso ou tarefa, só me mandar aqui!`;

      await bot.api.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("[Jobs] Erro no resumo matinal:", err);
    }
  });

  // 2. Checagem das 14:00
  cron.schedule("0 14 * * *", async () => {
    console.log("[Jobs] Executando checagem das 14:00...");
    try {
      const pendentes = await prisma.tarefa.count({
        where: { status: "aberta" },
      });

      if (pendentes > 0) {
        await bot.api.sendMessage(
          chatId,
          `⚡ *Checagem da tarde:* Você ainda tem *${pendentes} tarefas abertas* no seu painel.`
        );
      }
    } catch (err) {
      console.error("[Jobs] Erro na checagem da tarde:", err);
    }
  });

  // 3. Alertas a cada hora (vídeos travados há >3 dias)
  cron.schedule("0 * * * *", async () => {
    try {
      const tresDiasAtras = new Date();
      tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

      const travados = await prisma.video.findMany({
        where: {
          estagio: { notIn: ["entregue", "aprovado"] },
          criadoEm: { lte: tresDiasAtras },
        },
      });

      for (const v of travados) {
        const jaEnviado = await prisma.lembreteEnviado.findFirst({
          where: {
            tipo: "video_travado",
            entidadeId: v.id,
          },
        });

        if (!jaEnviado) {
          const estagio = ESTAGIO_LABELS[v.estagio] || v.estagio;
          await bot.api.sendMessage(
            chatId,
            `⚠️ *Alerta de Vídeo Travado:*\nO vídeo *${v.titulo}* está no estágio _${estagio}_ há mais de 3 dias!`
          );

          await prisma.lembreteEnviado.create({
            data: {
              tipo: "video_travado",
              entidadeId: v.id,
            },
          });
        }
      }
    } catch (err) {
      console.error("[Jobs] Erro na verificação de travados:", err);
    }
  });

  console.log("⏰ Rotinas agendadas (08:00 matinal, 14:00 checagem, alertas por hora) iniciadas.");
}
