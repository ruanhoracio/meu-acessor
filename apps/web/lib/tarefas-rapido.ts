/**
 * "Adicionar rápido" no estilo Todoist: uma linha só, e o app entende
 * data, prioridade, projeto, etiqueta e recorrência pelo texto.
 *
 *   "Ligar pro cliente amanhã p1 #Petron @urgente"
 *   "Pagar contas dia 10 todo mês"
 *   "Academia seg qua sex"
 *
 * Tudo em horário local do navegador (roda no cliente).
 */

export type PrioridadeApp = "urgente" | "alta" | "media" | "baixa";

export interface Interpretacao {
  titulo: string;
  prazo: Date | null;
  prioridade: PrioridadeApp | null;
  projetoNome: string | null;
  etiquetas: string[];
  recorrencia: string | null;
  /** Trechos reconhecidos, para destacar no campo enquanto digita */
  trechos: { texto: string; tipo: "data" | "prioridade" | "projeto" | "etiqueta" | "recorrencia" }[];
}

// P1..P4 do Todoist -> nossas prioridades
export const P_PARA_PRIORIDADE: Record<string, PrioridadeApp> = { p1: "urgente", p2: "alta", p3: "media", p4: "baixa" };
export const PRIORIDADE_PARA_P: Record<PrioridadeApp, 1 | 2 | 3 | 4> = { urgente: 1, alta: 2, media: 3, baixa: 4 };

const DIAS: Record<string, number> = {
  domingo: 0, dom: 0,
  segunda: 1, seg: 1,
  terca: 2, "terça": 2, ter: 2,
  quarta: 3, qua: 3,
  quinta: 4, qui: 4,
  sexta: 5, sex: 5,
  sabado: 6, "sábado": 6, sab: 6, "sáb": 6,
};
const MESES: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

function hojeLocal(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

function comDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

function proximoDiaSemana(base: Date, alvo: number, incluirHoje = false): Date {
  const atual = base.getDay();
  let delta = (alvo - atual + 7) % 7;
  if (delta === 0 && !incluirHoje) delta = 7;
  return comDias(base, delta);
}

export function interpretarLinhaRapida(entrada: string, projetos: { nome: string }[] = []): Interpretacao {
  let texto = entrada;
  const trechos: Interpretacao["trechos"] = [];
  const tira = (m: RegExpMatchArray | null, tipo: Interpretacao["trechos"][number]["tipo"]) => {
    if (!m) return false;
    trechos.push({ texto: m[0].trim(), tipo });
    texto = texto.replace(m[0], " ");
    return true;
  };

  // ── prioridade: p1..p4, ou "!!"/"!!!"
  let prioridade: PrioridadeApp | null = null;
  const mp = texto.match(/(?:^|\s)(p[1-4])(?=\s|$)/i);
  if (mp) {
    prioridade = P_PARA_PRIORIDADE[mp[1].toLowerCase()];
    tira(mp, "prioridade");
  }

  // ── projeto: #Nome (casa com o começo do nome, sem acento/caixa)
  let projetoNome: string | null = null;
  const mproj = texto.match(/(?:^|\s)#([\p{L}\p{N}_-]+)/u);
  if (mproj) {
    const chave = mproj[1].normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const achado = projetos.find((p) => p.nome.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().startsWith(chave));
    projetoNome = achado?.nome ?? mproj[1];
    tira(mproj, "projeto");
  }

  // ── etiquetas: @nome (várias)
  const etiquetas: string[] = [];
  let me: RegExpMatchArray | null;
  while ((me = texto.match(/(?:^|\s)@([\p{L}\p{N}_-]+)/u))) {
    etiquetas.push(me[1].toLowerCase());
    tira(me, "etiqueta");
  }

  // ── recorrência
  let recorrencia: string | null = null;
  const hoje = hojeLocal();
  let prazo: Date | null = null;

  const mrec =
    texto.match(/\b(todo\s+dia|todos\s+os\s+dias|diariamente|diário|diaria)\b/i) ||
    texto.match(/\b(toda\s+semana|semanalmente|semanal)\b/i) ||
    texto.match(/\b(todo\s+m[êe]s|mensalmente|mensal)\b/i);
  if (mrec) {
    const t = mrec[1].toLowerCase();
    recorrencia = /dia|di[aá]ri/.test(t) ? "diaria" : /semana/.test(t) ? "semanal" : "mensal";
    tira(mrec, "recorrencia");
  }
  // "toda seg", "seg qua sex", "todas as terças"
  const mdias = texto.match(/\b(?:tod[ao]s?\s+(?:as\s+|os\s+)?)?((?:(?:segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo|seg|ter|qua|qui|sex|s[áa]b|dom)s?(?:-feiras?)?(?:\s*,?\s*(?:e\s+)?)?){2,})(?=\s|$)/i);
  const mdiaUnico = texto.match(/\b(toda|todas\s+as|todo|todos\s+os)\s+((?:segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo|seg|ter|qua|qui|sex|s[áa]b|dom)s?(?:-feiras?)?)\b/i);
  if (!recorrencia && (mdias || mdiaUnico)) {
    const m = mdias || (mdiaUnico as RegExpMatchArray);
    const nomes = (mdias ? m[1] : (mdiaUnico as RegExpMatchArray)[2])
      .toLowerCase()
      .replace(/-feiras?/g, "")
      .replace(/s\b/g, "")
      .split(/[\s,]+|\be\b/)
      .map((x) => x.trim())
      .filter(Boolean);
    const numeros = nomes.map((n) => DIAS[n]).filter((n) => n !== undefined);
    if (numeros.length) {
      const sigla = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
      recorrencia = Array.from(new Set(numeros)).sort().map((n) => sigla[n]).join(",");
      prazo = numeros.map((n) => proximoDiaSemana(hoje, n, true)).sort((a, b) => a.getTime() - b.getTime())[0];
      tira(m, "recorrencia");
    }
  }

  // ── data (só se não veio de recorrência por dia da semana)
  if (!prazo) {
    let md: RegExpMatchArray | null;
    if ((md = texto.match(/(?<![\p{L}])(depois\s+de\s+amanh[ãa])(?![\p{L}])/iu))) { prazo = comDias(hoje, 2); tira(md, "data"); }
    else if ((md = texto.match(/(?<![\p{L}])(amanh[ãa])(?![\p{L}])/iu))) { prazo = comDias(hoje, 1); tira(md, "data"); }
    else if ((md = texto.match(/\b(hoje)\b/i))) { prazo = hoje; tira(md, "data"); }
    else if ((md = texto.match(/\b(semana\s+que\s+vem|pr[óo]xima\s+semana)\b/i))) { prazo = comDias(hoje, 7); tira(md, "data"); }
    else if ((md = texto.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?\b/))) {
      const d = parseInt(md[1], 10), mIdx = parseInt(md[2], 10) - 1;
      let ano = md[3] ? parseInt(md[3], 10) : hoje.getFullYear();
      if (ano < 100) ano += 2000;
      const cand = new Date(ano, mIdx, d, 9, 0, 0, 0);
      if (!md[3] && cand < hoje) cand.setFullYear(ano + 1);
      prazo = cand; tira(md, "data");
    }
    else if ((md = texto.match(/\b(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\b/i))) {
      const d = parseInt(md[1], 10), mIdx = MESES[md[2].toLowerCase()];
      const cand = new Date(hoje.getFullYear(), mIdx, d, 9, 0, 0, 0);
      if (cand < hoje) cand.setFullYear(hoje.getFullYear() + 1);
      prazo = cand; tira(md, "data");
    }
    else if ((md = texto.match(/\b(?:no\s+)?dia\s+(\d{1,2})\b/i))) {
      const d = parseInt(md[1], 10);
      const cand = new Date(hoje.getFullYear(), hoje.getMonth(), d, 9, 0, 0, 0);
      if (cand < hoje) cand.setMonth(cand.getMonth() + 1);
      prazo = cand; tira(md, "data");
    }
    else if ((md = texto.match(/\b(?:na\s+|pr[óo]xima\s+|pr[óo]ximo\s+)?(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo|seg|ter|qua|qui|sex|s[áa]b|dom)(?:-feira)?\b/i))) {
      const n = DIAS[md[1].toLowerCase().replace("ç", "c")];
      if (n !== undefined) { prazo = proximoDiaSemana(hoje, n); tira(md, "data"); }
    }
    else if ((md = texto.match(/\b(?:em|daqui\s+a?)\s+(\d{1,2})\s+dias?\b/i))) { prazo = comDias(hoje, parseInt(md[1], 10)); tira(md, "data"); }
  }
  // Recorrência sem data explícita começa hoje
  if (recorrencia && !prazo) prazo = hoje;

  // ── horário: "às 14h", "14:30"
  const mh = texto.match(/(?:(?<![\p{L}])(?:às|as|ás)\s+)?(?<!\d)(\d{1,2})(?::(\d{2})|h(\d{2})?)(?!\d)/iu);
  if (prazo && mh && parseInt(mh[1], 10) <= 23) {
    prazo.setHours(parseInt(mh[1], 10), parseInt(mh[2] || mh[3] || "0", 10), 0, 0);
    tira(mh, "data");
  }

  const titulo = texto
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;:\-]+|[\s,;:\-]+$/g, "")
    .trim();

  return { titulo, prazo, prioridade, projetoNome, etiquetas, recorrencia, trechos };
}

/** Próxima ocorrência de uma tarefa recorrente, a partir do prazo atual. */
export function proximaOcorrencia(prazo: Date, recorrencia: string): Date {
  const d = new Date(prazo);
  if (recorrencia === "diaria") { d.setDate(d.getDate() + 1); return d; }
  if (recorrencia === "semanal") { d.setDate(d.getDate() + 7); return d; }
  if (recorrencia === "mensal") { d.setMonth(d.getMonth() + 1); return d; }
  // "seg,qua,sex": próximo dia listado depois do atual
  const sigla = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const dias = recorrencia.split(",").map((s) => sigla.indexOf(s.trim())).filter((n) => n >= 0).sort();
  if (dias.length === 0) { d.setDate(d.getDate() + 7); return d; }
  for (let i = 1; i <= 7; i++) {
    const cand = new Date(d); cand.setDate(d.getDate() + i);
    if (dias.includes(cand.getDay())) return cand;
  }
  d.setDate(d.getDate() + 7); return d;
}

export function rotuloRecorrencia(rec: string | null | undefined): string | null {
  if (!rec) return null;
  if (rec === "diaria") return "todo dia";
  if (rec === "semanal") return "toda semana";
  if (rec === "mensal") return "todo mês";
  return rec.split(",").join(", ");
}
