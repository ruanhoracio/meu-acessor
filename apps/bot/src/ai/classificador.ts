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

const DIAS_SEMANA_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function gerarGuiaDatas(hoje: Date) {
  const guia: string[] = [];
  const diaHoje = hoje.getDay(); // 0 = Domingo, 1 = Segunda, etc.
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
  const guiaDatas = gerarGuiaDatas(agora);

  const systemPrompt = `Você é o assistente IA super inteligente "Meu Assessor", criado para organizar a rotina de um editor de vídeo profissional.
Sua missão é entender com EXTREMA PRECISÃO a linguagem natural do usuário (português do Brasil) e extrair tarefas, vídeos, eventos ou notas com as DATAS CORRETAS.

TABELA DE REFERÊNCIA DE DATAS RELATIVAS (USE ESTA TABELA PARA RESOLVER DIAS DA SEMANA):
${guiaDatas}

REGRAS CRÍTICAS DE INTERPRETAÇÃO DE DATA/PRAZO:
1. Quando o usuário disser "segunda", "segunda feira", "segunda-feira", "pra segunda":
   - Consulte a tabela acima e pegue a data ISO referente a "Segunda-feira" (ex: se hoje é sexta dia 7, Segunda-feira é dia 10!).
   - Defina "prazo": "YYYY-MM-DDT18:00:00.000Z".
2. Limpe o título da tarefa/vídeo removendo a menção da data.
   - Exemplo de entrada: "Editar vídeo do cliente Petron para segunda feira"
   - Título limpo: "Editar vídeo do cliente Petron"
   - Projeto identificado: "Petron"
   - Prazo: ISO date da Segunda-feira correspondente.
3. Se houver mais de uma linha na mensagem (ex: uma lista de tarefas), devolva um objeto no array JSON para CADA item.
4. "video": Se o usuário mencionar edição de vídeo, cortar, VSL, Reels, Criativo, aula, canal, clipe, etc.
5. "tarefa": Qualquer outro afazer (ex: pagar contas, fazer app, enviar e-mail, reunião, etc.).

ESTRUTURA DO ARRAY JSON DE RESPOSTA (SEM MARKDOWN ADICIONAL, APENAS O ARRAY JSON PURO):
[
  {
    "tipo": "video" | "tarefa" | "evento" | "nota" | "referencia" | "consulta" | "correcao",
    "titulo": "Título limpo sem expressão de data",
    "projeto": "Nome do cliente se mencionado",
    "formato": "reels" | "vsl" | "criativo" | "aula" | "institucional" | "outro",
    "prazo": "YYYY-MM-DDT18:00:00.000Z",
    "estimativa_horas": 4,
    "confianca": 0.95,
    "confirmacao": "✓ Tarefa criada: Título (Prazo: Segunda-feira, 10/08)"
  }
]`;

  // 1. Groq (Llama-3.3-70b - Rápido e ultra preciso)
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

  // 2. Gemini
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

  // 3. Fallback com suporte a parsing de datas por regex inteligente
  return classificadorFallback(mensagem, agora);
}

function classificadorFallback(mensagem: string, agora: Date): ClassificacaoOutput[] {
  const linhas = mensagem.split("\n").map(l => l.trim()).filter(Boolean);
  const resultados: ClassificacaoOutput[] = [];

  for (const linha of linhas) {
    const msgLower = linha.toLowerCase();

    // Tenta encontrar dia da semana por regex
    let prazo: Date | null = null;
    let tituloLimpo = linha;

    const regexSegunda = /(?:para|pra|em|na)?\s*(segunda(?:-feira)?)/i;
    const regexTerca = /(?:para|pra|em|na)?\s*(terça(?:-feira)?|terca(?:-feira)?)/i;
    const regexQuarta = /(?:para|pra|em|na)?\s*(quarta(?:-feira)?)/i;
    const regexQuinta = /(?:para|pra|em|na)?\s*(quinta(?:-feira)?)/i;
    const regexSexta = /(?:para|pra|em|na)?\s*(sexta(?:-feira)?)/i;
    const regexSabado = /(?:para|pra|em|no)?\s*(sábado|sabado)/i;
    const regexDomingo = /(?:para|pra|em|no)?\s*(domingo)/i;

    const alvos: [RegExp, number][] = [
      [regexDomingo, 0],
      [regexSegunda, 1],
      [regexTerca, 2],
      [regexQuarta, 3],
      [regexQuinta, 4],
      [regexSexta, 5],
      [regexSabado, 6],
    ];

    for (const [regex, targetDay] of alvos) {
      if (regex.test(msgLower)) {
        const d = new Date(agora);
        let diff = targetDay - d.getDay();
        if (diff <= 0) diff += 7; // Próximo dia correspondente
        d.setDate(d.getDate() + diff);
        d.setHours(18, 0, 0, 0);
        prazo = d;
        tituloLimpo = linha.replace(regex, "").replace(/\s+/g, " ").trim();
        break;
      }
    }

    const isVideo = msgLower.includes("vídeo") || msgLower.includes("video") || msgLower.includes("vsl") || msgLower.includes("reels") || msgLower.includes("corte");

    resultados.push({
      tipo: isVideo ? "video" : "tarefa",
      titulo: tituloLimpo || linha,
      prazo: prazo ? prazo.toISOString() : undefined,
      formato: msgLower.includes("vsl") ? "vsl" : msgLower.includes("reels") ? "reels" : "outro",
      confianca: 0.9,
      confirmacao: `✓ ${isVideo ? "Vídeo" : "Tarefa"} criada: "${tituloLimpo || linha}"${prazo ? ` (Prazo: ${prazo.toLocaleDateString("pt-BR")})` : ""}`,
    });
  }

  return resultados;
}
