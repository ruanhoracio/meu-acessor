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

  // 1. Resumo das 7h
  cron.schedule("0 7 * * *", async () => {
    console.log("[Jobs] Executando resumo das 07:00...");
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const [tarefas, videos] = await Promise.all([
        prisma.tarefa.findMany({
          where: { status: { in: ["aberta", "fazendo"] }, prazo: { lte: amanha } },
        }),
        prisma.video.findMany({
          where: { estagio: { notIn: ["entregue", "aprovado"] } },
          take: 3,
        }),
      ]);

      let text = `☀️ *Bom dia! Resumo do Assessor*\n\n`;
      text += `• *${tarefas.length} tarefas* pendentes para hoje.\n`;
      text += `• *${videos.length} vídeos* ativos no pipeline.\n\n`;
      text += `Tenha um excelente dia de trabalho! 💪`;

      await bot.api.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("[Jobs] Erro no resumo matinal:", err);
    }
  });

  // 2. Checagem das 14h
  cron.schedule("0 14 * * *", async () => {
    console.log("[Jobs] Executando checagem das 14:00...");
    try {
      const pendentes = await prisma.tarefa.count({
        where: { status: "aberta" },
      });

      if (pendentes > 0) {
        await bot.api.sendMessage(
          chatId,
          `⚡ *Checagem da tarde:* Você ainda tem *${pendentes} tarefas abertas* para hoje.`
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
        // Verifica se já não mandamos lembrete hoje
        const hojeStr = new Date().toISOString().slice(0, 10);
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

  console.log("⏰ Rotinas agendadas (7h, 14h, hourly alerts) iniciadas.");
}
