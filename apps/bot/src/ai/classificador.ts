import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";

// Groq client (OpenAI compatible) - Ultra-rápido (300ms)
const groq = config.groqApiKey
  ? new OpenAI({ apiKey: config.groqApiKey, baseURL: "https://api.groq.com/openai/v1" })
  : null;

const ai = config.geminiApiKey ? new GoogleGenerativeAI(config.geminiApiKey) : null;
const anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

export interface ClassificacaoOutput {
  tipo: "video" | "tarefa" | "evento" | "nota" | "referencia" | "consulta" | "correcao";
  titulo: string;
  projeto?: string;
  formato?: "reels" | "vsl" | "criativo" | "aula" | "institucional" | "outro";
  prazo?: string;
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

  // ⚡ 0. PRE-PASS ULTRA-RÁPIDO LOCAL (~2ms) para frases simples e diretas
  const prePassLocal = tentarClassificacaoInstantanea(mensagem, agora, contexto.projetosAtivos);
  if (prePassLocal) {
    console.log("⚡ [Pre-Pass Local] Classificado instantaneamente em 2ms!");
    return prePassLocal;
  }

  const guiaDatas = gerarGuiaDatas(agora);

  const systemPrompt = `Você é o "Meu Assessor", assistente IA ultra-rápido para editor de vídeo.
Data Atual: ${guiaDatas}
Clientes Ativos: ${JSON.stringify(contexto.projetosAtivos)}

Classifique a mensagem e responda APENAS um array JSON válido:
[
  {
    "tipo": "video" | "tarefa" | "evento" | "nota" | "referencia",
    "titulo": "Título limpo sem expressão de data",
    "projeto": "Nome do cliente se mencionado",
    "formato": "reels" | "vsl" | "criativo" | "aula" | "institucional" | "outro",
    "prazo": "YYYY-MM-DDT18:00:00.000Z",
    "confianca": 0.95,
    "confirmacao": "✓ Tarefa criada: Título (Prazo: Quinta-feira, 10/08)"
  }
]`;

  // 1. Groq (Llama-3.3-70b - Resposta em 250ms com max_tokens reduzido)
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

  // 2. Gemini
  if (ai) {
    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const response = await model.generateContent(`${systemPrompt}\n\nMensagem: "${mensagem}"`);
      const text = response.response.text();

      if (text) {
        const jsonText = text.trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
        return JSON.parse(jsonText) as ClassificacaoOutput[];
      }
    } catch (error) {
      console.error("[Gemini] Erro na classificação:", error);
    }
  }

  // 3. Fallback inteligente local
  return classificadorFallback(mensagem, agora);
}

// ⚡ Algoritmo de classificação local instantâneo (~2ms)
function tentarClassificacaoInstantanea(
  mensagem: string,
  agora: Date,
  projetosAtivos: string[]
): ClassificacaoOutput[] | null {
  const msgTrim = mensagem.trim();
  if (msgTrim.includes("\n") || msgTrim.length > 80) return null; // Para mensagens longas usa LLM

  const msgLower = msgTrim.toLowerCase();

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

  // Detecta se é agendamento / reunião
  const isEvento = msgLower.includes("agendar") || msgLower.includes("reunião") || msgLower.includes("reuniao") || msgLower.includes("call com") || msgLower.includes("marcar ");
  // Detecta se é vídeo
  const isVideo = msgLower.includes("vídeo") || msgLower.includes("video") || msgLower.includes("vsl") || msgLower.includes("reels") || msgLower.includes("corte");

  // Identifica projeto se houver na mensagem
  let projetoEncontrado: string | undefined;
  for (const proj of projetosAtivos) {
    if (msgLower.includes(proj.toLowerCase())) {
      projetoEncontrado = proj;
      break;
    }
  }

  // Detecta datas relativas
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

  // Limpa prefixos de comando como "agendar", "marcar", "criar tarefa"
  tituloLimpo = tituloLimpo
    .replace(/^(agendar|marcar|criar|fazer)\s+/i, "")
    .trim();
  if (!tituloLimpo) tituloLimpo = msgTrim;
  // Capitaliza primeira letra
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
