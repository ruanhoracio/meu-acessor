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
import { BannerAvisos } from "@/components/dashboard/banner-avisos";
import { BarraCapturaIA } from "@/components/dashboard/barra-captura-ia";

export default function HojePage() {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarData = async () => {
    try {
      const [resT, resV, resE] = await Promise.all([
        fetch("/api/tarefas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/videos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/eventos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);

      if (Array.isArray(resT)) setTarefas(resT);
      if (Array.isArray(resV)) setVideos(resV);
      if (Array.isArray(resE)) setEventos(resE);
    } catch (e) {
      console.error("Erro ao carregar Dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarData();
    const interval = setInterval(carregarData, 4000);
    const onFocus = () => carregarData();
    const onDadosUpdated = () => carregarData();

    window.addEventListener("focus", onFocus);
    window.addEventListener("dados_updated", onDadosUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("dados_updated", onDadosUpdated);
    };
  }, []);

  const toggleTarefa = async (id: string, statusAtual: string) => {
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
      window.dispatchEvent(new Event("dados_updated"));
      carregarData();
    } catch (err) {
      console.error("Erro ao alternar tarefa:", err);
    }
  };

  // Filtragem para HOJE
  const hojeStr = new Date().toDateString();

  const tarefasHoje = tarefas.filter((t) => t.status !== "concluida");
  const tarefasConcluidasHoje = tarefas.filter((t) => t.status === "concluida");

  const eventosHoje = eventos.filter((e) => {
    if (!e.inicio) return false;
    return new Date(e.inicio).toDateString() === hojeStr;
  });

  const videosAtivos = videos.filter((v) => v.estagio !== "entregue");
  const travadosCount = videosAtivos.filter((v) => {
    const ultimoEv = v.ultimoEvento ? new Date(v.ultimoEvento) : new Date(v.criadoEm);
    return Math.floor((Date.now() - ultimoEv.getTime()) / (1000 * 60 * 60 * 24)) >= 3;
  }).length;

  // Capacidade da semana
  const horasComprometidas = videosAtivos.reduce(
    (acc, v) => acc + (v.estimativaHoras || 0),
    0
  );
  const horasDisponiveis = 30; // 6h/dia * 5 dias
  const percentual = Math.round((horasComprometidas / horasDisponiveis) * 100);
  const estourada = percentual > 100;

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* ── Captura Inteligente com IA ─────────────────── */}
      <BarraCapturaIA onSucesso={() => { window.dispatchEvent(new Event("dados_updated")); carregarData(); }} />

      {/* ── Carrossel de Avisos em Looping ──────────── */}
      <BannerAvisos />

      {/* ── Resumo rápido ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-accent" />}
          label="Tarefas pendentes"
          value={String(tarefasHoje.length)}
          accent={false}
        />
        <StatCard
          icon={<Clapperboard className="w-4 h-4 text-blue-500" />}
          label="Vídeos em edição"
          value={String(videosAtivos.length)}
          accent={false}
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
          label="Vídeos travados"
          value={String(travadosCount)}
          accent={travadosCount > 0}
        />
        <StatCard
          icon={<Timer className="w-4 h-4 text-green-500" />}
          label="Agenda hoje"
          value={String(eventosHoje.length)}
          accent={false}
        />
      </div>

      {/* ── Capacidade da semana ────────────────────── */}
      <div className="card p-5 animate-fade-in-up-delay-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">
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
              background: estourada ? "var(--danger)" : "var(--accent)",
              boxShadow: estourada ? "0 0 12px var(--danger-subtle)" : "0 0 12px var(--accent-glow)",
            }}
          />
        </div>
        <p className="text-xs mt-2 text-gray-500">
          {estourada
            ? `⚠️ Semana estourada em ${horasParaTexto(horasComprometidas - horasDisponiveis)}`
            : `${horasParaTexto(horasDisponiveis - horasComprometidas)} disponíveis`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Agenda do dia ────────────────────────── */}
        <div className="card p-5 animate-fade-in-up-delay-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Agenda Hoje ({eventosHoje.length})
            </h2>
            <Link href="/agenda" className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1">
              Ver tudo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {eventosHoje.map((evento) => {
              const inicio = new Date(evento.inicio);
              const fim = evento.fim ? new Date(evento.fim) : null;
              return (
                <div
                  key={evento.id}
                  className="flex gap-3 p-3 rounded-xl bg-gray-50 transition-colors border-l-4"
                  style={{ borderColor: evento.projeto?.cor || "var(--accent)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{evento.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
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

            {eventosHoje.length === 0 && (
              <p className="text-xs py-4 text-center text-gray-400">
                Nenhum compromisso marcado para hoje
              </p>
            )}
          </div>
        </div>

        {/* ── Tarefas do dia (Com Sync em Tempo Real) ───────────────────────── */}
        <div className="card p-5 animate-fade-in-up-delay-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              Tarefas ({tarefasHoje.length})
            </h2>
            <Link href="/tarefas" className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1">
              Ver tudo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {tarefasHoje.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTarefa(t.id, t.status)}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Circle
                  className={`w-4 h-4 flex-shrink-0 ${
                    t.prioridade === "urgente"
                      ? "text-red-500"
                      : t.prioridade === "alta"
                      ? "text-amber-500"
                      : "text-gray-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate block">{t.titulo}</span>
                  {t.projeto && (
                    <span className="text-[11px] font-bold" style={{ color: t.projeto.cor }}>
                      {t.projeto.nome}
                    </span>
                  )}
                </div>
                {t.prioridade === "urgente" && (
                  <Zap className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
                )}
              </div>
            ))}

            {tarefasConcluidasHoje.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTarefa(t.id, t.status)}
                className="flex items-center gap-3 py-2 px-3 rounded-lg opacity-50 cursor-pointer hover:opacity-75 transition-opacity"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
                <span className="text-sm line-through text-gray-400 truncate">
                  {t.titulo}
                </span>
              </div>
            ))}

            {tarefasHoje.length === 0 && tarefasConcluidasHoje.length === 0 && (
              <p className="text-xs py-4 text-center text-gray-400">
                Nenhuma tarefa pendente para hoje
              </p>
            )}
          </div>
        </div>

        {/* ── Vídeos prioritários ──────────────────── */}
        <div className="card p-5 animate-fade-in-up-delay-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-base font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-accent" />
              Vídeos Ativos ({videosAtivos.length})
            </h2>
            <Link href="/pipeline" className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1">
              Ver tudo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {videosAtivos.slice(0, 4).map((v) => {
              const ultimoEv = v.ultimoEvento ? new Date(v.ultimoEvento) : new Date(v.criadoEm);
              const diasParado = Math.floor((Date.now() - ultimoEv.getTime()) / (1000 * 60 * 60 * 24));
              const travado = diasParado >= 3;

              return (
                <Link
                  key={v.id}
                  href={`/pipeline/${v.id}`}
                  className="block p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all border-l-4"
                  style={{
                    borderColor: v.projeto?.cor || "var(--accent)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{v.titulo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="badge badge-neutral text-[10px]">
                          {FORMATO_LABELS[v.formato] || v.formato}
                        </span>
                        <span className="badge badge-neutral text-[10px] uppercase font-bold text-accent">
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
                      <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        {v.aguardando === "cliente" || v.aguardando === "aprovacao" ? (
                          <Users className="w-3 h-3 text-gray-400" />
                        ) : (
                          <User className="w-3 h-3 text-gray-400" />
                        )}
                        {AGUARDANDO_LABELS[v.aguardando || "eu"]}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {videosAtivos.length === 0 && (
              <p className="text-xs py-4 text-center text-gray-400">
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
      <div className="flex items-center gap-2 text-gray-500">
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
