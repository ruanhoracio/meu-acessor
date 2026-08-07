"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { getEventos } from "@/actions/agenda";

const HORAS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h–20h

export default function AgendaPage() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [eventos, setEventos] = useState<any[]>([]);

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(dataAtual);
    const diff = d.getDay();
    d.setDate(d.getDate() - diff + i);
    return d;
  });

  const hoje = new Date();

  useEffect(() => {
    async function carregar() {
      const inicio = new Date(dataAtual);
      inicio.setHours(0, 0, 0, 0);
      inicio.setDate(inicio.getDate() - inicio.getDay());

      const fim = new Date(inicio);
      fim.setDate(fim.getDate() + 7);

      const res = await getEventos(inicio, fim);
      if (res.success) {
        setEventos(res.eventos);
      }
    }
    carregar();
  }, [dataAtual]);

  return (
    <div className="animate-fade-in-up">
      {/* Nav semanal */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            const d = new Date(dataAtual);
            d.setDate(d.getDate() - 7);
            setDataAtual(d);
          }}
          className="btn-ghost p-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          {diasSemana.map((dia) => {
            const isHoje = dia.toDateString() === hoje.toDateString();
            const isSelecionado =
              dia.toDateString() === dataAtual.toDateString();

            return (
              <button
                key={dia.toISOString()}
                onClick={() => setDataAtual(new Date(dia))}
                className="flex flex-col items-center gap-1 p-2 rounded-[14px] transition-all min-w-[44px]"
                style={{
                  background: isSelecionado
                    ? "#1a1a1a"
                    : "transparent",
                  color: isSelecionado ? "#ffffff" : "var(--text-primary)",
                  border: isHoje && !isSelecionado
                    ? "1px solid var(--border-accent)"
                    : "1px solid transparent",
                }}
              >
                <span
                  className="text-[10px] font-semibold uppercase"
                  style={{
                    color: isSelecionado
                      ? "#ffffff"
                      : "var(--text-muted)",
                  }}
                >
                  {dia.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
                </span>
                <span className="text-sm font-bold">
                  {dia.getDate()}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => {
            const d = new Date(dataAtual);
            d.setDate(d.getDate() + 7);
            setDataAtual(d);
          }}
          className="btn-ghost p-2"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline */}
      <div className="card p-6 overflow-x-auto">
        <div className="relative min-h-[600px]">
          {HORAS.map((hora) => (
            <div
              key={hora}
              className="flex items-start border-t py-0"
              style={{ borderColor: "var(--border)", height: "60px" }}
            >
              <span
                className="w-12 text-xs font-semibold flex-shrink-0 -mt-2"
                style={{ color: "var(--text-muted)" }}
              >
                {String(hora).padStart(2, "0")}:00
              </span>
              <div className="flex-1 relative" />
            </div>
          ))}

          {/* Eventos do banco de dados */}
          {eventos.map((evento) => {
            const inicio = new Date(evento.inicio);
            const fim = evento.fim ? new Date(evento.fim) : null;
            const horaInicio = inicio.getHours();
            const minutoInicio = inicio.getMinutes();
            const duracaoMin = fim
              ? (fim.getTime() - inicio.getTime()) / 60000
              : 60;
            const top = (horaInicio - 7) * 60 + minutoInicio;
            const height = Math.max(duracaoMin, 36);

            // Só mostra eventos do dia selecionado
            if (inicio.toDateString() !== dataAtual.toDateString()) return null;

            return (
              <div
                key={evento.id}
                className="absolute left-14 right-4 rounded-[14px] p-3 transition-all cursor-pointer shadow-xs"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  background: "#ffffff",
                  borderLeft: `4px solid ${evento.projeto?.cor || "var(--accent)"}`,
                  border: `1px solid var(--border)`,
                  borderLeftWidth: "4px",
                }}
              >
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {evento.titulo}
                </p>
                <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                  <Clock className="w-3 h-3" />
                  {inicio.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {fim &&
                    ` — ${fim.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
                </p>
              </div>
            );
          })}

          {eventos.filter((e) => new Date(e.inicio).toDateString() === dataAtual.toDateString()).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Nenhum compromisso para este dia
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
