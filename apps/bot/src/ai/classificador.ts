import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { tentarClassificacaoInstantanea as prePassCompartilhado } from "./classificador-local";

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
  const prePassLocal = prePassCompartilhado(mensagem, agora, contexto.projetosAtivos) as ClassificacaoOutput[] | null;
  if (prePassLocal) {
    console.log("⚡ [Pre-Pass Local] Classificado instantaneamente em 2ms!");
    return prePassLocal;
  }

  const guiaDatas = gerarGuiaDatas(agora);

  const systemPrompt = `Você é o "Meu Assessor", assistente IA para editor de vídeo.
Data Atual: ${guiaDatas}
Clientes Ativos: ${JSON.stringify(contexto.projetosAtivos)}

REGRAS DE CLASSIFICAÇÃO (em ordem de prioridade):
1. Se a palavra "tarefa" aparecer explicitamente, o tipo é SEMPRE "tarefa".
2. "video": Se mencionar vídeo, edição, VSL, Reels, corte ou criativo — mesmo com verbos como "fazer"/"adicionar" ("adicionar vídeo do Petron" = video, NÃO tarefa).
3. "lembrete": Se o usuário disser "me lembra de...", "me avise...", "lembrar que...".
   - Calcule o horário exato pedido e defina prazo (horário alvo).
4. "evento": Se pedir para "colocar na agenda", "agendar", "marcar reunião/call", "ir ao centro/médico".
5. "nota": Se pedir para "anotar" uma ideia/informação sem ação nem prazo.
6. "referencia": Links ou pedidos para "salvar referência/inspiração".
7. "tarefa": Afazeres gerais (fallback).

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
