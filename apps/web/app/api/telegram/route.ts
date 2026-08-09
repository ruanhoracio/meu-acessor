import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import OpenAI from "openai";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";

const groq = GROQ_KEY ? new OpenAI({ apiKey: GROQ_KEY, baseURL: "https://api.groq.com/openai/v1" }) : null;

// Algoritmo local instantâneo (~2ms)
function tentarClassificacaoInstantanea(mensagem: string, agora: Date, projetosAtivos: string[]) {
  const msgTrim = mensagem.trim();
  if (msgTrim.includes("\n") || msgTrim.length > 120) return null;
  const msgLower = msgTrim.toLowerCase();

  // Lembrete proativo
  const isLembrete =
    msgLower.includes("me lembra") ||
    msgLower.includes("me lembre") ||
    msgLower.includes("lembrar de") ||
    msgLower.includes("lembrar que") ||
    msgLower.includes("me avisa") ||
    msgLower.includes("me avise");

  if (isLembrete) {
    let dataAlvo = new Date(agora);
    if (msgLower.includes("amanhã") || msgLower.includes("amanha")) {
      dataAlvo.setDate(dataAlvo.getDate() + 1);
    }

    let hora = 9;
    let minuto = 0;
    const matchHora = msgLower.match(/(?:às|as|para\s*as|para\s*às)?\s*(\d{1,2})(?:h|:(\d{2}))?/i);
    if (matchHora) {
      hora = parseInt(matchHora[1], 10);
      if (matchHora[2]) minuto = parseInt(matchHora[2], 10);
    }

    dataAlvo.setHours(hora, minuto, 0, 0);
    if (dataAlvo <= agora && !msgLower.includes("amanhã") && !msgLower.includes("amanha")) {
      dataAlvo.setDate(dataAlvo.getDate() + 1);
    }

    const dataNotificar = new Date(dataAlvo.getTime() - 5 * 60 * 1000);

    let tituloLimpo = msgTrim
      .replace(/^(?:por\s*favor\s*)?(?:me\s*)?(?:lembra|lembre|avisa|avise)(?:\s*de|\s*que)?/gi, "")
      .replace(/(?:para|pra|em)?\s*(?:amanhã|amanha|hoje)/gi, "")
      .replace(/(?:às|as|para\s*as|para\s*às)?\s*\d{1,2}(?:h|:\d{2})?/gi, "")
      .replace(/^,\s*/, "")
      .trim();

    if (!tituloLimpo) tituloLimpo = msgTrim;
    tituloLimpo = tituloLimpo.charAt(0).toUpperCase() + tituloLimpo.slice(1);

    const horaAlvoStr = dataAlvo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const horaNotifStr = dataNotificar.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const dataFormatada = dataAlvo.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    return [
      {
        tipo: "lembrete",
        titulo: tituloLimpo,
        prazo: dataAlvo.toISOString(),
        horarioNotificar: dataNotificar.toISOString(),
        confianca: 0.98,
        confirmacao: `⏰ *Lembrete Agendado!*\n📌 *O que:* "${tituloLimpo}"\n📅 *Horário:* ${dataFormatada} às ${horaAlvoStr}\n🔔 *Aviso Proativo:* ${horaNotifStr} (5 min antes no seu Telegram)`,
      },
    ];
  }

  // Link
  if (msgLower.startsWith("http://") || msgLower.startsWith("https://")) {
    return [
      {
        tipo: "referencia",
        titulo: "Link de referência",
        url: msgTrim,
        confianca: 0.95,
        confirmacao: "✓ Referência salva com sucesso!",
      },
    ];
  }

  const isEvento =
    msgLower.includes("agenda") ||
    msgLower.includes("agendar") ||
    msgLower.includes("marcar") ||
    msgLower.includes("reunião") ||
    msgLower.includes("reuniao") ||
    msgLower.includes("call") ||
    msgLower.includes("compromisso") ||
    msgLower.includes("médico") ||
    msgLower.includes("medico") ||
    msgLower.includes("dentista") ||
    msgLower.includes("consulta") ||
    msgLower.includes("barbeiro") ||
    msgLower.includes("ir no") ||
    msgLower.includes("ir ao") ||
    msgLower.includes("ir para");

  const isVideo =
    msgLower.includes("vídeo") ||
    msgLower.includes("video") ||
    msgLower.includes("vsl") ||
    msgLower.includes("reels") ||
    msgLower.includes("corte");

  let projetoEncontrado: string | undefined;
  for (const proj of projetosAtivos) {
    if (msgLower.includes(proj.toLowerCase())) {
      projetoEncontrado = proj;
      break;
    }
  }

  let prazo: Date | null = null;
  let tituloLimpo = msgTrim;

  if (msgLower.includes("amanhã") || msgLower.includes("amanha")) {
    const d = new Date(agora);
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    prazo = d;
    tituloLimpo = msgTrim.replace(/(?:para|pra)?\s*(?:amanhã|amanha)/gi, "").trim();
  } else if (msgLower.includes("hoje")) {
    const d = new Date(agora);
    d.setHours(18, 0, 0, 0);
    prazo = d;
    tituloLimpo = msgTrim.replace(/(?:para|pra)?\s*hoje/gi, "").trim();
  }

  tituloLimpo = tituloLimpo
    .replace(/(?:,?\s*)?(?:coloque|colocar|põe|bota|adicione|salve|salvar)?\s*(?:na|pra|para)?\s*agenda/gi, "")
    .replace(/^(agendar|marcar|criar|fazer|preciso|tenho que)\s+/gi, "")
    .replace(/,\s*$/, "")
    .trim();

  if (!tituloLimpo) tituloLimpo = msgTrim;
  tituloLimpo = tituloLimpo.charAt(0).toUpperCase() + tituloLimpo.slice(1);

  const tipoFinal = isEvento ? "evento" : isVideo ? "video" : "tarefa";

  return [
    {
      tipo: tipoFinal,
      titulo: tituloLimpo,
      projeto: projetoEncontrado,
      prazo: prazo ? prazo.toISOString() : undefined,
      formato: msgLower.includes("vsl") ? "vsl" : msgLower.includes("reels") ? "reels" : "outro",
      confianca: 0.95,
      confirmacao: `✓ ${tipoFinal === "video" ? "Vídeo adicionado no Pipeline" : tipoFinal === "evento" ? "Compromisso agendado na Agenda" : "Tarefa criada"}: "${tituloLimpo}"${prazo ? ` (${prazo.toLocaleDateString("pt-BR")})` : ""}`,
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Processa atualização do Telegram
    if (body.message) {
      const msg = body.message;
      const chatId = String(msg.chat?.id);

      // Valida chat autorizado
      if (ALLOWED_CHAT_ID && chatId !== ALLOWED_CHAT_ID) {
        return NextResponse.json({ status: "ignored_unauthorized" });
      }

      const telegramMsgId = String(msg.message_id);
      const textContent = msg.text || msg.caption || "";
      const voiceMsg = msg.voice || msg.audio;
      const photoMsg = msg.photo;

      let tipoMidia: "texto" | "audio" | "foto" | "link" = "texto";
      if (voiceMsg) tipoMidia = "audio";
      else if (photoMsg) tipoMidia = "foto";
      else if (textContent.includes("http://") || textContent.includes("https://")) tipoMidia = "link";

      // 1. Salva em Inbox (idempotência)
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
      } catch (e) {
        return NextResponse.json({ status: "already_processed" });
      }

      let textoParaClassificar = textContent;

      // Se for áudio, busca transcrição se possível
      if (voiceMsg && msg.voice?.file_id) {
        try {
          const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${msg.voice.file_id}`);
          const fileData = await fileRes.json();
          if (fileData.ok && fileData.result.file_path) {
            // Nota: Se a chave Groq estiver ativa, transcrição pode usar Whisper API
            textoParaClassificar = "[Áudio Recebido pelo Telegram]";
          }
        } catch (err) {
          console.error("[Telegram Webhook Audio Error]:", err);
        }
      }

      // Buscar projetos ativos
      const projs = await prisma.projeto.findMany({ where: { ativo: true }, select: { nome: true } });
      const projetosAtivosNomes = projs.map((p) => p.nome);

      const agora = new Date();
      let classificacoes = tentarClassificacaoInstantanea(textoParaClassificar, agora, projetosAtivosNomes);

      if (!classificacoes && groq) {
        try {
          const resp = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `Você é o assistente IA para editor de vídeo. Responda apenas array JSON de classificação: [{"tipo": "video"|"tarefa"|"evento"|"nota"|"lembrete", "titulo": "..."}]`,
              },
              { role: "user", content: textoParaClassificar },
            ],
            temperature: 0.0,
            max_tokens: 250,
          });
          const raw = resp.choices[0]?.message?.content || "";
          const jsonText = raw.trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
          classificacoes = JSON.parse(jsonText);
        } catch (err) {
          console.error("[Groq Error]:", err);
        }
      }

      if (!classificacoes || classificacoes.length === 0) {
        classificacoes = [
          {
            tipo: "tarefa",
            titulo: textoParaClassificar || "Nova mensagem do Telegram",
            projeto: undefined,
            prazo: undefined,
            formato: "outro",
            confianca: 0.9,
            confirmacao: `✓ Tarefa criada: "${(textoParaClassificar || "Mensagem").slice(0, 35)}"`,
          },
        ];
      }

      // Cria as entidades no banco
      const itemsClassificados: any[] = classificacoes || [];

      for (const c of itemsClassificados) {
        let projetoId = null;
        if (c.projeto) {
          const proj = await prisma.projeto.findFirst({
            where: { nome: { contains: c.projeto, mode: "insensitive" } },
          });
          if (proj) projetoId = proj.id;
        }

        if (c.tipo === "lembrete") {
          const horarioAlvo = c.prazo ? new Date(c.prazo) : new Date();
          const horarioNotificar = c.horarioNotificar
            ? new Date(c.horarioNotificar)
            : new Date(horarioAlvo.getTime() - 5 * 60 * 1000);

          await prisma.lembreteAgendado.create({
            data: {
              mensagem: c.titulo,
              horarioAlvo,
              horarioNotificar,
              chatId,
            },
          });
        } else if (c.tipo === "video") {
          await prisma.video.create({
            data: {
              titulo: c.titulo,
              projetoId,
              formato: c.formato || "outro",
              estagio: "briefing",
              prazoEntrega: c.prazo ? new Date(c.prazo) : null,
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
        }
      }

      await prisma.inboxItem.update({
        where: { id: inboxItem.id },
        data: { status: "processado" },
      });

      // Envia resposta no Telegram 24/7
      const msgLinhas = itemsClassificados.map((c: any) => c.confirmacao || `✓ ${c.tipo}: ${c.titulo}`);
      const confirmText = msgLinhas.join("\n");

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: confirmText,
          parse_mode: "Markdown",
        }),
      });

      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "ignored" });
  } catch (error: any) {
    console.error("[Telegram Webhook Error]:", error);
    return NextResponse.json({ status: "error", error: String(error) }, { status: 500 });
  }
}
