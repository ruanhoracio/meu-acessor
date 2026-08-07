"use client";

import { useState, useEffect } from "react";
import {
  Circle,
  CheckCircle2,
  Zap,
  Calendar,
  Filter,
  Loader2,
  Trash2,
  RefreshCw,
  Edit3,
  Plus,
} from "lucide-react";
import { ModalEditarTarefa } from "@/components/modals/modal-editar-tarefa";
import { ModalNovo } from "@/components/modals/modal-novo";

const PRIORIDADE_LABELS: Record<string, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export default function TarefasKanbanPage() {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroProjeto, setFiltroProjeto] = useState<string | null>(null);

  // Modais
  const [tarefaParaEditar, setTarefaParaEditar] = useState<any | null>(null);
  const [modalNovoOpen, setModalNovoOpen] = useState(false);

  const carregarDados = async () => {
    try {
      const [resT, resP] = await Promise.all([
        fetch("/api/tarefas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/projetos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);

      if (Array.isArray(resT)) setTarefas(resT);
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
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleToggleStatus = async (id: string, statusAtual: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const novoStatus = statusAtual === "concluida" ? "aberta" : "concluida";

    setTarefas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: novoStatus } : t))
    );

    try {
      await fetch(`/api/tarefas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      carregarDados();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const handleExcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Deseja apagar esta tarefa?")) {
      setTarefas((prev) => prev.filter((t) => t.id !== id));
      await fetch(`/api/tarefas/${id}`, { method: "DELETE" });
      carregarDados();
    }
  };

  // Classificação das colunas do Kanban por data
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  const depoisDeAmanha = new Date(hoje);
  depoisDeAmanha.setDate(hoje.getDate() + 2);

  const tarefasFiltradas = tarefas.filter((t) => {
    if (filtroProjeto && t.projetoId !== filtroProjeto) return false;
    return true;
  });

  // Coluna 1: HOJE (Tarefas sem prazo, para hoje ou atrasadas)
  const colHoje = tarefasFiltradas.filter((t) => {
    if (t.status === "concluida") return false;
    if (!t.prazo) return true; // Tarefas sem prazo vão para HOJE por padrão
    const d = new Date(t.prazo);
    d.setHours(0, 0, 0, 0);
    return d <= hoje;
  });

  // Coluna 2: AMANHÃ
  const colAmanha = tarefasFiltradas.filter((t) => {
    if (t.status === "concluida") return false;
    if (!t.prazo) return false;
    const d = new Date(t.prazo);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === amanha.getTime();
  });

  // Coluna 3: PRÓXIMOS DIAS
  const colProximos = tarefasFiltradas.filter((t) => {
    if (t.status === "concluida") return false;
    if (!t.prazo) return false;
    const d = new Date(t.prazo);
    d.setHours(0, 0, 0, 0);
    return d >= depoisDeAmanha;
  });

  // Coluna 4: CONCLUÍDAS
  const colConcluidas = tarefasFiltradas.filter((t) => t.status === "concluida");

  const colunas = [
    { key: "hoje", titulo: "📌 HOJE", cor: "#ff5a3d", itens: colHoje },
    { key: "amanha", titulo: "⚡ AMANHÃ", cor: "#f59e0b", itens: colAmanha },
    { key: "proximos", titulo: "📅 PRÓXIMOS DIAS", cor: "#3b82f6", itens: colProximos },
    { key: "concluidas", titulo: "✅ CONCLUÍDAS", cor: "#10b981", itens: colConcluidas },
  ];

  return (
    <div className="animate-fade-in-up space-y-6 pb-12">
      {/* Modais */}
      <ModalEditarTarefa
        isOpen={!!tarefaParaEditar}
        tarefa={tarefaParaEditar}
        onClose={() => setTarefaParaEditar(null)}
        onSaved={carregarDados}
      />

      <ModalNovo
        isOpen={modalNovoOpen}
        onClose={() => setModalNovoOpen(false)}
      />

      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            Kanban de Tarefas
          </h1>
          <p className="text-xs text-gray-500">
            Organizadas automaticamente por data: Hoje, Amanhã, Próximos Dias e Concluídas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregarDados}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Atualizar tarefas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-accent" : ""}`} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => setModalNovoOpen(true)}
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Filtro por Cliente */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Clientes:
          </span>
          <button
            onClick={() => setFiltroProjeto(null)}
            className={`badge cursor-pointer px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              filtroProjeto === null ? "bg-black text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Todos
          </button>
          {projetos.map((p) => (
            <button
              key={p.id}
              onClick={() => setFiltroProjeto(filtroProjeto === p.id ? null : p.id)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5"
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
      </div>

      {/* Board Kanban de Tarefas */}
      {loading && tarefas.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <p className="text-xs text-gray-500">Buscando tarefas do Supabase Cloud...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {colunas.map((col) => (
            <div key={col.key} className="flex flex-col bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200 min-h-[350px]">
              {/* Header da Coluna */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 px-1">
                <h3 className="text-xs font-bold tracking-wider" style={{ color: col.cor }}>
                  {col.titulo}
                </h3>
                <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700">
                  {col.itens.length}
                </span>
              </div>

              {/* Cards da Coluna */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {col.itens.map((tarefa) => {
                  const concluida = tarefa.status === "concluida";
                  const tPrazo = tarefa.prazo ? new Date(tarefa.prazo) : null;
                  const atrasada = !concluida && tPrazo && tPrazo < hoje;

                  return (
                    <div
                      key={tarefa.id}
                      onClick={() => setTarefaParaEditar(tarefa)}
                      className="card p-3.5 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-all shadow-xs cursor-pointer group relative"
                      style={atrasada ? { borderColor: "#ef4444" } : {}}
                    >
                      {/* Indicador de Cliente */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: tarefa.projeto?.cor || "#ff5a3d" }}
                          />
                          <span className="text-[11px] font-bold text-gray-600 truncate max-w-[120px]">
                            {tarefa.projeto?.nome || "Sem cliente"}
                          </span>
                        </div>

                        {/* Prioridade */}
                        <span
                          className={`badge text-[9px] font-bold ${
                            tarefa.prioridade === "urgente"
                              ? "badge-danger"
                              : tarefa.prioridade === "alta"
                              ? "badge-warning"
                              : tarefa.prioridade === "media"
                              ? "badge-info"
                              : "badge-neutral"
                          }`}
                        >
                          {tarefa.prioridade === "urgente" && <Zap className="w-2.5 h-2.5" />}
                          {PRIORIDADE_LABELS[tarefa.prioridade] || "Média"}
                        </span>
                      </div>

                      {/* Título & Checkbox */}
                      <div className="flex items-start gap-2.5 mb-2">
                        <button
                          type="button"
                          onClick={(e) => handleToggleStatus(tarefa.id, tarefa.status, e)}
                          className="mt-0.5 flex-shrink-0 cursor-pointer text-gray-400 hover:text-green-600 transition-colors"
                          title={concluida ? "Reabrir tarefa" : "Marcar como concluída"}
                        >
                          {concluida ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                        </button>

                        <p
                          className={`text-xs font-semibold leading-snug flex-1 ${
                            concluida ? "line-through text-gray-400" : "text-gray-900"
                          }`}
                        >
                          {tarefa.titulo}
                        </p>
                      </div>

                      {/* Data & Ações no hover */}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100">
                        {tPrazo ? (
                          <span className="flex items-center gap-1 font-medium" style={atrasada ? { color: "#ef4444" } : {}}>
                            <Calendar className="w-3 h-3" />
                            {tPrazo.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                          </span>
                        ) : (
                          <span>Sem prazo definido</span>
                        )}

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTarefaParaEditar(tarefa);
                            }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-500 cursor-pointer"
                            title="Editar tarefa"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleExcluir(tarefa.id, e)}
                            className="p-1 rounded hover:bg-red-50 text-red-500 cursor-pointer"
                            title="Apagar tarefa"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {col.itens.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs font-medium">
                    Sem tarefas
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
