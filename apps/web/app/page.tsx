"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clapperboard,
  Timer,
  TrendingUp,
  ChevronRight,
  User,
  Users,
  Video,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  ESTAGIO_LABELS,
  FORMATO_LABELS,
  AGUARDANDO_LABELS,
} from "@/lib/mock-data";
import { horasParaTexto } from "@/lib/utils";
import { getDashboardData } from "@/actions/dashboard";
import { alternarStatusTarefa } from "@/actions/tarefas";
import { BannerAvisos } from "@/components/dashboard/banner-avisos";

export default function HojePage() {
  const [data, setData] = useState<{
    tarefasHoje: any[];
    tarefasConcluidas: any[];
    videosAtivos: any[];
    eventosHoje: any[];
    travadosCount: number;
  }>({
    tarefasHoje: [],
    tarefasConcluidas: [],
    videosAtivos: [],
    eventosHoje: [],
    travadosCount: 0,
  });

  const carregarData = async () => {
    const res = await getDashboardData();
    if (res.success) {
      setData({
        tarefasHoje: res.tarefasHoje,
        tarefasConcluidas: res.tarefasConcluidas,
        videosAtivos: res.videosAtivos,
        eventosHoje: res.eventosHoje,
        travadosCount: res.travadosCount,
      });
    }
  };

  useEffect(() => {
    carregarData();
  }, []);

  const toggleTarefa = async (id: string, status: string) => {
    await alternarStatusTarefa(id, status as any);
    carregarData();
  };

  // Capacidade da semana
  const horasComprometidas = data.videosAtivos.reduce(
    (acc, v) => acc + (v.estimativaHoras || 0),
    0
  );
  const horasDisponiveis = 30; // 6h/dia * 5 dias
  const percentual = Math.round((horasComprometidas / horasDisponiveis) * 100);
  const estourada = percentual > 100;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Carrossel de Avisos em Looping ──────────── */}
      <BannerAvisos />

      {/* ── Resumo rápido ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Tarefas hoje"
          value={String(data.tarefasHoje.length)}
          accent={false}
        />
        <StatCard
          icon={<Clapperboard className="w-4 h-4" />}
          label="Vídeos ativos"
          value={String(data.videosAtivos.length)}
          accent={false}
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Travados"
          value={String(data.travadosCount)}
          accent={data.travadosCount > 0}
        />
        <StatCard
          icon={<Timer className="w-4 h-4" />}
          label="Compromissos"
          value={String(data.eventosHoje.length)}
          accent={false}
        />
      </div>

      {/* ── Capacidade da semana ────────────────────── */}
      <div className="card p-5 animate-fade-in-up-delay-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Capacidade da semana
            </span>
          </div>
          <span
            className="text-sm font-bold"
            style={{ color: estourada ? "var(--danger)" : "var(--accent)" }}
          >
            {horasParaTexto(horasComprometidas)} / {horasParaTexto(horasDisponiveis)}
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(percentual, 100)}%`,
              background: estourada
                ? "var(--danger)"
                : "var(--accent)",
              boxShadow: estourada
                ? "0 0 12px var(--danger-subtle)"
                : "0 0 12px var(--accent-glow)",
            }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          {estourada
            ? `⚠️ Semana estourada em ${horasParaTexto(horasComprometidas - horasDisponiveis)}`
            : `${horasParaTexto(horasDisponiveis - horasComprometidas)} disponíveis`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Agenda do dia ────────────────────────── */}
        <div className="card p-5 animate-fade-in-up-delay-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-bold tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: "var(--accent)" }} />
              Agenda Hoje ({data.eventosHoje.length})
            </h2>
            <Link href="/agenda" className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              Ver tudo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.eventosHoje.map((evento) => {
              const inicio = new Date(evento.inicio);
              const fim = evento.fim ? new Date(evento.fim) : null;
              return (
                <div
                  key={evento.id}
                  className="flex gap-3 p-3 rounded-[14px] transition-colors"
                  style={{ background: "var(--bg-surface)", borderLeft: `4px solid ${evento.projeto?.cor || "var(--accent)"}` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{evento.titulo}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
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
                </div>
              );
            })}

            {data.eventosHoje.length === 0 && (
              <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
                Nenhum compromisso marcado para hoje
              </p>
            )}
          </div>
        </div>

        {/* ── Tarefas do dia ───────────────────────── */}
        <div className="card p-5 animate-fade-in-up-delay-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-bold tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: "var(--accent)" }} />
              Tarefas ({data.tarefasHoje.length})
            </h2>
            <Link href="/tarefas" className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              Ver tudo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {data.tarefasConcluidas.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-lg opacity-50">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--success)" }} />
                <span className="text-sm line-through" style={{ color: "var(--text-muted)" }}>
                  {t.titulo}
                </span>
              </div>
            ))}
            {data.tarefasHoje.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTarefa(t.id, t.status)}
                className="flex items-center gap-3 py-2.5 px-3 rounded-[12px] transition-colors cursor-pointer"
                style={{ background: "var(--bg-surface)" }}
              >
                <Circle
                  className="w-4 h-4 flex-shrink-0"
                  style={{
                    color:
                      t.prioridade === "urgente"
                        ? "var(--danger)"
                        : t.prioridade === "alta"
                        ? "var(--warning)"
                        : "var(--text-muted)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate block" style={{ color: "var(--text-primary)" }}>{t.titulo}</span>
                  {t.projeto && (
                    <span className="text-[11px] font-medium" style={{ color: t.projeto.cor }}>
                      {t.projeto.nome}
                    </span>
                  )}
                </div>
                {t.prioridade === "urgente" && (
                  <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--danger)" }} />
                )}
              </div>
            ))}

            {data.tarefasHoje.length === 0 && data.tarefasConcluidas.length === 0 && (
              <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
                Nenhuma tarefa pendente para hoje
              </p>
            )}
          </div>
        </div>

        {/* ── Vídeos prioritários ──────────────────── */}
        <div className="card p-5 animate-fade-in-up-delay-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-bold tracking-tight flex items-center gap-2">
              <Video className="w-4 h-4" style={{ color: "var(--accent)" }} />
              Vídeos Ativos ({data.videosAtivos.length})
            </h2>
            <Link href="/pipeline" className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              Ver tudo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.videosAtivos.slice(0, 4).map((v) => {
              const ultimoEv = v.ultimoEvento ? new Date(v.ultimoEvento) : new Date(v.criadoEm);
              const diasParado = Math.floor((Date.now() - ultimoEv.getTime()) / (1000 * 60 * 60 * 24));
              const travado = diasParado >= 3;

              return (
                <Link
                  key={v.id}
                  href={`/pipeline/${v.id}`}
                  className="block p-3 rounded-[14px] transition-all card"
                  style={{
                    borderLeft: `4px solid ${v.projeto?.cor || "var(--accent)"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{v.titulo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="badge badge-neutral text-[10px]">
                          {FORMATO_LABELS[v.formato] || v.formato}
                        </span>
                        <span className="badge badge-neutral text-[10px]">
                          {ESTAGIO_LABELS[v.estagio] || v.estagio}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {travado && (
                        <span className="badge badge-danger text-[10px] mb-1">
                          {diasParado}d parado
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                        {v.aguardando === "cliente" || v.aguardando === "aprovacao" ? (
                          <Users className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {AGUARDANDO_LABELS[v.aguardando || "eu"]}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {data.videosAtivos.length === 0 && (
              <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
                Nenhum vídeo em edição
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: boolean;
}) {
  return (
    <div
      className="card p-4 flex flex-col gap-2"
      style={
        accent
          ? {
              borderColor: "var(--border-accent)",
              background: "rgba(255, 90, 61, 0.05)",
            }
          : {}
      }
    >
      <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p
        className="font-heading text-2xl font-bold tracking-tight"
        style={{ color: accent ? "var(--accent)" : "var(--text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}
