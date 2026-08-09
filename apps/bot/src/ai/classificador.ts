import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";

const groq = config.groqApiKey
  ? new OpenAI({ apiKey: config.groqApiKey, baseURL: "https://api.groq.com/openai/v1" })
  : null;

const ai = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;
const anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

export interface ClassificacaoOutput {
  tipo: "video" | "tarefa" | "evento" | "nota" | "referencia" | "lembrete" | "consulta" | "correcao";
  titulo: string;
  projeto?: string;
  formato?: "reels" | "vsl" | "criativo" | "aula" | "institucional" | "outro";
  prazo?: string;
  horarioNotificar?: string;
  estimativa_horas?: number;
  estagio?: string;
  descricao?: string;
  tags?: string[];
  url?: string;
  confianca: number;
  confirmacao: string;
}

const DIAS_SEMANA_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function gerarGuiaDatas(hoje: Date) {
  const guia: string[] = [];
  const diaHoje = hoje.getDay();
  guia.push(`Hoje: ${DIAS_SEMANA_PT[diaHoje]}, ${hoje.toISOString().split("T")[0]}`);

  for (let i = 1; i <= 7; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    const nomeDia = DIAS_SEMANA_PT[d.getDay()];
    guia.push(`${nomeDia}: ${d.toISOString().split("T")[0]}`);
  }

  return guia.join("\n");
}

export async function classificarComClaude(
  mensagem: string,
  contexto: {
    dataAtual: string;
    projetosAtivos: string[];
    ultimosItens: string[];
  }
): Promise<ClassificacaoOutput[]> {
  const agora = new Date(contexto.dataAtual || Date.now());

  // ⚡ 0. PRE-PASS ULTRA-RÁPIDO LOCAL (~2ms) para frases simples e lembretes
  const prePassLocal = tentarClassificacaoInstantanea(mensagem, agora, contexto.projetosAtivos);
  if (prePassLocal) {
    console.log("⚡ [Pre-Pass Local] Classificado instantaneamente em 2ms!");
    return prePassLocal;
  }

  const guiaDatas = gerarGuiaDatas(agora);

  const systemPrompt = `Você é o "Meu Assessor", assistente IA para editor de vídeo.
Data Atual: ${guiaDatas}
Clientes Ativos: ${JSON.stringify(contexto.projetosAtivos)}

REGRAS DE CLASSIFICAÇÃO:
1. "lembrete": Se o usuário disser "me lembra de...", "me avise...", "lembrar que...".
   - Calcule o horário exato pedido e defina prazo (horário alvo).
2. "evento": Se pedir para "colocar na agenda", "agendar", "marcar reunião/call", "ir ao centro/médico".
3. "video": Se mencionar edição de vídeo, VSL, Reels, Criativo.
4. "tarefa": Afazeres gerais.

Responda APENAS um array JSON válido:
[
  {
    "tipo": "video" | "tarefa" | "evento" | "nota" | "referencia" | "lembrete",
    "titulo": "Título limpo",
    "projeto": "Nome do cliente se mencionado",
    "prazo": "YYYY-MM-DDT18:00:00.000Z",
    "confianca": 0.95,
    "confirmacao": "⏰ Lembrete agendado para às 09:00 (Aviso em 5 min antes)"
  }
]`;

  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mensagem },
        ],
        temperature: 0.0,
        max_tokens: 300,
      });

      const text = response.choices[0]?.message?.content;
      if (text) {
        const jsonText = text.trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
        return JSON.parse(jsonText) as ClassificacaoOutput[];
      }
    } catch (error) {
      console.error("[Groq Llama] Erro na classificação:", error);
    }
  }

  return classificadorFallback(mensagem, agora);
}

// ⚡ Algoritmo de classificação local instantâneo (~2ms)
function tentarClassificacaoInstantanea(
  mensagem: string,
  agora: Date,
  projetosAtivos: string[]
): ClassificacaoOutput[] | null {
  const msgTrim = mensagem.trim();
  if (msgTrim.includes("\n") || msgTrim.length > 120) return null;

  const msgLower = msgTrim.toLowerCase();

  // ⏰ DETECÇÃO DE LEMBRETE PROATIVO ("me lembra de amanhã às 9 chamar tal pessoa")
  const isLembrete =
    msgLower.includes("me lembra") ||
    msgLower.includes("me lembre") ||
    msgLower.includes("lembrar de") ||
    msgLower.includes("lembrar que") ||
    msgLower.includes("me avisa") ||
    msgLower.includes("me avise");

  if (isLembrete) {
    let dataAlvo = new Date(agora);

    // Verifica se é amanhã
    if (msgLower.includes("amanhã") || msgLower.includes("amanha")) {
      dataAlvo.setDate(dataAlvo.getDate() + 1);
    }

    // Extrai horário (ex: às 9, às 09:00, 15h, às 14:30)
    let hora = 9;
    let minuto = 0;

    const matchHora = msgLower.match(/(?:às|as|para\s*as|para\s*às)?\s*(\d{1,2})(?:h|:(\d{2}))?/i);
    if (matchHora) {
      hora = parseInt(matchHora[1], 10);
      if (matchHora[2]) minuto = parseInt(matchHora[2], 10);
    }

    dataAlvo.setHours(hora, minuto, 0, 0);

    // Se o horário calculado já passou hoje, agenda para amanhã no mesmo horário
    if (dataAlvo <= agora && !msgLower.includes("amanhã") && !msgLower.includes("amanha")) {
      dataAlvo.setDate(dataAlvo.getDate() + 1);
    }

    // Horário da notificação proativa: 5 MINUTOS ANTES
    const dataNotificar = new Date(dataAlvo.getTime() - 5 * 60 * 1000);

    // Limpa a frase do título
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

  // Verifica se é link
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

  // Detecta se é agendamento / evento de agenda
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

  // Detecta se é vídeo
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

  const regexSegunda = /(?:para|pra|em|na)?\s*(segunda(?:-feira)?)/i;
  const regexTerca = /(?:para|pra|em|na)?\s*(terça(?:-feira)?|terca(?:-feira)?)/i;
  const regexQuarta = /(?:para|pra|em|na)?\s*(quarta(?:-feira)?)/i;
  const regexQuinta = /(?:para|pra|em|na)?\s*(quinta(?:-feira)?)/i;
  const regexSexta = /(?:para|pra|em|na)?\s*(sexta(?:-feira)?)/i;
  const regexSabado = /(?:para|pra|em|no)?\s*(sábado|sabado)/i;
  const regexDomingo = /(?:para|pra|em|no)?\s*(domingo)/i;
  const regexAmanha = /(?:para|pra)?\s*(amanhã|amanha)/i;
  const regexHoje = /(?:para|pra)?\s*(hoje)/i;

  const alvos: [RegExp, number | string][] = [
    [regexAmanha, "amanha"],
    [regexHoje, "hoje"],
    [regexDomingo, 0],
    [regexSegunda, 1],
    [regexTerca, 2],
    [regexQuarta, 3],
    [regexQuinta, 4],
    [regexSexta, 5],
    [regexSabado, 6],
  ];

  for (const [regex, target] of alvos) {
    if (regex.test(msgLower)) {
      const d = new Date(agora);
      if (target === "hoje") {
        d.setHours(18, 0, 0, 0);
      } else if (target === "amanha") {
        d.setDate(d.getDate() + 1);
        d.setHours(18, 0, 0, 0);
      } else if (typeof target === "number") {
        let diff = target - d.getDay();
        if (diff <= 0) diff += 7;
        d.setDate(d.getDate() + diff);
        d.setHours(18, 0, 0, 0);
      }
      prazo = d;
      tituloLimpo = msgTrim.replace(regex, "").replace(/\s+/g, " ").trim();
      break;
    }
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

function classificadorFallback(mensagem: string, agora: Date): ClassificacaoOutput[] {
  return [
    {
      tipo: "tarefa",
      titulo: mensagem,
      confianca: 0.9,
      confirmacao: `✓ Tarefa criada: "${mensagem.slice(0, 35)}"`,
    },
  ];
}
