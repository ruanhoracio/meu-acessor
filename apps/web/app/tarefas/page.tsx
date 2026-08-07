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
} from "lucide-react";
import { getTarefas, alternarStatusTarefa, excluirTarefa } from "@/actions/tarefas";
import { getProjetos } from "@/actions/projetos";

type Visao = "todas" | "hoje" | "semana" | "atrasadas";

const PRIORIDADE_LABELS: Record<string, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visao, setVisao] = useState<Visao>("todas");
  const [filtroProjeto, setFiltroProjeto] = useState<string | null>(null);

  const carregarDados = async () => {
    try {
      // 1. Tentar via API REST ao vivo (super rápido e atualizado)
      const [resT, resP] = await Promise.all([
        fetch("/api/tarefas", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch("/api/projetos", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      ]);

      if (Array.isArray(resT)) {
        setTarefas(resT);
      } else {
        const tList = await getTarefas();
        setTarefas(tList);
      }

      if (Array.isArray(resP)) {
        setProjetos(resP);
      } else {
        const pList = await getProjetos();
        setProjetos(pList);
      }
    } catch (e) {
      console.error("Erro ao carregar tarefas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();

    // Polling a cada 4 segundos para refletir mensagens enviadas no Telegram instantaneamente
    const interval = setInterval(carregarDados, 4000);

    // Recarregar quando focar na janela
    const onFocus = () => carregarDados();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleToggleStatus = async (id: string, statusAtual: string) => {
    const novoStatus = statusAtual === "concluida" ? "aberta" : "concluida";
    setTarefas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: novoStatus } : t))
    );

    await alternarStatusTarefa(id, statusAtual as any);
    carregarDados();
  };

  const handleExcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Deseja apagar esta tarefa?")) {
      setTarefas((prev) => prev.filter((t) => t.id !== id));
      await excluirTarefa(id);
      carregarDados();
    }
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fimSemana = new Date(hoje);
  fimSemana.setDate(hoje.getDate() + (7 - hoje.getDay()));

  const tarefasFiltradas = tarefas.filter((t) => {
    if (filtroProjeto && t.projetoId !== filtroProjeto) return false;

    const tPrazo = t.prazo ? new Date(t.prazo) : null;

    switch (visao) {
      case "hoje":
        return (
          t.status !== "concluida" &&
          t.status !== "cancelada" &&
          (!tPrazo || tPrazo.toDateString() === hoje.toDateString() || tPrazo <= hoje)
        );
      case "semana":
        return (
          t.status !== "concluida" &&
          t.status !== "cancelada" &&
          tPrazo &&
          tPrazo <= fimSemana
        );
      case "atrasadas":
        return (
          t.status !== "concluida" &&
          t.status !== "cancelada" &&
          tPrazo &&
          tPrazo < hoje
        );
      default:
        return true;
    }
  });

  const prioridadeOrdem: Record<string, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
  const sorted = [...tarefasFiltradas].sort(
    (a, b) => (prioridadeOrdem[a.prioridade] ?? 2) - (prioridadeOrdem[b.prioridade] ?? 2)
  );

  return (
    <div className="animate-fade-in-up max-w-3xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            Minhas Tarefas
          </h1>
          <p className="text-xs text-gray-500">
            Sincronização em tempo real com seu Bot do Telegram.
          </p>
        </div>

        <button
          type="button"
          onClick={carregarDados}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
          title="Atualizar tarefas"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-accent" : ""}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Visões */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {(["todas", "hoje", "semana", "atrasadas"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVisao(v)}
            className={`badge cursor-pointer whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
              visao === v ? "bg-black text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {v === "todas" && "Todas"}
            {v === "hoje" && "Hoje"}
            {v === "semana" && "Semana"}
            {v === "atrasadas" && "Atrasadas"}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          {projetos.map((p) => (
            <button
              key={p.id}
              onClick={() => setFiltroProjeto(filtroProjeto === p.id ? null : p.id)}
              className="w-4 h-4 rounded-full transition-all cursor-pointer border border-black/10"
              title={p.nome}
              style={{
                background: p.cor || "#ff5a3d",
                opacity: filtroProjeto === p.id ? 1 : 0.35,
                transform: filtroProjeto === p.id ? "scale(1.25)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading && tarefas.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <p className="text-xs text-gray-500">Buscando tarefas do Supabase Cloud...</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((tarefa) => {
            const concluida = tarefa.status === "concluida";
            const tPrazo = tarefa.prazo ? new Date(tarefa.prazo) : null;
            const atrasada = !concluida && tPrazo && tPrazo < hoje;

            return (
              <div
                key={tarefa.id}
                onClick={() => handleToggleStatus(tarefa.id, tarefa.status)}
                className="card p-4 flex items-center gap-3.5 cursor-pointer transition-all hover:border-gray-300 group"
                style={atrasada ? { borderColor: "var(--danger)" } : {}}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  className="flex-shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(tarefa.id, tarefa.status);
                  }}
                >
                  {concluida ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle
                      className="w-5 h-5"
                      style={{
                        color:
                          tarefa.prioridade === "urgente"
                            ? "var(--danger)"
                            : tarefa.prioridade === "alta"
                            ? "var(--warning)"
                            : "var(--text-muted)",
                      }}
                    />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold transition-all ${
                      concluida ? "line-through text-gray-400" : "text-gray-900"
                    }`}
                  >
                    {tarefa.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {tarefa.projeto && (
                      <span className="text-[11px] font-bold" style={{ color: tarefa.projeto.cor || "#ff5a3d" }}>
                        {tarefa.projeto.nome}
                      </span>
                    )}
                    {tPrazo && (
                      <span
                        className="text-[11px] flex items-center gap-1 font-medium"
                        style={{ color: atrasada ? "var(--danger)" : "var(--text-muted)" }}
                      >
                        <Calendar className="w-3 h-3" />
                        {tPrazo.toLocaleDateString("pt-BR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Priority badge & actions */}
                <div className="flex items-center gap-2">
                  <span
                    className={`badge text-[10px] flex-shrink-0 ${
                      tarefa.prioridade === "urgente"
                        ? "badge-danger"
                        : tarefa.prioridade === "alta"
                        ? "badge-warning"
                        : tarefa.prioridade === "media"
                        ? "badge-info"
                        : "badge-neutral"
                    }`}
                  >
                    {tarefa.prioridade === "urgente" && <Zap className="w-3 h-3" />}
                    {PRIORIDADE_LABELS[tarefa.prioridade] || "Média"}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleExcluir(tarefa.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:text-red-500 text-gray-400 transition-all cursor-pointer"
                    title="Excluir tarefa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {sorted.length === 0 && (
            <div className="card p-12 text-center space-y-1">
              <p className="text-sm font-semibold text-gray-700">Nenhuma tarefa encontrada</p>
              <p className="text-xs text-gray-400">
                Envie suas tarefas para o Telegram ou clique em + Novo para cadastrar!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
