import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";

// Groq client (OpenAI compatible)
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

export async function classificarComClaude(
  mensagem: string,
  contexto: {
    dataAtual: string;
    projetosAtivos: string[];
    ultimosItens: string[];
  }
): Promise<ClassificacaoOutput[]> {
  const systemPrompt = `Você é o assistente inteligente "Meu Assessor", especializado em organizar a vida de um editor de vídeo profissional.
Você recebe mensagens enviadas pelo usuário (texto ou áudio transcrito) e deve extrair intenções estruturadas.

RESPOSTA OBRIGATÓRIA: Devolva APENAS um array JSON válido sem nenhum texto introdutório, explicações ou markdown extra.

Data/hora atual: ${contexto.dataAtual}
Projetos/Clientes ativos no sistema: ${JSON.stringify(contexto.projetosAtivos)}
Últimos itens criados: ${JSON.stringify(contexto.ultimosItens)}

Regras de classificação:
1. "video": Edição de vídeo (VSL, Reels, Criativo, Aula, etc.). Identifique prazo, estimativa de horas e nome do cliente/projeto.
2. "tarefa": Afazer genérico (ex: "comprar plugin", "responder e-mail", "backup").
3. "evento": Compromisso com hora marcada (reunião, call, médico).
4. "nota": Anotação ou feedback de cliente.
5. "referencia": Links de inspiração de edição ou tutoriais.
6. "consulta": Pergunta sobre o sistema (ex: "o que tenho hoje?", "quantos vídeos faltam?").
7. "correcao": Correção sobre item anterior.

Estrutura de cada objeto no array JSON:
[
  {
    "tipo": "video" | "tarefa" | "evento" | "nota" | "referencia" | "consulta" | "correcao",
    "titulo": "string",
    "projeto": "string com nome do cliente se identificado",
    "formato": "reels" | "vsl" | "criativo" | "aula" | "institucional" | "outro",
    "prazo": "ISO string da data/hora",
    "estimativa_horas": 4,
    "estagio": "briefing",
    "descricao": "string",
    "tags": ["string"],
    "url": "string",
    "confianca": 0.9,
    "confirmacao": "✓ Tarefa criada: ..."
  }
]`;

  // 1. Tenta Groq Llama-3.3-70b (Rápido e Gratuito)
  if (groq) {
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mensagem },
        ],
        temperature: 0.1,
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

  // 2. Tenta Google Gemini
  if (ai) {
    try {
      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
      const response = await model.generateContent(`${systemPrompt}\n\nMensagem do usuário: "${mensagem}"`);
      const text = response.response.text();

      if (text) {
        const jsonText = text.trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
        return JSON.parse(jsonText) as ClassificacaoOutput[];
      }
    } catch (error) {
      console.error("[Gemini] Erro na classificação:", error);
    }
  }

  // 3. Tenta Anthropic Claude
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: mensagem }],
      });

      const textBlock = response.content.find((c) => c.type === "text");
      if (textBlock) {
        const jsonText = textBlock.text.trim().replace(/^```json/, "").replace(/```$/, "").trim();
        return JSON.parse(jsonText) as ClassificacaoOutput[];
      }
    } catch (error) {
      console.error("[Claude] Erro na classificação:", error);
    }
  }

  // 4. Fallback inteligente local
  return classificadorFallback(mensagem);
}

function classificadorFallback(mensagem: string): ClassificacaoOutput[] {
  const msgLower = mensagem.toLowerCase();

  if (msgLower.includes("vídeo") || msgLower.includes("video") || msgLower.includes("vsl") || msgLower.includes("reels")) {
    return [
      {
        tipo: "video",
        titulo: mensagem.length > 50 ? mensagem.slice(0, 50) + "..." : mensagem,
        formato: msgLower.includes("vsl") ? "vsl" : msgLower.includes("reels") ? "reels" : "outro",
        estimativa_horas: 4,
        confianca: 0.85,
        confirmacao: `✓ Vídeo capturado: "${mensagem.slice(0, 30)}..."`,
      },
    ];
  }

  if (msgLower.includes("http://") || msgLower.includes("https://")) {
    return [
      {
        tipo: "referencia",
        titulo: "Link de referência",
        url: mensagem,
        confianca: 0.9,
        confirmacao: "✓ Referência salva com sucesso!",
      },
    ];
  }

  return [
    {
      tipo: "tarefa",
      titulo: mensagem,
      confianca: 0.8,
      confirmacao: `✓ Tarefa criada: "${mensagem.slice(0, 35)}"`,
    },
  ];
}
