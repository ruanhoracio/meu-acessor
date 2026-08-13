/**
 * Classificador de mensagens do Telegram (webhook /api/telegram).
 *
 * O servidor da Vercel roda em UTC, mas o usuário fala sempre em horário de
 * Brasília. Todas as datas construídas aqui aplicam o offset BRT explicitamente
 * para que "às 14h" vire 14h no app, e não 14h UTC (11h no relógio dele).
 */

// Brasil não usa mais horário de verão: UTC-3 o ano inteiro.
const BRT_OFFSET_HORAS = 3;

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

export interface ClassificacaoOutput {
  tipo: "video" | "tarefa" | "evento" | "nota" | "referencia" | "lembrete";
  titulo: string;
  projeto?: string;
  formato?: string;
  prazo?: string;
  horarioNotificar?: string;
  url?: string;
  tags?: string[];
  confianca: number;
  confirmacao: string;
}

/** Componentes de calendário do "agora" no fuso de Brasília. */
function partesBRT(agora: Date) {
  const deslocado = new Date(agora.getTime() - BRT_OFFSET_HORAS * 3600000);
  return {
    ano: deslocado.getUTCFullYear(),
    mes: deslocado.getUTCMonth(),
    dia: deslocado.getUTCDate(),
    hora: deslocado.getUTCHours(),
    minuto: deslocado.getUTCMinutes(),
  };
}

/** Monta um Date real a partir de componentes escritos em horário de Brasília. */
function dataBRT(ano: number, mes: number, dia: number, hora = 9, minuto = 0): Date {
  return new Date(Date.UTC(ano, mes, dia, hora + BRT_OFFSET_HORAS, minuto, 0, 0));
}

export function formatarBRT(data: Date, comHora = true): string {
  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Procura um horário explícito: "às 14h", "14:30", "9h30", "às 9". */
function extrairHorario(msg: string): { hora: number; minuto: number; trecho: string } | null {
  const padroes = [
    /(?:às|as|ás|@)\s*(\d{1,2})[:h](\d{2})/i, // às 14:30 / às 14h30
    /(?:às|as|ás|@)\s*(\d{1,2})\s*h(?!\d)/i, // às 14h
    /(?:às|as|ás|@)\s*(\d{1,2})(?!\d|\s*\/)/i, // às 14
    /\b(\d{1,2})[:h](\d{2})\b/i, // 14:30 / 14h30
    /\b(\d{1,2})\s*h(?!\d)/i, // 14h
  ];

  for (const re of padroes) {
    const m = msg.match(re);
    if (!m) continue;
    const hora = parseInt(m[1], 10);
    const minuto = m[2] ? parseInt(m[2], 10) : 0;
    if (hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59) {
      return { hora, minuto, trecho: m[0] };
    }
  }
  return null;
}

function limparTitulo(texto: string): string {
  let t = texto
    // horários: "às 14h", "14:30", "as 9"
    .replace(/(?:,\s*)?(?:às|as|ás|@)\s*\d{1,2}(?:[:h]\d{2})?\s*h?\b/gi, " ")
    .replace(/\b\d{1,2}[:h]\d{2}\b/gi, " ")
    .replace(/\b\d{1,2}\s*h\b/gi, " ")
    // datas com ou sem o prefixo "dia"/"no dia"
    .replace(/(?:\b(?:no|em)\s+)?\bdias?\s+\d{1,2}\s*\/\s*\d{1,2}(?:\s*\/\s*\d{2,4})?/gi, " ")
    .replace(/(?:\b(?:no|em)\s+)?\bdias?\s+\d{1,2}\s+de\s+[a-zçã]+/gi, " ")
    .replace(/\b\d{1,2}\s*\/\s*\d{1,2}(?:\s*\/\s*\d{2,4})?/g, " ")
    .replace(/\b\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/gi, " ")
    // referências relativas (sem \b final: "ã" não conta como caractere de palavra)
    .replace(/(?:\b(?:para|pra|no|na|em)\s+)?(?:\bdepois\s+de\s+)?\bamanh[ãa](?![a-z])/gi, " ")
    .replace(/(?:\b(?:para|pra|no|na|em)\s+)?\bhoje\b/gi, " ")
    // pedidos de lembrete
    .replace(/^(?:por\s*favor,?\s*)?(?:me\s+)?(?:lembr[ae]|lembrar|avis[ae]|avisar)(?:\s+(?:de|que|pra|para))?\s*/gi, " ")
    // verbos de comando no início
    .replace(/^(?:por\s*favor,?\s*)?(?:adicione|adicionar|criar?|crie|coloque|colocar|p[õo]e|bota|botar|marca|marcar|agenda|agendar|salva|salvar|anota|anotar|fazer|faz)\b\s*/gi, " ")
    // rótulo explícito do tipo ("tarefa: x", "uma nota de y")
    .replace(/^(?:uma?|o|a)?\s*(?:tarefa|nota|evento|compromisso|refer[êe]ncia)\s*(?::|-|\bde\b|\bpara\b|\bpra\b)\s*/gi, " ")
    .replace(/\b(?:na|para\s+a|pra)\s+agenda\b/gi, " ")
    .replace(/^(?:preciso|tenho\s+que|tenho\s+de)\s+/gi, " ")
    // sobras de pontuação e espaços
    .replace(/\s*,\s*(?=,|$)/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;:\-_.]+/, "")
    .replace(/[\s,;:\-_]+$/, "")
    .replace(/\s+\.$/, "")
    .trim();

  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Extrai data + horário da frase e devolve o título já limpo. */
export function extrairDataEMensagem(mensagem: string, agora: Date) {
  const msgTrim = mensagem.trim();
  const hojeBRT = partesBRT(agora);

  const horario = extrairHorario(msgTrim);
  const hora = horario ? horario.hora : 9;
  const minuto = horario ? horario.minuto : 0;

  let dataCalculada: Date | null = null;
  let ehDataExplicita = false;

  // 1. "8 de setembro"
  const matchMesExt = msgTrim.match(
    /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i
  );
  if (matchMesExt) {
    const diaNum = parseInt(matchMesExt[1], 10);
    const mesIdx = MESES_MAP[matchMesExt[2].toLowerCase()];
    if (mesIdx !== undefined && diaNum >= 1 && diaNum <= 31) {
      let ano = hojeBRT.ano;
      // Data já passada neste ano → assume o ano que vem
      if (mesIdx < hojeBRT.mes || (mesIdx === hojeBRT.mes && diaNum < hojeBRT.dia)) ano += 1;
      dataCalculada = dataBRT(ano, mesIdx, diaNum, hora, minuto);
      ehDataExplicita = true;
    }
  }

  // 2. "08/09" ou "08/09/2026"
  if (!dataCalculada) {
    const matchBarra = msgTrim.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/);
    if (matchBarra) {
      const diaNum = parseInt(matchBarra[1], 10);
      const mesNum = parseInt(matchBarra[2], 10) - 1;
      let ano = matchBarra[3] ? parseInt(matchBarra[3], 10) : hojeBRT.ano;
      if (ano < 100) ano += 2000;

      if (mesNum >= 0 && mesNum <= 11 && diaNum >= 1 && diaNum <= 31) {
        if (!matchBarra[3] && (mesNum < hojeBRT.mes || (mesNum === hojeBRT.mes && diaNum < hojeBRT.dia))) {
          ano += 1;
        }
        dataCalculada = dataBRT(ano, mesNum, diaNum, hora, minuto);
        ehDataExplicita = true;
      }
    }
  }

  // 3. "amanhã" / "hoje"
  if (!dataCalculada) {
    const msgLower = msgTrim.toLowerCase();
    if (/\bamanh[ãa]\b/.test(msgLower)) {
      dataCalculada = dataBRT(hojeBRT.ano, hojeBRT.mes, hojeBRT.dia + 1, hora, minuto);
      ehDataExplicita = true;
    } else if (/\bhoje\b/.test(msgLower)) {
      dataCalculada = dataBRT(hojeBRT.ano, hojeBRT.mes, hojeBRT.dia, horario ? hora : 18, minuto);
      ehDataExplicita = !!horario;
    }
  }

  // 4. Só horário, sem dia: hoje se ainda dá tempo, senão amanhã
  if (!dataCalculada && horario) {
    const candidato = dataBRT(hojeBRT.ano, hojeBRT.mes, hojeBRT.dia, hora, minuto);
    dataCalculada = candidato > agora
      ? candidato
      : dataBRT(hojeBRT.ano, hojeBRT.mes, hojeBRT.dia + 1, hora, minuto);
  }

  const tituloLimpo = limparTitulo(msgTrim) || msgTrim;

  return { data: dataCalculada, tituloLimpo, ehDataExplicita, temHorario: !!horario };
}

/** Classificação local instantânea. Retorna null quando a frase é ambígua (aí a IA decide). */
export function tentarClassificacaoInstantanea(
  mensagem: string,
  agora: Date,
  projetosAtivos: string[]
): ClassificacaoOutput[] | null {
  const msgTrim = mensagem.trim();
  if (!msgTrim) return null;
  if (msgTrim.includes("\n") || msgTrim.length > 160) return null;

  const msgLower = msgTrim.toLowerCase();

  // Link solto → referência
  if (msgLower.startsWith("http://") || msgLower.startsWith("https://")) {
    return [
      {
        tipo: "referencia",
        titulo: "Link de referência",
        url: msgTrim,
        confianca: 0.95,
        confirmacao: "🔖 Referência salva com sucesso!",
      },
    ];
  }

  const parsed = extrairDataEMensagem(msgTrim, agora);
  const tituloLimpo = parsed.tituloLimpo;

  // Lembrete proativo
  const isLembrete = /\b(?:me\s+lembr[ae]|lembrar\s+(?:de|que)|me\s+avis[ae])\b/i.test(msgLower);
  if (isLembrete) {
    const dataAlvo = parsed.data || dataBRT(
      partesBRT(agora).ano,
      partesBRT(agora).mes,
      partesBRT(agora).dia + 1,
      9,
      0
    );
    const dataNotificar = new Date(dataAlvo.getTime() - 5 * 60 * 1000);

    return [
      {
        tipo: "lembrete",
        titulo: tituloLimpo,
        prazo: dataAlvo.toISOString(),
        horarioNotificar: dataNotificar.toISOString(),
        confianca: 0.98,
        confirmacao: `⏰ *Lembrete Agendado!*\n📌 *O que:* "${tituloLimpo}"\n📅 *Quando:* ${formatarBRT(dataAlvo)}\n🔔 *Aviso:* ${formatarBRT(dataNotificar)} (5 min antes)`,
      },
    ];
  }

  // "tarefa" explícito vence tudo; "fazer"/"preciso" são sinais fracos
  const isExplicitTarefa = /\btarefas?\b|\bafazer/i.test(msgLower);
  const isWeakTarefa = /\bfazer\b|\bpreciso\b|\btenho\s+(?:que|de)\b/i.test(msgLower);

  const isExplicitVideo = /\bv[íi]deos?\b|\bvsl\b|\breels?\b|\bcortes?\b|\bcriativos?\b|\bedi[çc][ãa]o\b|\beditar\b/i.test(msgLower);

  const isExplicitEvento =
    /\bagend|\bmarcar?\b|\breuni[ãa]o\b|\bcall\b|\bcompromisso\b|\bsess[ãa]o\b|\bmentoria\b|\baula\b|\bpalestra\b|\bevento\b|\bconsulta\b|\bm[ée]dico\b|\bdentista\b|\bbarbeiro\b|\balmo[çc]o\b|\bjantar\b|\bviagem\b|\bir\s+(?:no|ao|na|para|pra)\b/i.test(msgLower);

  const isExplicitNota = /\banotar?\b|\banote\b|\bnota\s*:/i.test(msgLower) || msgLower.startsWith("nota ");

  let tipoFinal: "video" | "tarefa" | "evento" | "nota";
  if (isExplicitTarefa) tipoFinal = "tarefa";
  else if (isExplicitVideo) tipoFinal = "video";
  else if (isExplicitEvento) tipoFinal = "evento";
  else if (isExplicitNota) tipoFinal = "nota";
  else if (parsed.ehDataExplicita) tipoFinal = "evento";
  else if (isWeakTarefa) tipoFinal = "tarefa";
  else return null; // ambíguo: deixa a IA classificar

  let projetoEncontrado: string | undefined;
  for (const proj of projetosAtivos) {
    if (msgLower.includes(proj.toLowerCase())) {
      projetoEncontrado = proj;
      break;
    }
  }

  const rotulos: Record<string, string> = {
    video: "🎬 Vídeo adicionado no Pipeline",
    evento: "📅 Compromisso agendado na Agenda",
    nota: "📝 Nota salva",
    tarefa: "✅ Tarefa criada",
  };

  const quando = parsed.data
    ? ` — ${formatarBRT(parsed.data, tipoFinal === "evento" || parsed.temHorario)}`
    : "";

  return [
    {
      tipo: tipoFinal,
      titulo: tituloLimpo,
      projeto: projetoEncontrado,
      prazo: parsed.data ? parsed.data.toISOString() : undefined,
      formato: msgLower.includes("vsl") ? "vsl" : /reels?/i.test(msgLower) ? "reels" : "outro",
      confianca: 0.95,
      confirmacao: `${rotulos[tipoFinal]}: "${tituloLimpo}"${quando}`,
    },
  ];
}
