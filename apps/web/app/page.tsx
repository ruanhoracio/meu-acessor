"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  Circle,
  Clapperboard,
  ChevronRight,
  User,
  Users,
  Video,
  Zap,
  CheckSquare,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import {
  ESTAGIO_LABELS,
  FORMATO_LABELS,
  AGUARDANDO_LABELS,
} from "@/lib/mock-data";
import { getEventos } from "@/actions/agenda";
import { getEntregasMensais } from "@/actions/entregas";
import { BarraCapturaIA } from "@/components/dashboard/barra-captura-ia";

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

export default function HojePage() {
  const [tarefas, setTarefas] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [entregasMes, setEntregasMes] = useState<{ feitas: number; total: number }>({ feitas: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const carregarData = async () => {
    try {
      const [resT, resV, resE, resEnt] = await Promise.all([
        fetch("/api/tarefas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/videos", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        (async () => {
          // Usa a action da Agenda (e não /api/eventos) porque só ela projeta
          // as recorrências semanais/mensais para os próximos dias.
          const ini = new Date(); ini.setHours(0, 0, 0, 0);
          const fim = new Date(ini); fim.setDate(fim.getDate() + 6); fim.setHours(23, 59, 59, 999);
          return getEventos(ini, fim).catch(() => []);
        })(),
        (async () => {
          // Card "entregues" espelha a aba Entregas (EntregaMensal), que é
          // onde a entrega é de fato marcada — não a tabela do Pipeline.
          const h = new Date();
          return getEntregasMensais("todos", h.getMonth() + 1, h.getFullYear()).catch(() => null);
        })(),
      ]);

      if (Array.isArray(resT)) setTarefas(resT);
      if (Array.isArray(resV)) setVideos(resV);
      if (Array.isArray(resE)) setEventos(resE);
      if (resEnt?.success && Array.isArray(resEnt.videos)) {
        const lista = resEnt.videos;
        setEntregasMes({
          feitas: lista.filter(
            (v: any) => v.concluido === true || v.estagio === "entregue" || v.estagio === "aprovado"
          ).length,
          total: lista.length,
        });
      }
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

  // Filtragem ESTRITA para HOJE (Apenas tarefas sem prazo ou de hoje/atrasadas)
  const hojeStr = getDiaString(new Date());

  const tarefasHoje = tarefas.filter((t) => {
    if (t.status === "concluida") return false;
    if (!t.prazo) return true; // Tarefas sem prazo ficam na lista de Hoje por padrão
    const pStr = getDiaString(t.prazo);
    return pStr <= hojeStr; // Apenas de hoje ou atrasadas!
  });

  const tarefasConcluidasHoje = tarefas.filter((t) => {
    if (t.status !== "concluida") return false;
    if (!t.prazo) return true;
    const pStr = getDiaString(t.prazo);
    return pStr === hojeStr;
  });

  const eventosHoje = eventos.filter((e) => {
    if (!e.inicio) return false;
    const eStr = getDiaString(e.inicio);
    return eStr === hojeStr;
  });

  // Pipeline = tudo que ainda não foi entregue; "em edição" é só a parte
  // que está de fato na bancada (briefing e aprovado não contam).
  const ESTAGIOS_EDICAO = ["material_recebido", "cortando", "primeiro_corte", "ajustes"];
  const videosAtivos = videos.filter((v) => v.estagio !== "entregue");
  const videosEmEdicao = videos.filter((v) => ESTAGIOS_EDICAO.includes(v.estagio));

  // Vídeo também é trabalho do dia: entra na conta de "tarefas pra hoje".
  const videosParaHoje = videosAtivos.filter(
    (v) => v.prazoEntrega && getDiaString(v.prazoEntrega) <= hojeStr
  );
  const totalParaHoje = tarefasHoje.length + videosParaHoje.length;

  // Agenda da semana: hoje + 6 dias, já com as recorrências projetadas
  const diasDaSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const dStr = getDiaString(d);
    return {
      data: d,
      dStr,
      ehHoje: i === 0,
      // Compara o dia contra o intervalo inteiro: "Global Conf" vai de 20 a
      // 22/08 e precisa aparecer nos três dias, não só no de início.
      eventos: eventos
        .filter((e) => {
          if (!e.inicio) return false;
          const ini = getDiaString(e.inicio);
          const fim = e.fim ? getDiaString(e.fim) : ini;
          return dStr >= ini && dStr <= fim;
        })
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()),
    };
  });
  // Distintos: um evento de 3 dias conta como 1 compromisso na semana.
  const totalEventosSemana = new Set(
    diasDaSemana.flatMap((d) => d.eventos.map((e: any) => e.idOriginal || e.id))
  ).size;

  return (
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* ── Captura Inteligente com IA ─────────────────── */}
      <BarraCapturaIA onSucesso={() => { window.dispatchEvent(new Event("dados_updated")); carregarData(); }} />

      {/* ── Resumo rápido ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckSquare className="w-4 h-4 text-accent" />}
          label="Tarefas pra hoje"
          value={String(totalParaHoje)}
          accent={false}
        />
        <StatCard
          icon={<Clapperboard className="w-4 h-4 text-blue-500" />}
          label="Vídeos em edição"
          value={String(videosEmEdicao.length)}
          accent={false}
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4 text-success" />}
          label="Vídeos entregues"
          value={`${entregasMes.feitas}/${entregasMes.total}`}
          accent={false}
        />
        <StatCard
          icon={<Video className="w-4 h-4 text-accent" />}
          label="Vídeos no pipeline"
          value={String(videosAtivos.length)}
          accent={false}
        />
      </div>

      {/* ── Agenda da semana ────────────────────────── */}
      <div className="card p-6 animate-fade-in-up-delay-1">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xl font-light text-primary flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-accent" />
            Agenda da Semana ({totalEventosSemana})
          </h2>
          <Link
            href="/agenda"
            className="text-xs font-mono font-bold text-muted hover:text-accent flex items-center gap-1 uppercase tracking-wider"
          >
            Ver tudo <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {diasDaSemana.map((dia) => (
            <div
              key={dia.dStr}
              className="rounded-lg p-2.5 min-h-[104px] border transition-colors"
              style={{
                background: dia.ehHoje ? "var(--accent-subtle)" : "var(--bg-surface)",
                borderColor: dia.ehHoje ? "var(--accent)" : "transparent",
              }}
            >
              <div className="flex items-baseline gap-1.5 mb-2">
                <span
                  className="font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: dia.ehHoje ? "var(--accent)" : "var(--text-muted)" }}
                >
                  {dia.data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                </span>
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: dia.ehHoje ? "var(--accent)" : "var(--text-primary)" }}
                >
                  {dia.data.getDate()}
                </span>
              </div>

              <div className="space-y-1.5">
                {dia.eventos.map((ev: any, i: number) => (
                  <div
                    key={`${ev.id}-${i}`}
                    className="rounded px-1.5 py-1 border-l-2 bg-card"
                    style={{ borderColor: ev.projeto?.cor || "var(--accent)" }}
                    title={ev.titulo}
                  >
                    <p className="font-mono text-[9px] text-muted leading-none mb-0.5">
                      {new Date(ev.inicio).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-[10px] font-bold text-primary leading-tight line-clamp-2">
                      {ev.titulo}
                    </p>
                  </div>
                ))}

                {dia.eventos.length === 0 && (
                  <p className="font-mono text-[9px] text-faint">—</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Agenda do dia ────────────────────────── */}
        <div className="card p-6 animate-fade-in-up-delay-1">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-xl font-light text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Agenda Hoje ({eventosHoje.length})
            </h2>
            <Link href="/agenda" className="text-xs font-mono font-bold text-muted hover:text-accent flex items-center gap-1 uppercase tracking-wider">
              Ver tudo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {eventosHoje.map((evento) => {
              const inicio = new Date(evento.inicio);
              const fim = evento.fim ? new Date(evento.fim) : null;
              return (
                <div
                  key={evento.id}
                  className="flex gap-3 p-3 rounded-lg bg-surface hover:bg-surface-hover border-l-2 transition-colors"
                  style={{ borderColor: evento.projeto?.cor || "var(--accent)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary truncate">{evento.titulo}</p>
                    <p className="font-mono text-[10px] text-muted mt-0.5">
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
              <p className="text-xs font-mono py-4 text-center text-muted">
                Nenhum compromisso marcado para hoje
              </p>
            )}
          </div>
        </div>

        {/* ── Tarefas do dia ───────────────────────── */}
        <div className="card p-6 animate-fade-in-up-delay-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-xl font-light text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              Tarefas ({tarefasHoje.length})
            </h2>
            <Link href="/tarefas" className="text-xs font-mono font-bold text-muted hover:text-accent flex items-center gap-1 uppercase tracking-wider">
              Ver tudo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {tarefasHoje.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTarefa(t.id, t.status)}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-surface hover:bg-surface-hover border border-dashed border-border/40 transition-colors cursor-pointer"
              >
                <Circle
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    t.prioridade === "urgente"
                      ? "text-danger"
                      : t.prioridade === "alta"
                      ? "text-warning"
                      : "text-muted"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-primary truncate block">{t.titulo}</span>
                  {t.projeto && (
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: t.projeto.cor }}>
                      {t.projeto.nome}
                    </span>
                  )}
                </div>
                {t.prioridade === "urgente" && (
                  <Zap className="w-3.5 h-3.5 flex-shrink-0 text-danger" />
                )}
              </div>
            ))}

            {tarefasConcluidasHoje.map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTarefa(t.id, t.status)}
                className="flex items-center gap-3 py-1.5 px-3 rounded-lg opacity-40 cursor-pointer hover:opacity-75 transition-opacity"
              >
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-accent" />
                <span className="text-xs line-through text-muted truncate">
                  {t.titulo}
                </span>
              </div>
            ))}

            {tarefasHoje.length === 0 && tarefasConcluidasHoje.length === 0 && (
              <p className="text-xs font-mono py-4 text-center text-muted">
                Nenhuma tarefa pendente para hoje
              </p>
            )}
          </div>
        </div>

        {/* ── Vídeos prioritários ──────────────────── */}
        <div className="card p-6 animate-fade-in-up-delay-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-xl font-light text-primary flex items-center gap-2">
              <Video className="w-4 h-4 text-accent" />
              Vídeos Ativos ({videosAtivos.length})
            </h2>
            <Link href="/pipeline" className="text-xs font-mono font-bold text-muted hover:text-accent flex items-center gap-1 uppercase tracking-wider">
              Ver tudo <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {videosAtivos.slice(0, 4).map((v) => {
              const ultimoEv = v.ultimoEvento ? new Date(v.ultimoEvento) : new Date(v.criadoEm);
              const diasParado = Math.floor((Date.now() - ultimoEv.getTime()) / (1000 * 60 * 60 * 24));
              const travado = diasParado >= 3;

              return (
                <Link
                  key={v.id}
                  href={`/pipeline/${v.id}`}
                  className="block p-3 rounded-lg bg-surface hover:bg-surface-hover border-l-2 border-border transition-all"
                  style={{
                    borderColor: v.projeto?.cor || "var(--accent)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-primary truncate">{v.titulo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="badge badge-neutral text-[9px]">
                          {FORMATO_LABELS[v.formato] || v.formato}
                        </span>
                        <span className="badge badge-accent-subtle text-[9px]">
                          {ESTAGIO_LABELS[v.estagio] || v.estagio}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {travado && (
                        <span className="badge badge-danger text-[9px] mb-1">
                          {diasParado}d parado
                        </span>
                      )}
                      <div className="flex items-center gap-1 font-mono text-[10px] text-muted">
                        {v.aguardando === "cliente" || v.aguardando === "aprovacao" ? (
                          <Users className="w-3 h-3 text-muted" />
                        ) : (
                          <User className="w-3 h-3 text-muted" />
                        )}
                        {AGUARDANDO_LABELS[v.aguardando || "eu"]}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {videosAtivos.length === 0 && (
              <p className="text-xs font-mono py-4 text-center text-muted">
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
      className="card p-5 flex flex-col justify-between gap-2"
      style={
        accent
          ? {
              // Estado de alerta: no VIA o acento é a cor do texto, então o
              // destaque tem de vir da semântica, não do acento.
              borderColor: "var(--danger)",
              background: "var(--danger-subtle)",
            }
          : {}
      }
    >
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p
        className="font-heading text-4xl font-light tracking-tighter mt-1"
        style={{ color: accent ? "var(--danger)" : "var(--text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}
