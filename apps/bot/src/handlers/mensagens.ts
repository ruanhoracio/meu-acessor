import { Context, InlineKeyboard } from "grammy";
import prisma from "@meu-assessor/db";
import { isAllowedUser, config } from "../config";
import { transcreverAudio } from "../ai/transcricao";
import { classificarComClaude } from "../ai/classificador";
import fs from "fs";
import path from "path";
import os from "os";

// Cache de projetos em memória para economizar chamadas de banco (TTL 30s)
let projetosCache: { nomes: string[]; timestamp: number } | null = null;

async function getProjetosAtivosNomes(): Promise<string[]> {
  const agora = Date.now();
  if (projetosCache && agora - projetosCache.timestamp < 30000) {
    return projetosCache.nomes;
  }
  try {
    const projs = await prisma.projeto.findMany({ where: { ativo: true }, select: { nome: true } });
    const nomes = projs.map((p) => p.nome);
    projetosCache = { nomes, timestamp: agora };
    return nomes;
  } catch (e) {
    return projetosCache?.nomes || [];
  }
}

export async function handleMensagem(ctx: Context) {
  if (!ctx.chat || !isAllowedUser(ctx.chat.id)) return;

  // ⚡ Visual Feedback Instantâneo: Manda "digitando..." no Telegram sem delay
  ctx.replyWithChatAction("typing").catch(() => {});

  const telegramMsgId = String(ctx.message?.message_id);
  const textContent = ctx.message?.text || ctx.message?.caption || "";
  const voiceMsg = ctx.message?.voice || ctx.message?.audio;
  const photoMsg = ctx.message?.photo;

  let tipoMidia: "texto" | "audio" | "foto" | "link" = "texto";
  if (voiceMsg) tipoMidia = "audio";
  else if (photoMsg) tipoMidia = "foto";
  else if (textContent.includes("http://") || textContent.includes("https://")) tipoMidia = "link";

  // 1. Salva em inbox_items (Idempotência)
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

        fs.unlink(tempPath, () => {});
      }
    }

    // 3. Classificação super-rápida (Pre-Pass Local 2ms ou Groq Llama-3.3-70b em 250ms)
    const projetosAtivosNomes = await getProjetosAtivosNomes();

    const classificacoes = await classificarComClaude(textoParaClassificar, {
      dataAtual: new Date().toISOString(),
      projetosAtivos: projetosAtivosNomes,
      ultimosItens: [],
    });

    if (classificacoes.length === 0) {
      await ctx.reply("❓ Não consegui entender essa mensagem. Pode reformular?");
      return;
    }

    // 4. Cria as entidades no banco
    for (const c of classificacoes) {
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

    // 5. Resposta instantânea de confirmação
    const keyboard = new InlineKeyboard()
      .text("✏️ Editar", `edit_${inboxItem.id}`)
      .text("🗑️ Apagar", `del_${inboxItem.id}`);

    if (config.appUrl.startsWith("https://")) {
      keyboard.url("🌐 Abrir App", config.appUrl);
    }

    const msgLinhas = classificacoes
      .map((c) => {
        if (c.confirmacao) return c.confirmacao;
        if (c.tipo === "video") return `✓ Vídeo adicionado no Pipeline: "${c.titulo}"${c.prazo ? ` (Prazo: ${new Date(c.prazo).toLocaleDateString("pt-BR")})` : ""}`;
        if (c.tipo === "evento") return `✓ Compromisso agendado na Agenda: "${c.titulo}"${c.prazo ? ` (${new Date(c.prazo).toLocaleDateString("pt-BR")})` : ""}`;
        return `✓ Tarefa criada: "${c.titulo}"${c.prazo ? ` (Prazo: ${new Date(c.prazo).toLocaleDateString("pt-BR")})` : ""}`;
      })
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
