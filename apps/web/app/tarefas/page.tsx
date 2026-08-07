"use client";

import { useState } from "react";
import {
  Circle,
  CheckCircle2,
  Zap,
  Calendar,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import {
  TAREFAS,
  PROJETOS,
  PRIORIDADE_LABELS,
} from "@/lib/mock-data";

type Visao = "hoje" | "semana" | "atrasadas" | "todas";

export default function TarefasPage() {
  const [visao, setVisao] = useState<Visao>("todas");
  const [filtroProjeto, setFiltroProjeto] = useState<string | null>(null);

  const hoje = new Date();
  const fimSemana = new Date(hoje);
  fimSemana.setDate(hoje.getDate() + (7 - hoje.getDay()));

  const tarefasFiltradas = TAREFAS.filter((t) => {
    if (filtroProjeto && t.projetoId !== filtroProjeto) return false;

    switch (visao) {
      case "hoje":
        return (
          t.status !== "concluida" &&
          t.status !== "cancelada" &&
          t.prazo &&
          t.prazo.toDateString() === hoje.toDateString()
        );
      case "semana":
        return (
          t.status !== "concluida" &&
          t.status !== "cancelada" &&
          t.prazo &&
          t.prazo <= fimSemana
        );
      case "atrasadas":
        return (
          t.status !== "concluida" &&
          t.status !== "cancelada" &&
          t.prazo &&
          t.prazo < hoje
        );
      default:
        return true;
    }
  });

  const prioridadeOrdem = { urgente: 0, alta: 1, media: 2, baixa: 3 };
  const sorted = [...tarefasFiltradas].sort(
    (a, b) => prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade]
  );

  return (
    <div className="animate-fade-in-up max-w-3xl">
      {/* Visões */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {(["todas", "hoje", "semana", "atrasadas"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVisao(v)}
            className={`badge cursor-pointer whitespace-nowrap ${
              visao === v ? "badge-accent" : "badge-neutral"
            }`}
          >
            {v === "todas" && "Todas"}
            {v === "hoje" && "Hoje"}
            {v === "semana" && "Semana"}
            {v === "atrasadas" && "Atrasadas"}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          {PROJETOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setFiltroProjeto(filtroProjeto === p.id ? null : p.id)}
              className="w-4 h-4 rounded-full transition-all"
              title={p.nome}
              style={{
                background: p.cor,
                opacity: filtroProjeto === p.id ? 1 : 0.3,
                transform: filtroProjeto === p.id ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {sorted.map((tarefa) => {
          const concluida = tarefa.status === "concluida";
          const atrasada =
            !concluida &&
            tarefa.prazo &&
            tarefa.prazo < hoje;

          return (
            <div
              key={tarefa.id}
              className="card p-4 flex items-start gap-3 cursor-pointer transition-all"
              style={
                atrasada
                  ? { borderColor: "var(--border-accent)" }
                  : {}
              }
            >
              {/* Checkbox */}
              <button className="mt-0.5 flex-shrink-0">
                {concluida ? (
                  <CheckCircle2 className="w-5 h-5" style={{ color: "var(--success)" }} />
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
                  className={`text-sm font-medium ${concluida ? "line-through" : ""}`}
                  style={{ color: concluida ? "var(--text-muted)" : "var(--text-primary)" }}
                >
                  {tarefa.titulo}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {tarefa.projeto && (
                    <span className="text-[11px] font-medium" style={{ color: tarefa.projeto.cor }}>
                      {tarefa.projeto.nome}
                    </span>
                  )}
                  {tarefa.prazo && (
                    <span
                      className="text-[11px] flex items-center gap-1"
                      style={{ color: atrasada ? "var(--danger)" : "var(--text-muted)" }}
                    >
                      <Calendar className="w-3 h-3" />
                      {tarefa.prazo.toLocaleDateString("pt-BR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Priority badge */}
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
                {PRIORIDADE_LABELS[tarefa.prioridade]}
              </span>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Nenhuma tarefa encontrada
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
