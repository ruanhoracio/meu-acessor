"use client";

/**
 * Calendário mensal em tela cheia.
 *
 * Estrutura inspirada no FullScreenCalendar (shadcn/21st.dev), reescrita sobre
 * os tokens do nosso design system: os utilitários do shadcn (bg-muted,
 * text-primary-foreground, bg-accent/50…) não existem aqui — e "accent" no
 * nosso tema é o navy sólido, o que deixaria a grade inteira escura.
 *
 * O componente só desenha. Dados, modais e persistência ficam na página.
 */

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, GripVertical, Plus, Repeat } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

export interface CalendarioEvento {
  id: string;
  /** id do evento original quando é uma ocorrência projetada de recorrência */
  idOriginal?: string;
  titulo: string;
  inicio: string | Date;
  fim?: string | Date | null;
  recorrencia?: string | null;
  projeto?: { nome?: string; cor?: string } | null;
}

interface FullScreenCalendarProps {
  /** Qualquer data dentro do mês exibido */
  mesExibido: Date;
  eventos: CalendarioEvento[];
  onMesAnterior: () => void;
  onProximoMes: () => void;
  onHoje: () => void;
  /** Clique no "+" da célula ou no botão "Novo evento" */
  onNovoEvento: (dia: Date) => void;
  onAbrirEvento: (evento: CalendarioEvento) => void;
  /** Soltar um evento arrastado sobre outro dia (só desktop) */
  onSoltarEvento?: (e: React.DragEvent, dia: Date) => void;
  corDoEvento: (evento: CalendarioEvento) => string;
  /** Quantos cartões mostrar por célula antes do "+N mais" */
  maxPorDia?: number;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function primeiraMaiuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function horaDe(evento: CalendarioEvento) {
  return format(new Date(evento.inicio), "HH:mm");
}

function ehMultiDias(evento: CalendarioEvento) {
  if (!evento.fim) return false;
  return !isSameDay(new Date(evento.inicio), new Date(evento.fim));
}

export function FullScreenCalendar({
  mesExibido,
  eventos,
  onMesAnterior,
  onProximoMes,
  onHoje,
  onNovoEvento,
  onAbrirEvento,
  onSoltarEvento,
  corDoEvento,
  maxPorDia = 3,
}: FullScreenCalendarProps) {
  const hoje = new Date();
  const [diaSelecionado, setDiaSelecionado] = React.useState<Date>(hoje);
  const [diasExpandidos, setDiasExpandidos] = React.useState<Set<string>>(new Set());
  const ehDesktop = useMediaQuery("(min-width: 768px)");

  const inicioMes = startOfMonth(mesExibido);
  const fimMes = endOfMonth(mesExibido);
  // Semanas completas: 5 ou 6 linhas conforme o mês, nunca corta o fim.
  const dias = eachDayOfInterval({ start: startOfWeek(inicioMes), end: endOfWeek(fimMes) });
  const linhas = dias.length / 7;

  // Evento de vários dias aparece em todos os dias que cobre.
  const eventosDoDia = React.useCallback(
    (dia: Date) => {
      const inicioDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0, 0);
      const fimDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59, 999);
      return eventos
        .filter((ev) => {
          const ini = new Date(ev.inicio);
          const fim = ev.fim ? new Date(ev.fim) : ini;
          return ini <= fimDia && fim >= inicioDia;
        })
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
    },
    [eventos]
  );

  const alternarExpandido = (chave: string) => {
    setDiasExpandidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  };

  const eventosSelecionados = eventosDoDia(diaSelecionado);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {/* Folhinha com o dia de hoje */}
          <div className="hidden md:flex w-16 flex-col items-center rounded-xl border border-border bg-surface p-1 shadow-xs">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted py-0.5">
              {format(hoje, "MMM", { locale: ptBR }).replace(".", "")}
            </span>
            <span className="w-full rounded-lg bg-card border border-border text-center font-heading text-xl font-semibold text-primary py-0.5">
              {format(hoje, "d")}
            </span>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-semibold text-primary leading-tight">
              {primeiraMaiuscula(format(inicioMes, "MMMM 'de' yyyy", { locale: ptBR }))}
            </h2>
            <p className="font-mono text-[11px] text-muted mt-0.5">
              {format(inicioMes, "d 'de' MMM", { locale: ptBR })} –{" "}
              {format(fimMes, "d 'de' MMM", { locale: ptBR })} · {eventos.length}{" "}
              {eventos.length === 1 ? "compromisso" : "compromissos"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Navegação agrupada */}
          <div className="inline-flex items-stretch rounded-full border border-border bg-card shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={onMesAnterior}
              className="px-3 py-2 text-secondary hover:bg-surface hover:text-primary transition-colors cursor-pointer"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onHoje();
                setDiaSelecionado(hoje);
              }}
              className="px-4 py-2 text-xs font-bold text-primary border-x border-border hover:bg-surface transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={onProximoMes}
              className="px-3 py-2 text-secondary hover:bg-surface hover:text-primary transition-colors cursor-pointer"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNovoEvento(ehDesktop ? hoje : diaSelecionado)}
            className="btn-primary text-xs py-2.5 px-5 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo evento</span>
          </button>
        </div>
      </div>

      {/* ── Grade ─────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 border-b border-border bg-surface">
          {DIAS_SEMANA.map((dia, i) => (
            <div
              key={dia}
              className={cn(
                "py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-muted",
                i < 6 && "border-r border-border"
              )}
            >
              {ehDesktop ? dia : dia.charAt(0)}
            </div>
          ))}
        </div>

        {ehDesktop ? (
          /* ── Desktop: células com cartões ─────────────────── */
          <div
            className="grid grid-cols-7"
            style={{ gridTemplateRows: `repeat(${linhas}, minmax(128px, auto))` }}
          >
            {dias.map((dia, idx) => {
              const doMes = isSameMonth(dia, inicioMes);
              const eHoje = isToday(dia);
              const chave = format(dia, "yyyy-MM-dd");
              const lista = eventosDoDia(dia);
              const expandido = diasExpandidos.has(chave);
              const visiveis = expandido ? lista : lista.slice(0, maxPorDia);
              const ocultos = lista.length - visiveis.length;

              return (
                <div
                  key={chave}
                  onClick={() => onNovoEvento(dia)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => onSoltarEvento?.(e, dia)}
                  className={cn(
                    "group relative flex flex-col border-b border-border p-2 transition-colors cursor-pointer hover:bg-surface",
                    (idx + 1) % 7 !== 0 && "border-r",
                    idx >= dias.length - 7 && "border-b-0",
                    !doMes && "bg-surface/60"
                  )}
                >
                  <header className="flex items-center justify-between mb-1.5">
                    <span
                      className={cn(
                        "inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded-full font-mono text-xs font-bold whitespace-nowrap",
                        eHoje
                          ? "bg-accent text-inverse shadow-xs"
                          : doMes
                            ? "text-primary"
                            : "text-faint"
                      )}
                    >
                      {dia.getDate() === 1
                        ? format(dia, "d MMM", { locale: ptBR }).replace(".", "")
                        : format(dia, "d")}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNovoEvento(dia);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted hover:text-accent transition-opacity cursor-pointer"
                      title="Adicionar evento neste dia"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </header>

                  <div className="flex flex-col gap-1">
                    {visiveis.map((ev) => (
                      <div
                        key={`${ev.id}-${chave}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", ev.idOriginal || ev.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAbrirEvento(ev);
                        }}
                        className="flex items-center gap-1.5 rounded-md bg-card border border-border pl-1.5 pr-2 py-1 text-[11px] leading-tight shadow-xs hover:shadow-sm hover:border-border-hover transition-all cursor-grab active:cursor-grabbing select-none"
                        style={{ borderLeft: `3px solid ${corDoEvento(ev)}` }}
                        title={`${horaDe(ev)} — ${ev.titulo}`}
                      >
                        <GripVertical className="w-2.5 h-2.5 text-faint flex-shrink-0" />
                        <span className="font-mono text-[10px] text-muted flex-shrink-0">{horaDe(ev)}</span>
                        <span className="font-semibold text-primary truncate flex-1">{ev.titulo}</span>
                        {(ev.recorrencia === "semanal" || ev.recorrencia === "mensal") && (
                          <Repeat className="w-3 h-3 text-muted flex-shrink-0" />
                        )}
                        {ehMultiDias(ev) && (
                          <span className="font-mono text-[9px] text-muted flex-shrink-0">2d+</span>
                        )}
                      </div>
                    ))}

                    {ocultos > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          alternarExpandido(chave);
                        }}
                        className="self-start font-mono text-[10px] font-bold text-muted hover:text-accent px-1 cursor-pointer"
                      >
                        + {ocultos} mais
                      </button>
                    )}
                    {expandido && lista.length > maxPorDia && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          alternarExpandido(chave);
                        }}
                        className="self-start font-mono text-[10px] font-bold text-muted hover:text-accent px-1 cursor-pointer"
                      >
                        mostrar menos
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Celular: dias com bolinhas + lista do dia ────── */
          <>
            <div className="grid grid-cols-7">
              {dias.map((dia, idx) => {
                const doMes = isSameMonth(dia, inicioMes);
                const eHoje = isToday(dia);
                const selecionado = isSameDay(dia, diaSelecionado);
                const lista = eventosDoDia(dia);

                return (
                  <button
                    key={format(dia, "yyyy-MM-dd")}
                    type="button"
                    onClick={() => setDiaSelecionado(dia)}
                    className={cn(
                      "flex h-14 flex-col items-center justify-start gap-1 border-b border-border py-1.5 transition-colors",
                      (idx + 1) % 7 !== 0 && "border-r",
                      selecionado ? "bg-accent-subtle" : "hover:bg-surface",
                      !doMes && "bg-surface/60"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold",
                        eHoje && "bg-accent text-inverse",
                        !eHoje && selecionado && "ring-2 ring-accent text-primary",
                        !eHoje && !selecionado && (doMes ? "text-primary" : "text-faint")
                      )}
                    >
                      {format(dia, "d")}
                    </span>
                    {lista.length > 0 && (
                      <span className="flex gap-0.5">
                        {lista.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: corDoEvento(ev) }}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 space-y-2 border-t border-border bg-surface/40">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                  {primeiraMaiuscula(format(diaSelecionado, "EEEE, d 'de' MMMM", { locale: ptBR }))}
                </p>
                <button
                  type="button"
                  onClick={() => onNovoEvento(diaSelecionado)}
                  className="text-xs font-bold text-accent flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {eventosSelecionados.length === 0 ? (
                <p className="text-xs text-muted py-3 text-center">Nenhum compromisso neste dia.</p>
              ) : (
                eventosSelecionados.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onAbrirEvento(ev)}
                    className="w-full text-left rounded-xl bg-card border border-border p-3 shadow-xs hover:border-border-hover transition-colors"
                    style={{ borderLeft: `3px solid ${corDoEvento(ev)}` }}
                  >
                    <p className="text-sm font-semibold text-primary leading-tight">{ev.titulo}</p>
                    <p className="font-mono text-[11px] text-muted mt-1 flex items-center gap-2">
                      {horaDe(ev)}
                      {ev.projeto?.nome && <span>· {ev.projeto.nome}</span>}
                      {(ev.recorrencia === "semanal" || ev.recorrencia === "mensal") && (
                        <Repeat className="w-3 h-3" />
                      )}
                    </p>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
