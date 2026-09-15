"use client";

/**
 * Tarefas — no modelo do Todoist.
 *
 * Barra lateral (Entrada, Hoje, Em breve, Filtros e Etiquetas, Meus
 * projetos), seções Atrasada/Hoje/por dia, prioridades P1–P4 no círculo,
 * adicionar rápido com linguagem natural, subtarefas, recorrência e
 * edição inline. Os vídeos do Pipeline com prazo aparecem como tarefas,
 * como já acontecia.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Inbox,
  CalendarDays,
  CalendarRange,
  Tags,
  Hash,
  Plus,
  Check,
  Search,
  ChevronDown,
  ChevronRight,
  Repeat,
  Flag,
  Trash2,
  Calendar,
  Clapperboard,
  GitBranch,
  Loader2,
  MoreHorizontal,
  CheckCircle2,
} from "lucide-react";
import { ModalEditarVideo } from "@/components/modals/modal-editar-video";
import {
  interpretarLinhaRapida,
  proximaOcorrencia,
  PRIORIDADE_PARA_P,
  P_PARA_PRIORIDADE,
  type PrioridadeApp,
} from "@/lib/tarefas-rapido";

// ── Helpers ────────────────────────────────────────────────────
function diaStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "";
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
function hojeDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function maisDias(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function rotuloData(d: Date | string, hoje: Date): { texto: string; tom: "atrasada" | "hoje" | "amanha" | "futuro" } {
  const s = diaStr(d);
  const h = diaStr(hoje);
  const a = diaStr(maisDias(hoje, 1));
  const x = new Date(d);
  if (s < h) return { texto: `${x.getDate()} ${MESES_ABREV[x.getMonth()]}`, tom: "atrasada" };
  if (s === h) return { texto: "Hoje", tom: "hoje" };
  if (s === a) return { texto: "Amanhã", tom: "amanha" };
  const diff = Math.round((x.getTime() - hoje.getTime()) / 86400000);
  if (diff < 7) return { texto: DIAS_SEMANA[x.getDay()].replace("-feira", ""), tom: "futuro" };
  return { texto: `${x.getDate()} ${MESES_ABREV[x.getMonth()]}`, tom: "futuro" };
}
function cabecalhoDia(d: Date, hoje: Date): string {
  const s = diaStr(d);
  const sufixo = s === diaStr(hoje) ? " · Hoje" : s === diaStr(maisDias(hoje, 1)) ? " · Amanhã" : "";
  return `${d.getDate()} ${MESES_ABREV[d.getMonth()]}${sufixo} · ${DIAS_SEMANA[d.getDay()]}`;
}
function temHorario(d: Date | string): boolean {
  const x = new Date(d);
  return !(x.getHours() === 0 && x.getMinutes() === 0) && !(x.getUTCHours() === 0 && x.getUTCMinutes() === 0);
}
function horaStr(d: Date | string): string {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Cores dos círculos de prioridade (Todoist: P1 vermelho, P2 laranja, P3 azul, P4 cinza)
const COR_P: Record<1 | 2 | 3 | 4, { anel: string; fundo: string; texto: string }> = {
  1: { anel: "border-red-500", fundo: "bg-red-50", texto: "text-red-500" },
  2: { anel: "border-orange-500", fundo: "bg-orange-50", texto: "text-orange-500" },
  3: { anel: "border-blue-500", fundo: "bg-blue-50", texto: "text-blue-500" },
  4: { anel: "border-gray-400", fundo: "bg-gray-50", texto: "text-gray-400" },
};

type Vista = { tipo: "entrada" } | { tipo: "hoje" } | { tipo: "embreve" } | { tipo: "projeto"; id: string } | { tipo: "etiqueta"; nome: string } | { tipo: "concluidas" };

interface Item {
  id: string;
  titulo: string;
  descricao?: string | null;
  prazo: string | null;
  prioridade: PrioridadeApp;
  status: string;
  projetoId: string | null;
  projeto?: { id: string; nome: string; cor?: string } | null;
  recorrencia?: string | null;
  parentId?: string | null;
  etiquetas: string[];
  ordem: number;
  concluido: boolean;
  ehVideo: boolean;
  subtarefas: { id: string; status: string }[];
  criadoEm?: string;
}

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [vista, setVista] = useState<Vista>({ tipo: "hoje" });
  const [busca, setBusca] = useState("");
  const [secoesFechadas, setSecoesFechadas] = useState<Set<string>>(new Set());
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  const [videoParaEditar, setVideoParaEditar] = useState<any | null>(null);
  const [menuMobile, setMenuMobile] = useState(false);

  // Adicionar rápido (qual bloco está com o formulário aberto)
  const [addAberto, setAddAberto] = useState<string | null>(null);
  const [addTexto, setAddTexto] = useState("");
  const [addDescricao, setAddDescricao] = useState("");
  const [addProjetoId, setAddProjetoId] = useState<string>("");
  const [addPrioridade, setAddPrioridade] = useState<PrioridadeApp | null>(null);
  const [addPrazo, setAddPrazo] = useState<string>("");
  const [salvandoAdd, setSalvandoAdd] = useState(false);
  const addRef = useRef<HTMLInputElement | null>(null);

  // Edição inline
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ titulo: "", descricao: "", prazo: "", prioridade: "media" as PrioridadeApp, projetoId: "", recorrencia: "", etiquetas: "" });
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  // Subtarefa sendo adicionada
  const [subDe, setSubDe] = useState<string | null>(null);
  const [subTexto, setSubTexto] = useState("");

  const hoje = hojeDate();

  // ── Carga ─────────────────────────────────────────────────────
  const carregar = async () => {
    try {
      const [t, v, p] = await Promise.all([
        fetch("/api/tarefas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/videos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/projetos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      if (Array.isArray(t)) setTarefas(t);
      if (Array.isArray(v)) setVideos(v);
      if (Array.isArray(p)) setProjetos(p);
    } finally {
      setCarregando(false);
    }
  };
  useEffect(() => {
    carregar();
    const i = setInterval(carregar, 6000);
    const onUp = () => carregar();
    window.addEventListener("dados_updated", onUp);
    window.addEventListener("focus", onUp);
    return () => {
      clearInterval(i);
      window.removeEventListener("dados_updated", onUp);
      window.removeEventListener("focus", onUp);
    };
  }, []);

  // ── Normalização: tarefas + vídeos com prazo ───────────────────
  const itens: Item[] = useMemo(() => {
    const t: Item[] = tarefas.map((x) => ({
      id: x.id,
      titulo: x.titulo,
      descricao: x.descricao,
      prazo: x.prazo,
      prioridade: (x.prioridade || "media") as PrioridadeApp,
      status: x.status,
      projetoId: x.projetoId,
      projeto: x.projeto,
      recorrencia: x.recorrencia,
      parentId: x.parentId,
      etiquetas: Array.isArray(x.etiquetas) ? x.etiquetas : [],
      ordem: x.ordem ?? 0,
      concluido: x.status === "concluida",
      ehVideo: false,
      subtarefas: Array.isArray(x.subtarefas) ? x.subtarefas : [],
      criadoEm: x.criadoEm,
    }));
    const v: Item[] = videos
      .filter((x) => x.prazoEntrega)
      .map((x) => ({
        id: x.id,
        titulo: x.titulo,
        prazo: x.prazoEntrega,
        prioridade: "alta",
        status: x.estagio,
        projetoId: x.projetoId,
        projeto: x.projeto,
        etiquetas: [],
        ordem: 0,
        concluido: x.estagio === "entregue" || x.estagio === "aprovado",
        ehVideo: true,
        subtarefas: [],
        criadoEm: x.criadoEm,
      }));
    return [...t, ...v];
  }, [tarefas, videos]);

  const raiz = (i: Item) => !i.parentId;
  const filhosDe = (id: string) => itens.filter((i) => i.parentId === id).sort((a, b) => a.ordem - b.ordem);

  // ── Contadores da barra lateral ───────────────────────────────
  const hojeS = diaStr(hoje);
  const pendentes = itens.filter((i) => !i.concluido && raiz(i));
  const contEntrada = pendentes.filter((i) => !i.projetoId && !i.ehVideo).length;
  const contHoje = pendentes.filter((i) => i.prazo && diaStr(i.prazo) <= hojeS).length;
  const contPorProjeto = (id: string) => pendentes.filter((i) => i.projetoId === id).length;
  const etiquetasTodas = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of itens) if (!i.concluido) for (const e of i.etiquetas) m.set(e, (m.get(e) || 0) + 1);
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [itens]);

  // ── Itens da vista atual ──────────────────────────────────────
  const q = busca.trim().toLowerCase();
  const naVista = (i: Item) => {
    if (q) return [i.titulo, i.descricao, i.projeto?.nome, ...i.etiquetas].some((c) => c?.toLowerCase().includes(q));
    switch (vista.tipo) {
      case "entrada": return !i.projetoId && !i.ehVideo;
      case "hoje": return !!i.prazo && diaStr(i.prazo) <= hojeS;
      case "embreve": return true;
      case "projeto": return i.projetoId === vista.id;
      case "etiqueta": return i.etiquetas.includes(vista.nome);
      case "concluidas": return true;
    }
  };
  const ordenar = (a: Item, b: Item) =>
    PRIORIDADE_PARA_P[a.prioridade] - PRIORIDADE_PARA_P[b.prioridade] ||
    (a.prazo ? new Date(a.prazo).getTime() : Infinity) - (b.prazo ? new Date(b.prazo).getTime() : Infinity) ||
    a.ordem - b.ordem;

  const abertos = itens.filter((i) => raiz(i) && !i.concluido && naVista(i)).sort(ordenar);
  const concluidos = itens.filter((i) => raiz(i) && i.concluido && naVista(i)).sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));

  // Seções (estilo Todoist): Atrasada / dias
  const atrasadas = abertos.filter((i) => i.prazo && diaStr(i.prazo) < hojeS);
  const semData = abertos.filter((i) => !i.prazo);
  const diasEmBreve = useMemo(() => {
    if (vista.tipo !== "embreve" || q) return [];
    const out: { data: Date; itens: Item[] }[] = [];
    for (let k = 0; k < 14; k++) {
      const d = maisDias(hoje, k);
      const s = diaStr(d);
      out.push({ data: d, itens: abertos.filter((i) => i.prazo && diaStr(i.prazo) === s) });
    }
    return out;
  }, [vista, q, abertos, hoje]);

  const tituloVista =
    q ? `Busca: “${busca}”`
    : vista.tipo === "entrada" ? "Entrada"
    : vista.tipo === "hoje" ? "Hoje"
    : vista.tipo === "embreve" ? "Em breve"
    : vista.tipo === "projeto" ? projetos.find((p) => p.id === vista.id)?.nome || "Projeto"
    : vista.tipo === "etiqueta" ? `@${vista.nome}`
    : "Concluídas";

  // ── Ações ─────────────────────────────────────────────────────
  const patchTarefa = async (id: string, body: any) => {
    await fetch(`/api/tarefas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  };

  const concluir = async (i: Item, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (i.ehVideo) {
      const novo = i.concluido ? "briefing" : "entregue";
      setVideos((prev) => prev.map((v) => (v.id === i.id ? { ...v, estagio: novo } : v)));
      await fetch(`/api/videos/${i.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estagio: novo }) });
    } else if (!i.concluido && i.recorrencia && i.prazo) {
      // Recorrente: em vez de concluir, pula para a próxima ocorrência (como o Todoist)
      const prox = proximaOcorrencia(new Date(i.prazo), i.recorrencia).toISOString();
      setTarefas((prev) => prev.map((t) => (t.id === i.id ? { ...t, prazo: prox } : t)));
      await patchTarefa(i.id, { prazo: prox });
    } else {
      const novo = i.concluido ? "aberta" : "concluida";
      setTarefas((prev) => prev.map((t) => (t.id === i.id ? { ...t, status: novo } : t)));
      await patchTarefa(i.id, { status: novo });
    }
    window.dispatchEvent(new Event("dados_updated"));
  };

  const excluir = async (i: Item, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm(`Apagar “${i.titulo}”?`)) return;
    if (i.ehVideo) {
      setVideos((prev) => prev.filter((v) => v.id !== i.id));
      await fetch(`/api/videos/${i.id}`, { method: "DELETE" });
    } else {
      setTarefas((prev) => prev.filter((t) => t.id !== i.id && t.parentId !== i.id));
      await fetch(`/api/tarefas/${i.id}`, { method: "DELETE" });
    }
    window.dispatchEvent(new Event("dados_updated"));
  };

  const mudarPrioridade = async (i: Item, p: 1 | 2 | 3 | 4) => {
    const prio = P_PARA_PRIORIDADE[`p${p}`];
    setTarefas((prev) => prev.map((t) => (t.id === i.id ? { ...t, prioridade: prio } : t)));
    await patchTarefa(i.id, { prioridade: prio });
  };

  const reagendarAtrasadas = async () => {
    const agora = new Date().toISOString();
    setTarefas((prev) => prev.map((t) => (atrasadas.some((a) => a.id === t.id && !a.ehVideo) ? { ...t, prazo: agora } : t)));
    setVideos((prev) => prev.map((v) => (atrasadas.some((a) => a.id === v.id && a.ehVideo) ? { ...v, prazoEntrega: agora } : v)));
    await Promise.all(
      atrasadas.map((a) =>
        a.ehVideo
          ? fetch(`/api/videos/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prazoEntrega: agora }) })
          : patchTarefa(a.id, { prazo: agora })
      )
    );
    window.dispatchEvent(new Event("dados_updated"));
  };

  const abrirAdd = (chave: string, prazoPadrao?: Date) => {
    setAddAberto(chave);
    setAddTexto("");
    setAddDescricao("");
    setAddPrioridade(null);
    setAddProjetoId(vista.tipo === "projeto" ? vista.id : "");
    setAddPrazo(prazoPadrao ? diaStr(prazoPadrao) : vista.tipo === "hoje" ? hojeS : "");
    setTimeout(() => addRef.current?.focus(), 30);
  };

  const interpretado = useMemo(() => interpretarLinhaRapida(addTexto, projetos), [addTexto, projetos]);

  const salvarAdd = async () => {
    const titulo = interpretado.titulo.trim();
    if (!titulo || salvandoAdd) return;
    setSalvandoAdd(true);
    const projetoId =
      addProjetoId ||
      (interpretado.projetoNome ? projetos.find((p) => p.nome === interpretado.projetoNome)?.id : undefined) ||
      null;
    const prazo = interpretado.prazo ? interpretado.prazo.toISOString() : addPrazo ? new Date(`${addPrazo}T09:00:00`).toISOString() : null;
    const prioridade = addPrioridade || interpretado.prioridade || "media";
    await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, descricao: addDescricao.trim() || null, projetoId, prazo, prioridade, recorrencia: interpretado.recorrencia, etiquetas: interpretado.etiquetas }),
    });
    setSalvandoAdd(false);
    setAddTexto("");
    setAddDescricao("");
    setAddPrioridade(null);
    addRef.current?.focus();
    window.dispatchEvent(new Event("dados_updated"));
    carregar();
  };

  const salvarSub = async (pai: Item) => {
    const titulo = subTexto.trim();
    if (!titulo) return;
    setSubTexto("");
    await fetch("/api/tarefas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, parentId: pai.id, projetoId: pai.projetoId, prazo: pai.prazo, prioridade: "media" }),
    });
    setExpandidas((s) => new Set(s).add(pai.id));
    carregar();
  };

  const iniciarEdicao = (i: Item) => {
    if (i.ehVideo) {
      setVideoParaEditar(videos.find((v) => v.id === i.id));
      return;
    }
    setEditandoId(i.id);
    setEdit({
      titulo: i.titulo,
      descricao: i.descricao || "",
      prazo: i.prazo ? diaStr(i.prazo) : "",
      prioridade: i.prioridade,
      projetoId: i.projetoId || "",
      recorrencia: i.recorrencia || "",
      etiquetas: i.etiquetas.join(", "),
    });
  };

  const salvarEdicao = async () => {
    if (!editandoId || salvandoEdit || !edit.titulo.trim()) return;
    setSalvandoEdit(true);
    const original = itens.find((i) => i.id === editandoId);
    const manterHora = original?.prazo && edit.prazo === diaStr(original.prazo) ? new Date(original.prazo) : null;
    const prazo = edit.prazo ? (manterHora ? manterHora.toISOString() : new Date(`${edit.prazo}T09:00:00`).toISOString()) : null;
    await patchTarefa(editandoId, {
      titulo: edit.titulo.trim(),
      descricao: edit.descricao.trim() || null,
      prazo,
      prioridade: edit.prioridade,
      projetoId: edit.projetoId || null,
      recorrencia: edit.recorrencia || null,
      etiquetas: edit.etiquetas.split(",").map((s) => s.trim().replace(/^@/, "").toLowerCase()).filter(Boolean),
    });
    setSalvandoEdit(false);
    setEditandoId(null);
    window.dispatchEvent(new Event("dados_updated"));
    carregar();
  };

  const alternarSecao = (k: string) =>
    setSecoesFechadas((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });

  // Atalhos: "q" abre adicionar, Esc fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      const digitando = ["INPUT", "TEXTAREA", "SELECT"].includes(alvo?.tagName) || alvo?.isContentEditable;
      if (e.key === "Escape") {
        setAddAberto(null);
        setEditandoId(null);
        setSubDe(null);
      } else if (!digitando && e.key.toLowerCase() === "q") {
        e.preventDefault();
        abrirAdd("topo");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista]);

  // ── Componentes ───────────────────────────────────────────────
  const Circulo = ({ i }: { i: Item }) => {
    const p = PRIORIDADE_PARA_P[i.prioridade];
    const c = COR_P[p];
    return (
      <button
        type="button"
        onClick={(e) => concluir(i, e)}
        className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
          i.concluido ? "bg-gray-400 border-gray-400 text-white" : `${c.anel} ${c.fundo} hover:opacity-80`
        }`}
        title={i.recorrencia && !i.concluido ? "Concluir esta ocorrência (pula para a próxima)" : i.concluido ? "Reabrir" : "Concluir"}
        aria-label="Concluir"
      >
        <Check className={`w-3 h-3 stroke-[3] ${i.concluido ? "" : `opacity-0 hover:opacity-100 ${c.texto}`}`} />
      </button>
    );
  };

  const MetaLinha = ({ i }: { i: Item }) => {
    const subs = filhosDe(i.id);
    const feitas = subs.filter((s) => s.concluido).length;
    const r = i.prazo ? rotuloData(i.prazo, hoje) : null;
    const corData = r?.tom === "atrasada" ? "text-red-500" : r?.tom === "hoje" ? "text-green-600" : r?.tom === "amanha" ? "text-orange-500" : "text-purple-500";
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-[11px]">
        {subs.length > 0 && (
          <button type="button" onClick={(e) => { e.stopPropagation(); setExpandidas((s) => { const n = new Set(s); if (n.has(i.id)) n.delete(i.id); else n.add(i.id); return n; }); }} className="flex items-center gap-1 text-muted hover:text-primary cursor-pointer">
            <GitBranch className="w-3 h-3" /> {feitas}/{subs.length}
          </button>
        )}
        {r && (
          <span className={`flex items-center gap-1 font-medium ${corData}`}>
            <Calendar className="w-3 h-3" />
            {r.texto}
            {temHorario(i.prazo!) && <span className="opacity-80">{horaStr(i.prazo!)}</span>}
            {i.recorrencia && <Repeat className="w-3 h-3" />}
          </span>
        )}
        {i.etiquetas.map((e) => (
          <button key={e} type="button" onClick={(ev) => { ev.stopPropagation(); setVista({ tipo: "etiqueta", nome: e }); }} className="text-muted hover:text-accent cursor-pointer">
            @{e}
          </button>
        ))}
        {i.ehVideo && (
          <span className="flex items-center gap-1 text-muted"><Clapperboard className="w-3 h-3" /> vídeo</span>
        )}
      </div>
    );
  };

  const Linha = ({ i, nivel = 0 }: { i: Item; nivel?: number }) => {
    const subs = filhosDe(i.id);
    const expandida = expandidas.has(i.id);
    if (editandoId === i.id) return <EditorInline i={i} />;
    return (
      <div style={{ paddingLeft: nivel * 28 }}>
        <div
          onClick={() => iniciarEdicao(i)}
          className="group flex items-start gap-3 py-2.5 border-b border-border cursor-pointer hover:bg-surface/60 -mx-2 px-2 rounded-lg transition-colors"
        >
          <Circulo i={i} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm leading-snug ${i.concluido ? "line-through text-muted" : "text-primary"}`}>{i.titulo}</p>
            {i.descricao && <p className="text-xs text-muted truncate mt-0.5">{i.descricao}</p>}
            <MetaLinha i={i} />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Projeto à direita, como no Todoist */}
            <span className="text-[11px] text-muted flex items-center gap-1 group-hover:hidden">
              {i.projeto ? (
                <>
                  {i.projeto.nome} <span className="w-2 h-2 rounded-full" style={{ background: i.projeto.cor || "var(--accent)" }} />
                </>
              ) : (
                <>Entrada <Inbox className="w-3 h-3" /></>
              )}
            </span>
            {/* Toolbar no hover */}
            <div className="hidden group-hover:flex items-center gap-0.5">
              {!i.ehVideo && (
                <>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSubDe(i.id); setSubTexto(""); setExpandidas((s) => new Set(s).add(i.id)); }} className="p-1 rounded text-muted hover:text-primary hover:bg-surface cursor-pointer" title="Adicionar subtarefa">
                    <GitBranch className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center rounded-md border border-border overflow-hidden" title="Prioridade">
                    {([1, 2, 3, 4] as const).map((p) => (
                      <button key={p} type="button" onClick={(e) => { e.stopPropagation(); mudarPrioridade(i, p); }} className={`px-1 py-0.5 hover:bg-surface cursor-pointer ${PRIORIDADE_PARA_P[i.prioridade] === p ? "bg-surface" : ""}`}>
                        <Flag className={`w-3 h-3 ${COR_P[p].texto}`} fill={PRIORIDADE_PARA_P[i.prioridade] === p ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button type="button" onClick={(e) => excluir(i, e)} className="p-1 rounded text-muted hover:text-danger hover:bg-danger-subtle cursor-pointer" title="Apagar">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {expandida && subs.map((s) => <Linha key={s.id} i={s} nivel={nivel + 1} />)}

        {subDe === i.id && (
          <div style={{ paddingLeft: (nivel + 1) * 28 }} className="py-2 flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-muted" />
            <input
              type="text"
              value={subTexto}
              onChange={(e) => setSubTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") salvarSub(i); if (e.key === "Escape") setSubDe(null); }}
              placeholder="Subtarefa… Enter salva, Esc cancela"
              className="input py-1.5 px-3 text-sm flex-1"
              autoFocus
            />
          </div>
        )}
      </div>
    );
  };

  const EditorInline = ({ i }: { i: Item }) => (
    <div className="my-2 rounded-xl border border-accent bg-card p-3 shadow-sm space-y-2">
      <input
        type="text"
        value={edit.titulo}
        onChange={(e) => setEdit({ ...edit, titulo: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") salvarEdicao(); if (e.key === "Escape") setEditandoId(null); }}
        className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-primary"
        autoFocus
      />
      <input
        type="text"
        value={edit.descricao}
        onChange={(e) => setEdit({ ...edit, descricao: e.target.value })}
        placeholder="Descrição"
        className="w-full bg-transparent border-0 outline-none text-xs text-secondary"
      />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input type="date" value={edit.prazo} onChange={(e) => setEdit({ ...edit, prazo: e.target.value })} className="input py-1.5 px-2 text-xs w-auto" />
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          {([1, 2, 3, 4] as const).map((p) => (
            <button key={p} type="button" onClick={() => setEdit({ ...edit, prioridade: P_PARA_PRIORIDADE[`p${p}`] })} className={`px-2 py-1.5 text-xs flex items-center gap-1 cursor-pointer ${PRIORIDADE_PARA_P[edit.prioridade] === p ? "bg-surface font-semibold" : "hover:bg-surface"}`}>
              <Flag className={`w-3 h-3 ${COR_P[p].texto}`} fill={PRIORIDADE_PARA_P[edit.prioridade] === p ? "currentColor" : "none"} /> P{p}
            </button>
          ))}
        </div>
        <select value={edit.projetoId} onChange={(e) => setEdit({ ...edit, projetoId: e.target.value })} className="input py-1.5 px-2 text-xs w-auto">
          <option value="">Entrada</option>
          {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={edit.recorrencia} onChange={(e) => setEdit({ ...edit, recorrencia: e.target.value })} className="input py-1.5 px-2 text-xs w-auto">
          <option value="">Não repete</option>
          <option value="diaria">Todo dia</option>
          <option value="semanal">Toda semana</option>
          <option value="mensal">Todo mês</option>
          <option value="seg,qua,sex">Seg, qua, sex</option>
          <option value="seg,ter,qua,qui,sex">Dias úteis</option>
        </select>
        <input type="text" value={edit.etiquetas} onChange={(e) => setEdit({ ...edit, etiquetas: e.target.value })} placeholder="@etiquetas, separadas por vírgula" className="input py-1.5 px-2 text-xs flex-1 min-w-[160px]" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={() => setEditandoId(null)} className="btn-ghost text-xs py-1.5 px-3">Cancelar</button>
        <button type="button" onClick={salvarEdicao} disabled={salvandoEdit} className="btn-primary text-xs py-1.5 px-4 disabled:opacity-60">{salvandoEdit ? "Salvando…" : "Salvar"}</button>
      </div>
    </div>
  );

  const AdicionarRapido = ({ chave, prazoPadrao }: { chave: string; prazoPadrao?: Date }) =>
    addAberto === chave ? (
      <div className="my-2 rounded-xl border border-accent bg-card p-3 shadow-sm">
        <input
          ref={addRef}
          type="text"
          value={addTexto}
          onChange={(e) => setAddTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") salvarAdd(); }}
          placeholder="Nome da tarefa — ex.: Ligar pro cliente amanhã p1 #Petron @urgente"
          className="w-full bg-transparent border-0 outline-none text-sm font-medium text-primary placeholder:text-faint"
        />
        <input
          type="text"
          value={addDescricao}
          onChange={(e) => setAddDescricao(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") salvarAdd(); }}
          placeholder="Descrição"
          className="w-full bg-transparent border-0 outline-none text-xs text-secondary placeholder:text-faint mt-1"
        />
        {/* O que o app entendeu do texto */}
        {interpretado.trechos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {interpretado.trechos.map((t, k) => (
              <span key={k} className="badge badge-accent-subtle">{t.tipo === "data" ? "📅 " : t.tipo === "prioridade" ? "🚩 " : t.tipo === "projeto" ? "# " : t.tipo === "etiqueta" ? "@ " : "🔁 "}{t.texto}</span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
          <input type="date" value={interpretado.prazo ? diaStr(interpretado.prazo) : addPrazo} onChange={(e) => setAddPrazo(e.target.value)} className="input py-1.5 px-2 text-xs w-auto" title="Data" />
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            {([1, 2, 3, 4] as const).map((p) => {
              const ativa = (addPrioridade || interpretado.prioridade || "media") === P_PARA_PRIORIDADE[`p${p}`];
              return (
                <button key={p} type="button" onClick={() => setAddPrioridade(P_PARA_PRIORIDADE[`p${p}`])} className={`px-2 py-1.5 text-xs flex items-center gap-1 cursor-pointer ${ativa ? "bg-surface font-semibold" : "hover:bg-surface"}`} title={`Prioridade ${p}`}>
                  <Flag className={`w-3 h-3 ${COR_P[p].texto}`} fill={ativa ? "currentColor" : "none"} /> P{p}
                </button>
              );
            })}
          </div>
          <select value={addProjetoId || (interpretado.projetoNome ? projetos.find((p) => p.nome === interpretado.projetoNome)?.id || "" : "")} onChange={(e) => setAddProjetoId(e.target.value)} className="input py-1.5 px-2 text-xs w-auto">
            <option value="">Entrada</option>
            {projetos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => setAddAberto(null)} className="btn-ghost text-xs py-1.5 px-3">Cancelar</button>
            <button type="button" onClick={salvarAdd} disabled={!interpretado.titulo.trim() || salvandoAdd} className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50 flex items-center gap-1">
              {salvandoAdd ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Adicionar tarefa
            </button>
          </div>
        </div>
      </div>
    ) : (
      <button type="button" onClick={() => abrirAdd(chave, prazoPadrao)} className="group flex items-center gap-2 py-2.5 text-sm text-muted hover:text-red-500 cursor-pointer">
        <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center bg-transparent group-hover:bg-red-500 transition-colors">
          <Plus className="w-4 h-4 text-red-500 group-hover:text-white" />
        </span>
        Adicionar tarefa
      </button>
    );

  const Secao = ({ chave, titulo, itens: lista, acao, children }: { chave: string; titulo: ReactNode; itens: Item[]; acao?: ReactNode; children?: ReactNode }) => {
    const fechada = secoesFechadas.has(chave);
    return (
      <section>
        <div className="flex items-center justify-between py-2 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-[1]">
          <button type="button" onClick={() => alternarSecao(chave)} className="flex items-center gap-1.5 font-semibold text-sm text-primary cursor-pointer">
            {fechada ? <ChevronRight className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
            {titulo}
            <span className="text-xs font-normal text-muted ml-1">{lista.length > 0 ? lista.length : ""}</span>
          </button>
          {acao}
        </div>
        {!fechada && (
          <div>
            {lista.map((i) => <Linha key={i.id} i={i} />)}
            {children}
          </div>
        )}
      </section>
    );
  };

  // ── Barra lateral ─────────────────────────────────────────────
  const ItemNav = ({ ativo, onClick, icone, rotulo, cont, cor }: { ativo: boolean; onClick: () => void; icone: ReactNode; rotulo: string; cont?: number; cor?: string }) => (
    <button
      type="button"
      onClick={() => { onClick(); setMenuMobile(false); setBusca(""); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${ativo ? "bg-red-50 text-red-600 font-semibold" : "text-secondary hover:bg-surface"}`}
    >
      <span className={ativo ? "text-red-500" : cor ? "" : "text-muted"} style={cor && !ativo ? { color: cor } : undefined}>{icone}</span>
      <span className="flex-1 text-left truncate">{rotulo}</span>
      {cont !== undefined && cont > 0 && <span className={`text-xs ${ativo ? "text-red-500" : "text-muted"}`}>{cont}</span>}
    </button>
  );

  const Lateral = () => (
    <aside className="w-full lg:w-[240px] flex-shrink-0 space-y-1">
      <button type="button" onClick={() => abrirAdd("topo")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 cursor-pointer">
        <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"><Plus className="w-3.5 h-3.5 stroke-[3]" /></span>
        Adicionar tarefa
        <span className="ml-auto text-[10px] font-mono text-muted border border-border rounded px-1">q</span>
      </button>
      <div className="relative px-1 pb-1">
        <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className="input pl-9 py-2 text-sm w-full" />
      </div>
      <ItemNav ativo={vista.tipo === "entrada" && !q} onClick={() => setVista({ tipo: "entrada" })} icone={<Inbox className="w-4 h-4" />} rotulo="Entrada" cont={contEntrada} />
      <ItemNav ativo={vista.tipo === "hoje" && !q} onClick={() => setVista({ tipo: "hoje" })} icone={<CalendarDays className="w-4 h-4" />} rotulo="Hoje" cont={contHoje} />
      <ItemNav ativo={vista.tipo === "embreve" && !q} onClick={() => setVista({ tipo: "embreve" })} icone={<CalendarRange className="w-4 h-4" />} rotulo="Em breve" />
      <ItemNav ativo={vista.tipo === "concluidas" && !q} onClick={() => setVista({ tipo: "concluidas" })} icone={<CheckCircle2 className="w-4 h-4" />} rotulo="Concluídas" />

      <div className="pt-4 pb-1 px-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">Meus projetos</span>
      </div>
      {projetos.map((p) => (
        <ItemNav key={p.id} ativo={vista.tipo === "projeto" && vista.id === p.id && !q} onClick={() => setVista({ tipo: "projeto", id: p.id })} icone={<Hash className="w-4 h-4" />} rotulo={p.nome} cont={contPorProjeto(p.id)} cor={p.cor} />
      ))}
      {projetos.length === 0 && <p className="px-3 py-1 text-xs text-muted">Crie clientes em Configurações.</p>}

      {etiquetasTodas.length > 0 && (
        <>
          <div className="pt-4 pb-1 px-3 flex items-center gap-1.5">
            <Tags className="w-3.5 h-3.5 text-muted" />
            <span className="text-xs font-semibold text-muted">Etiquetas</span>
          </div>
          {etiquetasTodas.map(([nome, n]) => (
            <ItemNav key={nome} ativo={vista.tipo === "etiqueta" && vista.nome === nome && !q} onClick={() => setVista({ tipo: "etiqueta", nome })} icone={<span className="text-xs font-mono">@</span>} rotulo={nome} cont={n} />
          ))}
        </>
      )}
    </aside>
  );

  // ── Render ────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const listaSimples = vista.tipo !== "embreve" || !!q;
  const semAtraso = abertos.filter((i) => !atrasadas.includes(i));
  const totalVista = abertos.length;

  return (
    <div className="animate-fade-in-up max-w-6xl mx-auto pb-16">
      {/* Menu lateral no celular */}
      <div className="lg:hidden mb-3">
        <button type="button" onClick={() => setMenuMobile((v) => !v)} className="btn-neutral text-xs py-2 px-3 flex items-center gap-1.5">
          <MoreHorizontal className="w-4 h-4" /> {tituloVista}
        </button>
        {menuMobile && <div className="card p-3 mt-2"><Lateral /></div>}
      </div>

      <div className="flex gap-8">
        <div className="hidden lg:block"><Lateral /></div>

        <main className="flex-1 min-w-0">
          <div className="mb-4">
            <h1 className="font-heading text-2xl font-semibold text-primary">{tituloVista}</h1>
            <p className="text-xs text-muted mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {vista.tipo === "concluidas" ? `${concluidos.length} concluídas` : `${totalVista} ${totalVista === 1 ? "tarefa" : "tarefas"}`}
            </p>
          </div>

          <AdicionarRapido chave="topo" />

          {vista.tipo === "concluidas" ? (
            <div>
              {concluidos.length === 0 && <p className="text-sm text-muted py-8 text-center">Nada concluído ainda.</p>}
              {concluidos.map((i) => <Linha key={i.id} i={i} />)}
            </div>
          ) : listaSimples ? (
            <div className="space-y-6">
              {atrasadas.length > 0 && (
                <Secao
                  chave="atrasada"
                  titulo="Atrasada"
                  itens={atrasadas}
                  acao={<button type="button" onClick={reagendarAtrasadas} className="text-xs font-semibold text-red-500 hover:underline cursor-pointer">Reagendar</button>}
                />
              )}
              <Secao
                chave="principal"
                titulo={vista.tipo === "hoje" ? cabecalhoDia(hoje, hoje) : vista.tipo === "entrada" ? "Entrada" : q ? "Resultados" : tituloVista}
                itens={vista.tipo === "hoje" ? semAtraso : semAtraso.filter((i) => i.prazo || vista.tipo !== "embreve")}
              >
                {!q && <AdicionarRapido chave="principal" prazoPadrao={vista.tipo === "hoje" ? hoje : undefined} />}
              </Secao>
              {vista.tipo !== "hoje" && vista.tipo !== "entrada" && semData.length > 0 && !q && (
                <Secao chave="semdata" titulo="Sem data" itens={semData} />
              )}
              {abertos.length === 0 && !q && (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-2" />
                  <p className="text-sm font-semibold text-primary">Tudo em dia!</p>
                  <p className="text-xs text-muted">Nenhuma tarefa {vista.tipo === "hoje" ? "para hoje" : "aqui"}.</p>
                </div>
              )}
              {concluidos.length > 0 && (
                <div>
                  <button type="button" onClick={() => setMostrarConcluidas((v) => !v)} className="text-xs text-muted hover:text-primary cursor-pointer flex items-center gap-1">
                    {mostrarConcluidas ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} {concluidos.length} concluída{concluidos.length > 1 ? "s" : ""}
                  </button>
                  {mostrarConcluidas && concluidos.map((i) => <Linha key={i.id} i={i} />)}
                </div>
              )}
            </div>
          ) : (
            /* Em breve: Atrasada + um bloco por dia, 14 dias */
            <div className="space-y-6">
              {atrasadas.length > 0 && (
                <Secao chave="atrasada" titulo="Atrasada" itens={atrasadas} acao={<button type="button" onClick={reagendarAtrasadas} className="text-xs font-semibold text-red-500 hover:underline cursor-pointer">Reagendar</button>} />
              )}
              {diasEmBreve.map(({ data, itens: lista }) => (
                <Secao key={diaStr(data)} chave={`dia-${diaStr(data)}`} titulo={cabecalhoDia(data, hoje)} itens={lista}>
                  <AdicionarRapido chave={`dia-${diaStr(data)}`} prazoPadrao={data} />
                </Secao>
              ))}
              {semData.length > 0 && <Secao chave="semdata" titulo="Sem data" itens={semData} />}
            </div>
          )}
        </main>
      </div>

      {videoParaEditar && (
        <ModalEditarVideo
          isOpen={!!videoParaEditar}
          video={videoParaEditar}
          onClose={() => setVideoParaEditar(null)}
          onSaved={() => { carregar(); window.dispatchEvent(new Event("dados_updated")); }}
        />
      )}
    </div>
  );
}
