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
    .replace(/^(?:adicione|adicionar|criar|fazer|coloque|colocar|põe|bota)?\s*(?:uma\s*)?(?:tarefa|tarefas)?\s*(?:para|pra|que\s*é)?\s*/gi, "")
    .replace(/^tarefa\s*(?:pra|para|de)?\s*/gi, "")
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
      const h = parseInt(matchHora[1], 10);
      const m = matchHora[2] ? parseInt(matchHora[2], 10) : 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        hora = h;
        minuto = m;
      }
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

  // 1. Palavra-chave EXPLÍCITA de TAREFA (só a palavra "tarefa"/"afazeres" conta;
  //    "fazer" sozinho é sinal fraco e não pode roubar mensagens de vídeo/evento)
  const isExplicitTarefa = /\btarefas?\b|\bafazer/i.test(msgLower);
  const isWeakTarefa = /\bfazer\b|\bpreciso\b|\btenho\s+(?:que|de)\b/i.test(msgLower);

  // 2. Palavras-chave explícitas de VÍDEO / PIPELINE
  const isExplicitVideo =
    msgLower.includes("vídeo") ||
    msgLower.includes("video") ||
    msgLower.includes("vsl") ||
    msgLower.includes("reels") ||
    msgLower.includes("corte") ||
    msgLower.includes("criativo") ||
    msgLower.includes("editar") ||
    msgLower.includes("edição") ||
    msgLower.includes("edicao");

  // 3. Palavras-chave explícitas de EVENTO DE AGENDA
  const isExplicitEvento =
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

  // 4. Palavras-chave explícitas de NOTA
  const isExplicitNota =
    /\banotar?\b|\banote\b|\bnota\s*:/i.test(msgLower) || msgLower.startsWith("nota ");

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

  // HIERARQUIA DE DECISÃO: quem fala "tarefa" quer tarefa; quem fala "vídeo" quer vídeo.
  // Sinais fracos ("fazer", "preciso") só decidem quando não há sinal explícito.
  let tipoFinal: "video" | "tarefa" | "evento" | "nota";

  if (isExplicitTarefa) {
    tipoFinal = "tarefa";
  } else if (isExplicitVideo) {
    tipoFinal = "video";
  } else if (isExplicitEvento) {
    tipoFinal = "evento";
  } else if (isExplicitNota) {
    tipoFinal = "nota";
  } else if (parsedData.ehDataExplicita) {
    tipoFinal = "evento";
  } else if (isWeakTarefa) {
    tipoFinal = "tarefa";
  } else {
    // Nenhum sinal claro: deixa a IA (Groq/LLM) decidir em vez de chutar "tarefa"
    return null;
  }

  const dtStr = prazo ? prazo.toLocaleDateString("pt-BR") : "";

  const rotulos: Record<string, string> = {
    video: "🎬 Vídeo adicionado no Pipeline",
    evento: "📅 Compromisso agendado na Agenda",
    nota: "📝 Nota salva",
    tarefa: "✅ Tarefa criada",
  };

  return [
    {
      tipo: tipoFinal,
      titulo: tituloLimpo,
      projeto: projetoEncontrado,
      prazo: prazo ? prazo.toISOString() : undefined,
      formato: msgLower.includes("vsl") ? "vsl" : msgLower.includes("reels") ? "reels" : "outro",
      confianca: 0.95,
      confirmacao: `${rotulos[tipoFinal]}: "${tituloLimpo}"${dtStr ? ` (${dtStr})` : ""}`,
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
