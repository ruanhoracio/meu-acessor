import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import OpenAI from "openai";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";

const groq = GROQ_KEY ? new OpenAI({ apiKey: GROQ_KEY, baseURL: "https://api.groq.com/openai/v1" }) : null;

const MESES_MAP: Record<string, number> = {
  janeiro: 0, jan: 0,
  fevereiro: 1, fev: 1,
  março: 2, marco: 2, mar: 2,
  abril: 3, abr: 3,
  maio: 4, mai: 4,
  junho: 5, jun: 5,
  julho: 6, jul: 6,
  agosto: 7, ago: 7,
  setembro: 8, set: 8,
  outubro: 9, out: 9,
  novembro: 10, nov: 10,
  dezembro: 11, dez: 11,
};

function extrairDataEMensagem(mensagem: string, agora: Date) {
  const msgTrim = mensagem.trim();
  let dataCalculada: Date | null = null;
  let tituloLimpo = msgTrim;
  let ehDataExplicita = false;

  // 1. "12 de Setembro", "15 de Outubro", "3 de maio", "20 de agosto"
  const regexMesExtenso = /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i;
  const matchMesExt = msgTrim.match(regexMesExtenso);

  if (matchMesExt) {
    const diaNum = parseInt(matchMesExt[1], 10);
    const mesNome = matchMesExt[2].toLowerCase();
    const mesIdx = MESES_MAP[mesNome];

    if (mesIdx !== undefined && diaNum >= 1 && diaNum <= 31) {
      let ano = agora.getFullYear();
      if (mesIdx < agora.getMonth() || (mesIdx === agora.getMonth() && diaNum < agora.getDate())) {
        if (agora.getMonth() > mesIdx) {
          ano += 1;
        }
      }
      dataCalculada = new Date(ano, mesIdx, diaNum, 9, 0, 0, 0);
      ehDataExplicita = true;
      tituloLimpo = msgTrim.replace(matchMesExt[0], "").replace(/^[\s\-_:]+/, "").replace(/[\s\-_:]+$/, "").trim();
    }
  }

  // 2. "12/09", "15/10/2026"
  if (!dataCalculada) {
    const regexBarra = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;
    const matchBarra = msgTrim.match(regexBarra);
    if (matchBarra) {
      const diaNum = parseInt(matchBarra[1], 10);
      const mesNum = parseInt(matchBarra[2], 10) - 1;
      let ano = matchBarra[3] ? parseInt(matchBarra[3], 10) : agora.getFullYear();
      if (ano < 100) ano += 2000;

      if (mesNum >= 0 && mesNum <= 11 && diaNum >= 1 && diaNum <= 31) {
        dataCalculada = new Date(ano, mesNum, diaNum, 9, 0, 0, 0);
        ehDataExplicita = true;
        tituloLimpo = msgTrim.replace(matchBarra[0], "").replace(/^[\s\-_:]+/, "").replace(/[\s\-_:]+$/, "").trim();
      }
    }
  }

  // 3. "amanhã" / "amanha" / "hoje"
  if (!dataCalculada) {
    const msgLower = msgTrim.toLowerCase();
    if (msgLower.includes("amanhã") || msgLower.includes("amanha")) {
      const d = new Date(agora);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      dataCalculada = d;
      ehDataExplicita = true;
      tituloLimpo = msgTrim.replace(/(?:para|pra)?\s*(?:amanhã|amanha)/gi, "").replace(/^[\s\-_:]+/, "").replace(/[\s\-_:]+$/, "").trim();
    } else if (msgLower.includes("hoje")) {
      const d = new Date(agora);
      d.setHours(18, 0, 0, 0);
      dataCalculada = d;
      tituloLimpo = msgTrim.replace(/(?:para|pra)?\s*hoje/gi, "").replace(/^[\s\-_:]+/, "").replace(/[\s\-_:]+$/, "").trim();
    }
  }

  // Limpeza final do título
  tituloLimpo = tituloLimpo
    .replace(/(?:,?\s*)?(?:coloque|colocar|põe|bota|adicione|salve|salvar)?\s*(?:na|pra|para)?\s*agenda/gi, "")
    .replace(/^(agendar|marcar|criar|fazer|preciso|tenho que)\s+/gi, "")
    .replace(/^[,\s\-_:]+/, "")
    .replace(/[,\s\-_:]+$/, "")
    .trim();

  if (!tituloLimpo) tituloLimpo = msgTrim;
  tituloLimpo = tituloLimpo.charAt(0).toUpperCase() + tituloLimpo.slice(1);

  return {
    data: dataCalculada,
    tituloLimpo,
    ehDataExplicita,
  };
}

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

  const isEventoKeyword =
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

  // Processa extração de data e título limpo
  const parsedData = extrairDataEMensagem(msgTrim, agora);
  const prazo = parsedData.data;
  const tituloLimpo = parsedData.tituloLimpo;

  // Se houver uma data explícita (ex: 12 de Setembro) ou palavra-chave de evento, classifica como "evento" (Agenda)
  const isEvento = isEventoKeyword || (parsedData.ehDataExplicita && !isVideo);
  const tipoFinal = isEvento ? "evento" : isVideo ? "video" : "tarefa";

  const dtStr = prazo ? prazo.toLocaleDateString("pt-BR") : "";

  return [
    {
      tipo: tipoFinal,
      titulo: tituloLimpo,
      projeto: projetoEncontrado,
      prazo: prazo ? prazo.toISOString() : undefined,
      formato: msgLower.includes("vsl") ? "vsl" : msgLower.includes("reels") ? "reels" : "outro",
      confianca: 0.95,
      confirmacao: `✓ ${tipoFinal === "video" ? "Vídeo adicionado no Pipeline" : tipoFinal === "evento" ? "Compromisso agendado na Agenda" : "Tarefa criada"}: "${tituloLimpo}"${dtStr ? ` (${dtStr})` : ""}`,
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.message) {
      const msg = body.message;
      const chatId = String(msg.chat?.id);

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

      let inboxItem;
      try {
        inboxItem = await prisma.inboxItem.create({
          data: {
            origem: "telegram",
            tipoMidia,
            conteudoBruto: textContent || "[Mídia de Áudio Recebida]",
            telegramMessageId: telegramMsgId,
            status: "pendente",
          },
        });
      } catch (e) {
        return NextResponse.json({ status: "already_processed" });
      }

      let textoParaClassificar = textContent;

      // 🎤 Transcrição Inteligente de Áudio de Voz via Groq Whisper API
      if (voiceMsg && voiceMsg.file_id) {
        try {
          const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${voiceMsg.file_id}`);
          const fileData = await fileRes.json();

          if (fileData.ok && fileData.result.file_path && groq) {
            const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${fileData.result.file_path}`;
            const audioBufferRes = await fetch(downloadUrl);
            const arrayBuf = await audioBufferRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);

            const audioFile = await OpenAI.toFile(buffer, "voice.ogg");
            const transcription = await groq.audio.transcriptions.create({
              file: audioFile,
              model: "whisper-large-v3-turbo",
              language: "pt",
            });

            if (transcription && transcription.text) {
              textoParaClassificar = transcription.text.trim();
              console.log("🎤 Transcrição do Áudio:", textoParaClassificar);

              await prisma.inboxItem.update({
                where: { id: inboxItem.id },
                data: { transcricao: textoParaClassificar },
              });
            }
          }
        } catch (err) {
          console.error("[Groq Whisper Audio Error]:", err);
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

      // Se foi mensagem de áudio, inclui a transcrição na resposta para o usuário saber o que foi entendido
      const sufixoAudio = voiceMsg && textoParaClassificar ? `\n\n🎙️ _" ${textoParaClassificar} "_` : "";
      const msgLinhas = itemsClassificados.map((c: any) => c.confirmacao || `✓ ${c.tipo}: ${c.titulo}`);
      const confirmText = msgLinhas.join("\n") + sufixoAudio;

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
