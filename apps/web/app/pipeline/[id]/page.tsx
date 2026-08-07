"use client";

import { use } from "react";
import {
  ArrowLeft,
  Clock,
  User,
  Users,
  Camera,
  ShieldCheck,
  RotateCcw,
  Play,
  ExternalLink,
  FileText,
  Timer,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  VIDEOS,
  ESTAGIO_LABELS,
  FORMATO_LABELS,
  AGUARDANDO_LABELS,
  NOTAS,
} from "@/lib/mock-data";
import { horasParaTexto } from "@/lib/utils";

const ESTAGIOS_TIMELINE = [
  "briefing",
  "material_recebido",
  "cortando",
  "primeiro_corte",
  "revisao",
  "ajustes",
  "aprovado",
  "entregue",
];

export default function VideoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const video = VIDEOS.find((v) => v.id === id) || VIDEOS[0];
  const notasDoVideo = NOTAS.filter((n) => n.videoId === video.id);
  const estagioIdx = ESTAGIOS_TIMELINE.indexOf(video.estagio);
  const diasParado = video.ultimoEvento
    ? Math.floor((Date.now() - video.ultimoEvento.getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((Date.now() - video.criadoEm.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="animate-fade-in-up max-w-4xl">
      {/* Back */}
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Pipeline
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: video.projeto?.cor || "var(--accent)" }}
            />
            <span className="text-sm font-medium" style={{ color: video.projeto?.cor }}>
              {video.projeto?.nome}
            </span>
            <span className="badge badge-neutral">{FORMATO_LABELS[video.formato]}</span>
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            {video.titulo}
          </h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Play className="w-4 h-4" />
            Iniciar Foco
          </button>
        </div>
      </div>

      {/* Estágio timeline */}
      <div className="card p-6 mb-6 animate-fade-in-up-delay-1">
        <h2 className="font-heading text-base font-semibold tracking-tight mb-5">
          Progresso
        </h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {ESTAGIOS_TIMELINE.map((est, i) => {
            const done = i < estagioIdx;
            const current = i === estagioIdx;
            return (
              <div key={est} className="flex items-center gap-1 flex-shrink-0">
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                  style={{
                    background: current
                      ? "var(--accent-subtle)"
                      : done
                      ? "var(--success-subtle)"
                      : "var(--bg-surface)",
                    color: current
                      ? "var(--accent)"
                      : done
                      ? "var(--success)"
                      : "var(--text-muted)",
                    border: current ? "1px solid var(--border-accent)" : "1px solid transparent",
                  }}
                >
                  {ESTAGIO_LABELS[est]}
                </div>
                {i < ESTAGIOS_TIMELINE.length - 1 && (
                  <ChevronRight
                    className="w-3 h-3 flex-shrink-0"
                    style={{ color: done ? "var(--success)" : "var(--border)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info */}
        <div className="card p-6 animate-fade-in-up-delay-2">
          <h2 className="font-heading text-base font-semibold tracking-tight mb-4">
            Detalhes
          </h2>
          <div className="space-y-4">
            <InfoRow
              icon={<Clock className="w-4 h-4" />}
              label="Prazo"
              value={
                video.prazoEntrega
                  ? video.prazoEntrega.toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Sem prazo"
              }
            />
            <InfoRow
              icon={<Timer className="w-4 h-4" />}
              label="Estimativa"
              value={video.estimativaHoras ? horasParaTexto(video.estimativaHoras) : "—"}
            />
            <InfoRow
              icon={<Timer className="w-4 h-4" />}
              label="Horas reais"
              value={video.horasReais ? horasParaTexto(video.horasReais) : "0h"}
            />
            <InfoRow
              icon={
                video.aguardando === "cliente" || video.aguardando === "aprovacao"
                  ? <Users className="w-4 h-4" />
                  : video.aguardando === "gravacao"
                  ? <Camera className="w-4 h-4" />
                  : <User className="w-4 h-4" />
              }
              label="Aguardando"
              value={AGUARDANDO_LABELS[video.aguardando || "eu"]}
            />
            <InfoRow
              icon={<RotateCcw className="w-4 h-4" />}
              label="Rodadas de alteração"
              value={String(video.rodadasAlteracao)}
              alert={video.rodadasAlteracao >= 3}
            />
            <InfoRow
              icon={<Clock className="w-4 h-4" />}
              label="Dias no estágio"
              value={`${diasParado} dias`}
              alert={diasParado >= 3}
            />
          </div>
        </div>

        {/* Links & Notas */}
        <div className="space-y-6">
          {/* Links */}
          <div className="card p-6 animate-fade-in-up-delay-2">
            <h2 className="font-heading text-base font-semibold tracking-tight mb-4">
              Links
            </h2>
            <div className="space-y-2">
              <LinkRow label="Material bruto" url={video.linkBruto} />
              <LinkRow label="Link de entrega" url={video.linkEntrega} />
            </div>
          </div>

          {/* Notas */}
          <div className="card p-6 animate-fade-in-up-delay-3">
            <h2 className="font-heading text-base font-semibold tracking-tight mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: "var(--accent)" }} />
              Notas ({notasDoVideo.length})
            </h2>
            {notasDoVideo.length > 0 ? (
              <div className="space-y-3">
                {notasDoVideo.map((nota) => (
                  <div
                    key={nota.id}
                    className="p-3 rounded-xl"
                    style={{ background: "var(--bg-surface)" }}
                  >
                    <p className="text-sm font-medium mb-1">{nota.titulo}</p>
                    <p className="text-xs whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
                      {nota.conteudo.slice(0, 200)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Nenhuma nota vinculada
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span
        className="text-sm font-medium"
        style={{ color: alert ? "var(--danger)" : "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

function LinkRow({ label, url }: { label: string; url?: string | null }) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-xl"
      style={{ background: "var(--bg-surface)" }}
    >
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm"
          style={{ color: "var(--accent)" }}
        >
          Abrir <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Não adicionado
        </span>
      )}
    </div>
  );
}
