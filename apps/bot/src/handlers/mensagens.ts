import { Context, InlineKeyboard } from "grammy";
import prisma from "@meu-assessor/db";
import { isAllowedUser, config } from "../config";
import { transcreverAudio } from "../ai/transcricao";
import { classificarComClaude } from "../ai/classificador";
import fs from "fs";
import path from "path";
import os from "os";

export async function handleMensagem(ctx: Context) {
  if (!ctx.chat || !isAllowedUser(ctx.chat.id)) return;

  const telegramMsgId = String(ctx.message?.message_id);
  const textContent = ctx.message?.text || ctx.message?.caption || "";
  const voiceMsg = ctx.message?.voice || ctx.message?.audio;
  const photoMsg = ctx.message?.photo;

  let tipoMidia: "texto" | "audio" | "foto" | "link" = "texto";
  if (voiceMsg) tipoMidia = "audio";
  else if (photoMsg) tipoMidia = "foto";
  else if (textContent.includes("http://") || textContent.includes("https://")) tipoMidia = "link";

  // 1. Salva imediatamente em inbox_items (Idempotência por telegram_message_id)
  let inboxItem;
  try {
    inboxItem = await prisma.inboxItem.create({
      data: {
        origem: "telegram",
        tipoMidia,
        conteudoBruto: textContent || "[Mídia recebida]",
        telegramMessageId: telegramMsgId,
        status: "pendente",
      },
    });
  } catch (err) {
    console.log("[Bot] Item com este message_id já foi recebido. Ignorando duplicata.");
    return;
  }

  try {
    let textoParaClassificar = textContent;

    // 2. Trata áudio se houver
    if (voiceMsg) {
      const file = await ctx.getFile();
      const tempPath = path.join(os.tmpdir(), `voice_${telegramMsgId}.ogg`);
      
      if (file.file_path) {
        const downloadUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`;
        const res = await fetch(downloadUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        await fs.promises.writeFile(tempPath, buffer);

        const transcricao = await transcreverAudio(tempPath);
        textoParaClassificar = transcricao;

        await prisma.inboxItem.update({
          where: { id: inboxItem.id },
          data: { transcricao },
        });

        // Limpa arquivo temporário
        fs.unlink(tempPath, () => {});
      }
    }

    // 3. Classificação inteligente com Claude
    const projetosAtivos = await prisma.projeto.findMany({ select: { nome: true } });
    const ultimosVideos = await prisma.video.findMany({ take: 3, orderBy: { criadoEm: "desc" }, select: { titulo: true } });

    const classificacoes = await classificarComClaude(textoParaClassificar, {
      dataAtual: new Date().toISOString(),
      projetosAtivos: projetosAtivos.map((p) => p.nome),
      ultimosItens: ultimosVideos.map((v) => v.titulo),
    });

    if (classificacoes.length === 0) {
      await ctx.reply("❓ Não consegui entender essa mensagem. Pode reformular?");
      return;
    }

    // 4. Cria as entidades no banco
    for (const c of classificacoes) {
      if (c.confianca < 0.7) {
        await ctx.reply(`🤔 Fiquei na dúvida sobre: "${c.titulo}". Quer registrar como ${c.tipo}?`);
        continue;
      }

      // Encontra projeto por nome se houver
      let projetoId = null;
      if (c.projeto) {
        const proj = await prisma.projeto.findFirst({
          where: { nome: { contains: c.projeto, mode: "insensitive" } },
        });
        if (proj) projetoId = proj.id;
      }

      if (c.tipo === "video") {
        await prisma.video.create({
          data: {
            titulo: c.titulo,
            projetoId,
            formato: c.formato || "outro",
            estagio: "briefing",
            prazoEntrega: c.prazo ? new Date(c.prazo) : null,
            estimativaHoras: c.estimativa_horas || 4,
          },
        });
      } else if (c.tipo === "tarefa") {
        await prisma.tarefa.create({
          data: {
            titulo: c.titulo,
            projetoId,
            prazo: c.prazo ? new Date(c.prazo) : null,
            status: "aberta",
          },
        });
      } else if (c.tipo === "evento") {
        const inicio = c.prazo ? new Date(c.prazo) : new Date();
        const fim = new Date(inicio.getTime() + 60 * 60 * 1000);
        await prisma.evento.create({
          data: {
            titulo: c.titulo,
            inicio,
            fim,
            projetoId,
          },
        });
      } else if (c.tipo === "nota") {
        await prisma.nota.create({
          data: {
            titulo: c.titulo,
            conteudo: textoParaClassificar,
            projetoId,
            origemInboxId: inboxItem.id,
          },
        });
      } else if (c.tipo === "referencia") {
        await prisma.referencia.create({
          data: {
            url: c.url || textContent,
            titulo: c.titulo,
            tags: c.tags || ["inspiração"],
          },
        });
      }
    }

    // Marca inbox item como processado
    await prisma.inboxItem.update({
      where: { id: inboxItem.id },
      data: { status: "processado" },
    });

    // 5. Envia resposta de confirmação curta com InlineKeyboard
    const keyboard = new InlineKeyboard()
      .text("✏️ Editar", `edit_${inboxItem.id}`)
      .text("🗑️ Apagar", `del_${inboxItem.id}`);

    if (config.appUrl.startsWith("https://")) {
      keyboard.url("🌐 Abrir App", config.appUrl);
    }

    const msgLinhas = classificacoes
      .map((c) => c.confirmacao || `✓ ${c.tipo === "video" ? "Vídeo" : "Tarefa"} criada: ${c.titulo}`)
      .filter((t) => t && t.trim().length > 0);

    const confirmacaoMsg = msgLinhas.length > 0 ? msgLinhas.join("\n") : "✓ Registrado com sucesso!";

    await ctx.reply(confirmacaoMsg, {
      reply_markup: keyboard,
    });
  } catch (error: any) {
    console.error("[Bot] Erro ao processar mensagem:", error);
    await prisma.inboxItem.update({
      where: { id: inboxItem.id },
      data: { status: "erro", erroDetalhes: String(error) },
    });
    await ctx.reply("⚠️ Salvei a mensagem no Inbox, mas houve um erro ao processar. Você pode conferir no Web App.");
  }
}
