import cron from "node-cron";
import { Bot } from "grammy";
import prisma from "@meu-assessor/db";
import { config } from "../config";
import { ESTAGIO_LABELS } from "@meu-assessor/core";

function getDiaString(dateInput: Date | string | null): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }

  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    return d.toISOString().split("T")[0];
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function iniciarRotinasAgendadas(bot: Bot) {
  if (!config.allowedChatId) {
    console.log("[Jobs] TELEGRAM_ALLOWED_CHAT_ID não configurado. Rotinas agendadas desativadas.");
    return;
  }

  const chatId = config.allowedChatId;

  // 1. Relatório Matinal ESTRITAMENTE do DIA às 08:00 AM
  cron.schedule("0 8 * * *", async () => {
    console.log("[Jobs] Executando resumo matinal estritamente do DIA às 08:00...");
    try {
      const hojeObj = new Date();
      const hojeStr = getDiaString(hojeObj);

      const amanhaObj = new Date(hojeObj);
      amanhaObj.setDate(hojeObj.getDate() + 1);

      // Buscar apenas compromissos de hoje
      const eventos = await prisma.evento.findMany({
        where: { inicio: { gte: new Date(hojeStr + "T00:00:00.000Z"), lt: new Date(getDiaString(amanhaObj) + "T00:00:00.000Z") } },
        include: { projeto: true },
        orderBy: { inicio: "asc" },
      });

      // Buscar apenas tarefas de hoje (sem prazo ou prazo <= hojeStr)
      const todasTarefasAbertas = await prisma.tarefa.findMany({
        where: { status: { in: ["aberta", "fazendo"] } },
        include: { projeto: true },
        orderBy: { prioridade: "asc" },
      });

      const tarefasDoDia = todasTarefasAbertas.filter((t) => {
        if (!t.prazo) return true; // Sem prazo fica para hoje
        const pStr = getDiaString(t.prazo);
        return pStr <= hojeStr; // Apenas de hoje ou atrasadas!
      });

      // Buscar apenas vídeos com prazo para hoje ou ativos em edição
      const todosVideosAtivos = await prisma.video.findMany({
        where: { estagio: { notIn: ["entregue", "aprovado"] } },
        include: { projeto: true },
        orderBy: { prazoEntrega: "asc" },
      });

      const videosDoDia = todosVideosAtivos.filter((v) => {
        if (!v.prazoEntrega) return true;
        const vStr = getDiaString(v.prazoEntrega);
        return vStr <= hojeStr; // Prazo para hoje ou atrasado
      });

      let text = `☀️ *Bom dia, Ruan! Seu Resumo do Dia (${hojeStr.split("-").reverse().slice(0, 2).join("/")})*\n\n`;

      if (eventos.length > 0) {
        text += `📅 *Agenda do Dia (${eventos.length}):*\n`;
        eventos.forEach((e) => {
          const hor = new Date(e.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          text += `  • ${hor} — *${e.titulo}*${e.projeto ? ` (_${e.projeto.nome}_)` : ""}\n`;
        });
        text += `\n`;
      } else {
        text += `📅 *Agenda:* Nenhum compromisso marcado para hoje.\n\n`;
      }

      if (tarefasDoDia.length > 0) {
        text += `📋 *Tarefas do Dia (${tarefasDoDia.length}):*\n`;
        tarefasDoDia.slice(0, 6).forEach((t) => {
          text += `  • *${t.titulo}*${t.projeto ? ` (_${t.projeto.nome}_)` : ""}\n`;
        });
        if (tarefasDoDia.length > 6) text += `  _...e mais ${tarefasDoDia.length - 6} tarefas._\n`;
        text += `\n`;
      } else {
        text += `📋 *Tarefas:* Nenhuma tarefa pendente para hoje.\n\n`;
      }

      if (videosDoDia.length > 0) {
        text += `🎬 *Vídeos do Dia (${videosDoDia.length}):*\n`;
        videosDoDia.slice(0, 4).forEach((v) => {
          const est = ESTAGIO_LABELS[v.estagio] || v.estagio;
          text += `  • *${v.titulo}* — _${est}_${v.projeto ? ` (${v.projeto.nome})` : ""}\n`;
        });
        text += `\n`;
      } else {
        text += `🎬 *Vídeos:* Nenhum vídeo pendente para hoje.\n\n`;
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
      const hojeStr = getDiaString(new Date());
      const todasTarefas = await prisma.tarefa.findMany({
        where: { status: "aberta" },
      });

      const tarefasHoje = todasTarefas.filter((t) => {
        if (!t.prazo) return true;
        const pStr = getDiaString(t.prazo);
        return pStr <= hojeStr;
      });

      if (tarefasHoje.length > 0) {
        await bot.api.sendMessage(
          chatId,
          `⚡ *Checagem da tarde:* Você ainda tem *${tarefasHoje.length} tarefas pendentes para hoje* no seu painel.`
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

  console.log("⏰ Rotinas agendadas (08:00 matinal estritamente do dia, 14:00 checagem, alertas por hora) iniciadas.");
}
