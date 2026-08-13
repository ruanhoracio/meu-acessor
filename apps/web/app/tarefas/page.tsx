"use client";

import { useState, useEffect } from "react";
import {
  Circle,
  CheckCircle2,
  Calendar,
  Filter,
  Loader2,
  Trash2,
  RefreshCw,
  Edit3,
  Plus,
  Clapperboard,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Clock,
  MessageSquare,
  Check,
  AlertCircle,
} from "lucide-react";
import { ModalEditarTarefa } from "@/components/modals/modal-editar-tarefa";
import { ModalEditarVideo } from "@/components/modals/modal-editar-video";
import { ModalNovo } from "@/components/modals/modal-novo";

const DIAS_SEMANA_SIGLAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DIAS_SEMANA_NOMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
const MESES_ABREV = [
  "jan.", "fev.", "mar.", "abr.", "mai.", "jun.",
  "jul.", "ago.", "set.", "out.", "nov.", "dez."
];
const MESES_COMPLETOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function getDiaString(dateInput: Date | string | null): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }

  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    return d.toISOString().split("T")[0];
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatarHeaderDiaTodoist(dataObj: Date, hojeObj: Date): string {
  const diaNum = dataObj.getDate();
  const mesStr = MESES_ABREV[dataObj.getMonth()];
  const diaSemanaStr = DIAS_SEMANA_NOMES[dataObj.getDay()];

  const dtStr = getDiaString(dataObj);
  const hojeStr = getDiaString(hojeObj);

  const amanhãObj = new Date(hojeObj);
  amanhãObj.setDate(hojeObj.getDate() + 1);
  const amanhãStr = getDiaString(amanhãObj);

  if (dtStr === hojeStr) {
    return `${diaNum} ${mesStr} · Hoje · ${diaSemanaStr}`;
  } else if (dtStr === amanhãStr) {
    return `${diaNum} ${mesStr} · Amanhã · ${diaSemanaStr}`;
  } else {
    return `${diaNum} ${mesStr} · ${diaSemanaStr}`;
  }
}

export default function TarefasTodoistPage() {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProjeto, setFiltroProjeto] = useState<string | null>(null);

  // Modo de Exibição: "todoist" (Lista Em Breve estilo Todoist) ou "kanban" (Quadro de Colunas)
  const [modoExibicao, setModoExibicao] = useState<"todoist" | "kanban">("todoist");

  // Modais
  const [tarefaParaEditar, setTarefaParaEditar] = useState<any | null>(null);
  const [videoParaEditar, setVideoParaEditar] = useState<any | null>(null);
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [dataNovaTarefaPrePreenchida, setDataNovaTarefaPrePreenchida] = useState<string | null>(null);

  // Data selecionada na barra superior do calendário Todoist
  const [dataSelecionadaBarra, setDataSelecionadaBarra] = useState(new Date());

  const carregarDados = async () => {
    try {
      const [resT, resV, resP] = await Promise.all([
        fetch("/api/tarefas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/videos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/projetos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);

      if (Array.isArray(resT)) setTarefas(resT);
      if (Array.isArray(resV)) setVideos(resV);
      if (Array.isArray(resP)) setProjetos(resP);
    } catch (e) {
      console.error("Erro ao carregar tarefas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 4000);
    const onFocus = () => carregarDados();
    const onDadosUpdated = () => carregarDados();

    window.addEventListener("focus", onFocus);
    window.addEventListener("dados_updated", onDadosUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("dados_updated", onDadosUpdated);
    };
  }, []);

  const handleToggleStatus = async (id: string, statusAtual: string, isVideo: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (isVideo) {
      const novoEstagio = statusAtual === "entregue" ? "briefing" : "entregue";
      setVideos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, estagio: novoEstagio } : v))
      );
      await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estagio: novoEstagio }),
      });
    } else {
      const novoStatus = statusAtual === "concluida" ? "aberta" : "concluida";
      setTarefas((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: novoStatus } : t))
      );
      await fetch(`/api/tarefas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
    }
    window.dispatchEvent(new Event("dados_updated"));
    carregarDados();
  };

  const handleExcluir = async (id: string, isVideo: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Deseja apagar este ${isVideo ? "vídeo" : "tarefa"}?`)) {
      if (isVideo) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
        await fetch(`/api/videos/${id}`, { method: "DELETE" });
      } else {
        setTarefas((prev) => prev.filter((t) => t.id !== id));
        await fetch(`/api/tarefas/${id}`, { method: "DELETE" });
      }
      window.dispatchEvent(new Event("dados_updated"));
      carregarDados();
    }
  };

  const handleReagendarAtrasadas = async () => {
    const hojeStr = getDiaString(new Date());
    const atrasadas = tarefas.filter((t) => t.status !== "concluida" && t.prazo && getDiaString(t.prazo) < hojeStr);

    for (const t of atrasadas) {
      await fetch(`/api/tarefas/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prazo: new Date().toISOString() }),
      });
    }
    carregarDados();
  };

  // Normalização unificada de tarefas + vídeos
  const todosItens: any[] = [
    ...tarefas.map((t) => ({
      ...t,
      tipoItem: "tarefa",
      dataPrazo: t.prazo,
      isConcluido: t.status === "concluida",
    })),
    ...videos.map((v) => ({
      ...v,
      tipoItem: "video",
      dataPrazo: v.prazoEntrega,
      isConcluido: v.estagio === "entregue" || v.estagio === "aprovado",
      prioridade: "alta",
    })),
  ];

  const itensFiltrados = todosItens.filter((t) => {
    if (filtroProjeto && t.projetoId !== filtroProjeto) return false;
    return true;
  });

  const hojeObj = new Date();
  const hojeStr = getDiaString(hojeObj);

  // Atrasadas (prazo < hojeStr)
  const itensAtrasados = itensFiltrados.filter(
    (t) => !t.isConcluido && t.dataPrazo && getDiaString(t.dataPrazo) < hojeStr
  );

  // Gerar os próximos 14 dias para o Feed Estilo Todoist
  const diasFeed: { dataObj: Date; dtStr: string; label: string; itens: any[] }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(hojeObj);
    d.setDate(hojeObj.getDate() + i);
    const dtStr = getDiaString(d);

    const itensDia = itensFiltrados.filter((t) => {
      if (t.isConcluido) return false;
      if (i === 0 && !t.dataPrazo) return true; // Itens sem prazo ficam na seção Hoje por padrão
      return getDiaString(t.dataPrazo) === dtStr;
    });

    diasFeed.push({
      dataObj: d,
      dtStr,
      label: formatarHeaderDiaTodoist(d, hojeObj),
      itens: itensDia,
    });
  }

  // Itens concluídos
  const itensConcluidos = itensFiltrados.filter((t) => t.isConcluido);

  // Barra de Dias Superior do Todoist (Semana de 7 dias)
  const inicioSemana = new Date(dataSelecionadaBarra);
  const diaSemanaIdx = inicioSemana.getDay();
  inicioSemana.setDate(inicioSemana.getDate() - diaSemanaIdx);

  const diasBarraSuperior: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate() + i);
    diasBarraSuperior.push(d);
  }

  const abrirModalComData = (dtStr: string) => {
    setDataNovaTarefaPrePreenchida(dtStr);
    setModalNovoOpen(true);
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Modais */}
      <ModalEditarTarefa
        isOpen={!!tarefaParaEditar}
        tarefa={tarefaParaEditar}
        onClose={() => setTarefaParaEditar(null)}
        onSaved={() => { window.dispatchEvent(new Event("dados_updated")); carregarDados(); }}
      />

      <ModalEditarVideo
        isOpen={!!videoParaEditar}
        video={videoParaEditar}
        onClose={() => setVideoParaEditar(null)}
        onSaved={() => { window.dispatchEvent(new Event("dados_updated")); carregarDados(); }}
        onDeleted={() => { window.dispatchEvent(new Event("dados_updated")); carregarDados(); }}
      />

      <ModalNovo
        isOpen={modalNovoOpen}
        onClose={() => { setModalNovoOpen(false); setDataNovaTarefaPrePreenchida(null); }}
      />

      {/* ── Topo do Todoist: Título & Botões de Alternância ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-light tracking-tight text-primary flex items-center gap-2">
            Tarefas & Checklists
          </h1>
          <p className="text-xs font-mono text-muted mt-0.5">
            Organização cronológica inteligente estilo Todoist "Em Breve".
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Modo: Todoist vs Kanban */}
          <div className="flex items-center bg-card p-1 rounded-lg border border-dashed border-border shadow-2xs">
            <button
              onClick={() => setModoExibicao("todoist")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                modoExibicao === "todoist"
                  ? "bg-[#c6f91f] text-black shadow-xs"
                  : "text-muted hover:text-primary"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista (Todoist)</span>
            </button>

            <button
              onClick={() => setModoExibicao("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded transition-all cursor-pointer ${
                modoExibicao === "kanban"
                  ? "bg-[#c6f91f] text-black shadow-xs"
                  : "text-muted hover:text-primary"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => abrirModalComData(hojeStr)}
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Tarefa</span>
          </button>
        </div>
      </div>

      {/* ── Filtro de Clientes / Projetos ───────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        <span className="text-xs font-bold text-muted flex items-center gap-1 flex-shrink-0">
          <Filter className="w-3.5 h-3.5" />
          Projetos:
        </span>
        <button
          onClick={() => setFiltroProjeto(null)}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition-all flex-shrink-0 ${
            filtroProjeto === null
              ? "bg-primary text-inverse font-bold"
              : "bg-surface text-secondary hover:bg-surface-hover"
          }`}
        >
          Todos
        </button>
        {projetos.map((p) => (
          <button
            key={p.id}
            onClick={() => setFiltroProjeto(filtroProjeto === p.id ? null : p.id)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all flex-shrink-0 border flex items-center gap-1.5"
            style={{
              borderColor: p.cor || "#ff5a3d",
              background: filtroProjeto === p.id ? p.cor || "#ff5a3d" : "transparent",
              color: filtroProjeto === p.id ? "#ffffff" : "var(--text-primary)",
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: filtroProjeto === p.id ? "#ffffff" : p.cor }} />
            {p.nome}
          </button>
        ))}
      </div>

      {modoExibicao === "todoist" ? (
        /* ═════════════════════════════════════════════════════════════════════
           MODELO TODOIST (EM BREVE / UPCOMING LIST VIEW)
           ═════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* ── Barra Superior de Calendário Todoist (Mês & Dias) ─────────────── */}
          <div className="card p-4 bg-card border border-border shadow-sm rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-heading text-sm font-bold text-primary">
                {MESES_ABREV[dataSelecionadaBarra.getMonth()]} de {dataSelecionadaBarra.getFullYear()} ›
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const d = new Date(dataSelecionadaBarra);
                    d.setDate(d.getDate() - 7);
                    setDataSelecionadaBarra(d);
                  }}
                  className="p-1 rounded-lg hover:bg-surface-hover text-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDataSelecionadaBarra(new Date())}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-border hover:bg-surface-hover text-secondary"
                >
                  Hoje
                </button>
                <button
                  onClick={() => {
                    const d = new Date(dataSelecionadaBarra);
                    d.setDate(d.getDate() + 7);
                    setDataSelecionadaBarra(d);
                  }}
                  className="p-1 rounded-lg hover:bg-surface-hover text-secondary"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid dos 7 dias da semana */}
            <div className="grid grid-cols-7 text-center gap-1">
              {diasBarraSuperior.map((d, i) => {
                const ehHoje = getDiaString(d) === hojeStr;
                const ehSelecionado = getDiaString(d) === getDiaString(dataSelecionadaBarra);

                return (
                  <button
                    key={i}
                    onClick={() => setDataSelecionadaBarra(d)}
                    className="flex flex-col items-center py-1.5 rounded-xl transition-all cursor-pointer hover:bg-surface-hover"
                  >
                    <span className="text-[11px] font-bold text-muted uppercase">
                      {DIAS_SEMANA_SIGLAS[d.getDay()]}
                    </span>
                    <span
                      className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full mt-1 ${
                        ehHoje
                          ? "bg-accent text-white shadow-xs"
                          : ehSelecionado
                          ? "border-2 border-primary text-primary"
                          : "text-secondary"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 1. SEÇÃO DE TAREFAS ATRASADAS (Red Alert Header) ──────────────── */}
          {itensAtrasados.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-danger/30">
                <h3 className="font-heading text-sm font-bold text-danger flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-danger" />
                  Atrasada
                </h3>
                <button
                  onClick={handleReagendarAtrasadas}
                  className="text-xs font-bold text-danger hover:text-danger hover:underline cursor-pointer"
                >
                  Reagendar para Hoje ➔
                </button>
              </div>

              <div className="space-y-1">
                {itensAtrasados.map((item) => (
                  <RenderItemTodoist
                    key={item.id}
                    item={item}
                    onToggle={handleToggleStatus}
                    onEditar={() => (item.tipoItem === "video" ? setVideoParaEditar(item) : setTarefaParaEditar(item))}
                    onExcluir={handleExcluir}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── 2. FEED CRONOLÓGICO DOS DIAS ESTILO TODOIST ─────────────────────── */}
          {diasFeed.map((dia) => (
            <div key={dia.dtStr} className="space-y-2 pt-2">
              {/* Header do Dia Todoist: "10 ago. · Hoje · Segunda-feira" */}
              <div className="pb-1.5 border-b border-border flex items-center justify-between">
                <h3 className="font-heading text-sm font-bold text-primary tracking-tight">
                  {dia.label}
                </h3>
                {dia.itens.length > 0 && (
                  <span className="text-xs font-semibold text-muted">
                    {dia.itens.length} {dia.itens.length === 1 ? "tarefa" : "tarefas"}
                  </span>
                )}
              </div>

              {/* Lista de Tarefas do Dia */}
              {dia.itens.length > 0 ? (
                <div className="space-y-1">
                  {dia.itens.map((item) => (
                    <RenderItemTodoist
                      key={item.id}
                      item={item}
                      onToggle={handleToggleStatus}
                      onEditar={() => (item.tipoItem === "video" ? setVideoParaEditar(item) : setTarefaParaEditar(item))}
                      onExcluir={handleExcluir}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted italic py-1 pl-2">Nenhuma tarefa agendada.</p>
              )}

              {/* Botão Inline Todoist: "+ Adicionar tarefa" */}
              <button
                onClick={() => abrirModalComData(dia.dtStr)}
                className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-accent dark:hover:text-accent py-1.5 px-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer w-full text-left group"
              >
                <Plus className="w-4 h-4 text-accent transition-transform group-hover:scale-110" />
                <span>Adicionar tarefa</span>
              </button>
            </div>
          ))}

          {/* ── 3. SEÇÃO DE CONCLUÍDAS ──────────────────────────────────────── */}
          {itensConcluidos.length > 0 && (
            <div className="pt-6 border-t border-border space-y-2">
              <h3 className="font-heading text-xs font-bold text-muted uppercase tracking-wider">
                Concluídas ({itensConcluidos.length})
              </h3>
              <div className="space-y-1">
                {itensConcluidos.map((item) => (
                  <RenderItemTodoist
                    key={item.id}
                    item={item}
                    onToggle={handleToggleStatus}
                    onEditar={() => (item.tipoItem === "video" ? setVideoParaEditar(item) : setTarefaParaEditar(item))}
                    onExcluir={handleExcluir}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════════════════
           MODELO KANBAN (QUADRO EM COLUNAS)
           ═════════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              key: "hoje",
              titulo: "📌 HOJE",
              cor: "#ff5a3d",
              itens: itensFiltrados.filter((t) => !t.isConcluido && (!t.dataPrazo || getDiaString(t.dataPrazo) <= hojeStr)),
            },
            {
              key: "amanha",
              titulo: "⚡ AMANHÃ",
              cor: "#f59e0b",
              itens: itensFiltrados.filter((t) => !t.isConcluido && t.dataPrazo && getDiaString(t.dataPrazo) === getDiaString(new Date(Date.now() + 86400000))),
            },
            {
              key: "proximos",
              titulo: "📅 PRÓXIMOS DIAS",
              cor: "#3b82f6",
              itens: itensFiltrados.filter((t) => !t.isConcluido && t.dataPrazo && getDiaString(t.dataPrazo) > getDiaString(new Date(Date.now() + 86400000))),
            },
            {
              key: "concluidas",
              titulo: "✅ CONCLUÍDAS",
              cor: "#10b981",
              itens: itensConcluidos,
            },
          ].map((col) => (
            <div key={col.key} className="flex flex-col bg-surface p-3.5 rounded-2xl border border-border min-h-[350px]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border px-1">
                <h3 className="text-xs font-bold tracking-wider" style={{ color: col.cor }}>
                  {col.titulo}
                </h3>
                <span className="w-5 h-5 rounded-full bg-surface-hover flex items-center justify-center text-[10px] font-bold text-secondary">
                  {col.itens.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {col.itens.map((item) => (
                  <RenderItemTodoist
                    key={item.id}
                    item={item}
                    onToggle={handleToggleStatus}
                    onEditar={() => (item.tipoItem === "video" ? setVideoParaEditar(item) : setTarefaParaEditar(item))}
                    onExcluir={handleExcluir}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE DE ITEM INDIVIDUAL ESTILO TODOIST ──────────────────────────────
function RenderItemTodoist({
  item,
  onToggle,
  onEditar,
  onExcluir,
}: {
  item: any;
  onToggle: (id: string, status: string, isVideo: boolean, e?: React.MouseEvent) => void;
  onEditar: () => void;
  onExcluir: (id: string, isVideo: boolean, e: React.MouseEvent) => void;
}) {
  const isVideo = item.tipoItem === "video";
  const concluido = item.isConcluido;
  const prio = item.prioridade || "media";

  // Cores dos Anéis dos Checkboxes estilo Todoist por prioridade
  const corCheckRing =
    prio === "urgente"
      ? "border-danger text-danger hover:bg-danger-subtle"
      : prio === "alta"
      ? "border-amber-500 text-amber-500 hover:bg-amber-50"
      : "border-blue-400 text-blue-400 hover:bg-blue-50";

  return (
    <div
      onClick={onEditar}
      className={`card group flex items-center justify-between gap-3 p-3 transition-all cursor-pointer rounded-2xl ${
        concluido
          ? "opacity-50 bg-surface border-border"
          : "bg-card border-border hover:border-accent"
      }`}
    >
      {/* Esquerda: Checkbox Redondo Emerald + Título */}
      <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10">
        <button
          type="button"
          onClick={(e) => onToggle(item.id, isVideo ? item.estagio : item.status, isVideo, e)}
          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 border ${
            concluido
              ? "border-accent bg-accent text-inverse"
              : "border-border hover:border-accent bg-surface text-accent"
          }`}
          title={concluido ? "Marcar como não concluído" : "Concluir tarefa"}
        >
          {concluido && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-bold truncate leading-snug ${
              concluido
                ? "line-through text-muted font-normal"
                : "text-primary"
            }`}
          >
            {item.titulo}
          </p>

          {/* Subtítulo ou tags secundárias */}
          {item.descricao && (
            <p className="text-[11px] text-muted truncate mt-0.5">{item.descricao}</p>
          )}
        </div>
      </div>

      {/* Direita: Tag do Cliente / Entrada + Ícones de Ações Rápidas no Hover */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Tag de Entrada ou Cliente estilo Todoist */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-muted bg-surface px-2 py-0.5 rounded-lg group-hover:hidden">
          {item.projeto ? (
            <>
              <span className="w-2 h-2 rounded-full" style={{ background: item.projeto.cor || "#ff5a3d" }} />
              <span className="truncate max-w-[90px]">{item.projeto.nome}</span>
            </>
          ) : isVideo ? (
            <>
              <Clapperboard className="w-3 h-3 text-accent" />
              <span>Vídeo</span>
            </>
          ) : (
            <span>Entrada 📥</span>
          )}
        </div>

        {/* Toolbar de Ações no Hover estilo Todoist */}
        <div className="hidden group-hover:flex items-center gap-1 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEditar(); }}
            className="p-1 rounded-md text-muted hover:text-primary hover:bg-surface-hover"
            title="Editar"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => onExcluir(item.id, isVideo, e)}
            className="p-1 rounded-md text-muted hover:text-danger hover:bg-danger-subtle"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
