import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import OpenAI from "openai";
import { tentarClassificacaoInstantanea, formatarBRT } from "@/lib/classificador";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";

const groq = GROQ_KEY ? new OpenAI({ apiKey: GROQ_KEY, baseURL: "https://api.groq.com/openai/v1" }) : null;

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
          const hojeBRT = agora.toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          const resp = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `Você é o "Meu Assessor", assistente de um editor de vídeo brasileiro.
Agora é ${hojeBRT} (horário de Brasília, UTC-3).
Clientes ativos: ${JSON.stringify(projetosAtivosNomes)}

Classifique a mensagem em UM tipo, nesta ordem de prioridade:
1. "tarefa" — se a palavra "tarefa" aparecer explicitamente.
2. "video" — vídeo, edição, VSL, Reels, corte, criativo.
3. "lembrete" — "me lembra de...", "me avisa...".
4. "evento" — compromisso com data/hora: reunião, call, sessão, aula, consulta, almoço, viagem.
5. "nota" — ideia ou informação para guardar, sem ação nem prazo.
6. "referencia" — link ou inspiração para salvar.
7. "tarefa" — qualquer afazer que não se encaixe acima.

O "titulo" deve ser curto e limpo: sem verbo de comando, sem a data e sem o horário.
O "prazo" é ISO 8601 em UTC; converta o horário de Brasília somando 3 horas (14h BRT = 17:00Z).
Se não houver data/hora na mensagem, omita "prazo".

Responda APENAS o array JSON, sem texto ao redor:
[{"tipo":"evento","titulo":"Sessão com alunos","projeto":"Petron","prazo":"2026-09-08T17:00:00.000Z"}]`,
              },
              { role: "user", content: textoParaClassificar },
            ],
            temperature: 0.0,
            max_tokens: 300,
          });
          const raw = resp.choices[0]?.message?.content || "";
          const jsonText = raw.trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
          const parsed = JSON.parse(jsonText);
          classificacoes = (Array.isArray(parsed) ? parsed : [parsed]).map((c: any) => {
            const rotulos: Record<string, string> = {
              video: "🎬 Vídeo adicionado no Pipeline",
              evento: "📅 Compromisso agendado na Agenda",
              nota: "📝 Nota salva",
              lembrete: "⏰ Lembrete agendado",
              referencia: "🔖 Referência salva",
              tarefa: "✅ Tarefa criada",
            };
            const quando = c.prazo ? ` — ${formatarBRT(new Date(c.prazo))}` : "";
            return {
              ...c,
              confianca: c.confianca ?? 0.85,
              confirmacao:
                c.confirmacao || `${rotulos[c.tipo] || "✓ Registrado"}: "${c.titulo}"${quando}`,
            };
          });
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
