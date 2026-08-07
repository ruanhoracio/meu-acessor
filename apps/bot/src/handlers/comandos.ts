import { Context } from "grammy";
import prisma from "@meu-assessor/db";
import { config } from "../config";
import { ESTAGIO_LABELS, FORMATO_LABELS } from "@meu-assessor/core";

export async function handleHoje(ctx: Context) {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const [tarefas, videos, eventos] = await Promise.all([
      prisma.tarefa.findMany({
        where: {
          status: { in: ["aberta", "fazendo"] },
          prazo: { lte: amanha },
        },
        include: { projeto: true },
      }),
      prisma.video.findMany({
        where: { estagio: { notIn: ["entregue", "aprovado"] } },
        include: { projeto: true },
        orderBy: { prazoEntrega: "asc" },
        take: 5,
      }),
      prisma.evento.findMany({
        where: {
          inicio: { gte: hoje, lt: amanha },
        },
      }),
    ]);

    let text = `📅 *Resumo de Hoje*\n\n`;

    if (eventos.length > 0) {
      text += `⏰ *Compromissos:*\n`;
      eventos.forEach((e) => {
        const hora = e.inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        text += `• ${hora} - ${e.titulo}\n`;
      });
      text += `\n`;
    }

    if (videos.length > 0) {
      text += `🎬 *Vídeos Prioritários:*\n`;
      videos.forEach((v) => {
        const estagio = ESTAGIO_LABELS[v.estagio] || v.estagio;
        text += `• *${v.titulo}* (${v.projeto?.nome || "Sem cliente"}) — _${estagio}_\n`;
      });
      text += `\n`;
    }

    if (tarefas.length > 0) {
      text += `✅ *Tarefas do dia:*\n`;
      tarefas.forEach((t) => {
        text += `• ${t.titulo} ${t.projeto ? `(_${t.projeto.nome}_)` : ""}\n`;
      });
    }

    if (eventos.length === 0 && videos.length === 0 && tarefas.length === 0) {
      text += `Nenhum compromisso ou tarefa pendente para hoje! 🎉`;
    }

    await ctx.reply(text, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Erro no comando /hoje:", error);
    await ctx.reply("❌ Erro ao buscar resumo de hoje.");
  }
}

export async function handleSemana(ctx: Context) {
  try {
    const videosAtivos = await prisma.video.findMany({
      where: { estagio: { notIn: ["entregue", "aprovado"] } },
    });

    const horasComprometidas = videosAtivos.reduce((acc, v) => acc + (v.estimativaHoras || 0), 0);
    const horasDisponiveis = 30; // 6h/dia * 5
    const percentual = Math.round((horasComprometidas / horasDisponiveis) * 100);

    let text = `📊 *Capacidade da Semana*\n\n`;
    text += `• Horas estimadas nos vídeos: *${horasComprometidas}h*\n`;
    text += `• Horas disponíveis: *${horasDisponiveis}h*\n`;
    text += `• Ocupação: *${percentual}%*\n\n`;

    if (percentual > 100) {
      text += `⚠️ *Atenção:* Sua semana está estourada em ${horasComprometidas - horasDisponiveis}h! Cuidado com novos prazos.`;
    } else {
      text += `✅ Você ainda tem ${horasDisponiveis - horasComprometidas}h livres nesta semana.`;
    }

    await ctx.reply(text, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Erro no comando /semana:", error);
    await ctx.reply("❌ Erro ao calcular capacidade semanal.");
  }
}

export async function handleTravados(ctx: Context) {
  try {
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

    const videos = await prisma.video.findMany({
      where: {
        estagio: { notIn: ["entregue", "aprovado"] },
        criadoEm: { lte: tresDiasAtras },
      },
      include: { projeto: true },
    });

    if (videos.length === 0) {
      await ctx.reply("✨ Nenhum vídeo travado! Tudo fluindo no pipeline.");
      return;
    }

    let text = `🚨 *Vídeos Travados (há mais de 3 dias no mesmo estágio):*\n\n`;
    videos.forEach((v) => {
      const estagio = ESTAGIO_LABELS[v.estagio] || v.estagio;
      text += `• *${v.titulo}* (${v.projeto?.nome || "Sem cliente"})\n  Estágio: _${estagio}_ | Aguardando: _${v.aguardando || "eu"}_\n\n`;
    });

    await ctx.reply(text, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Erro no comando /travados:", error);
    await ctx.reply("❌ Erro ao buscar vídeos travados.");
  }
}

export async function handleFoco(ctx: Context) {
  try {
    const videoTitulo = ctx.match as string;

    const video = await prisma.video.findFirst({
      where: videoTitulo
        ? { titulo: { contains: videoTitulo, mode: "insensitive" } }
        : { estagio: { notIn: ["entregue", "aprovado"] } },
      orderBy: { criadoEm: "desc" },
    });

    if (!video) {
      await ctx.reply("❌ Nenhum vídeo encontrado para iniciar sessão de foco.");
      return;
    }

    await prisma.sessaoFoco.create({
      data: {
        videoId: video.id,
        inicio: new Date(),
      },
    });

    await ctx.reply(
      `⏱️ *Sessão de Foco Iniciada!*\n\nVídeo: *${video.titulo}*\n\nUse o comando /fim quando terminar a edição para registrar o tempo real.`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Erro no comando /foco:", error);
    await ctx.reply("❌ Erro ao iniciar sessão de foco.");
  }
}

export async function handleFim(ctx: Context) {
  try {
    const sessaoAberta = await prisma.sessaoFoco.findFirst({
      where: { fim: null },
      include: { video: true },
      orderBy: { inicio: "desc" },
    });

    if (!sessaoAberta) {
      await ctx.reply("ℹ️ Nenhuma sessão de foco ativa no momento.");
      return;
    }

    const fim = new Date();
    const duracaoMin = Math.round((fim.getTime() - sessaoAberta.inicio.getTime()) / 60000);

    await prisma.sessaoFoco.update({
      where: { id: sessaoAberta.id },
      data: { fim, duracaoMinutos: duracaoMin },
    });

    await ctx.reply(
      `🎯 *Sessão de Foco Concluída!*\n\nVídeo: *${sessaoAberta.video.titulo}*\nDuração: *${duracaoMin} minutos*\n\nSeu tempo real foi atualizado no sistema.`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Erro no comando /fim:", error);
    await ctx.reply("❌ Erro ao encerrar sessão de foco.");
  }
}
