"use client";

import { useState, useEffect } from "react";
import {
  User,
  Users,
  Camera,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import {
  ESTAGIOS_KANBAN,
  ESTAGIO_LABELS,
  FORMATO_LABELS,
  AGUARDANDO_LABELS,
} from "@/lib/mock-data";
import { horasParaTexto } from "@/lib/utils";

const AGUARDANDO_ICONS: Record<string, React.ReactNode> = {
  eu: <User className="w-3 h-3" />,
  cliente: <Users className="w-3 h-3" />,
  gravacao: <Camera className="w-3 h-3" />,
  aprovacao: <ShieldCheck className="w-3 h-3" />,
};

export default function PipelinePage() {
  const [videos, setVideos] = useState<any[]>([]);

  const carregar = async () => {
    try {
      const resVideos = await fetch("/api/videos").then((r) => r.json()).catch(() => []);
      if (Array.isArray(resVideos)) setVideos(resVideos);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div className="animate-fade-in-up">
      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-6" style={{ scrollSnapType: "x mandatory" }}>
        {ESTAGIOS_KANBAN.map((estagio) => {
          const videosCol = videos.filter((v) => v.estagio === estagio);

          return (
            <div
              key={estagio}
              className="kanban-column flex-shrink-0"
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    {ESTAGIO_LABELS[estagio]}
                  </h3>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: "var(--bg-surface)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {videosCol.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-3 min-h-[220px]">
                {videosCol.map((video) => {
                  const criadoEm = new Date(video.criadoEm);
                  const ultimoEv = video.ultimoEvento ? new Date(video.ultimoEvento) : criadoEm;
                  const diasParado = Math.floor((Date.now() - ultimoEv.getTime()) / (1000 * 60 * 60 * 24));
                  const travado = diasParado >= 3;

                  return (
                    <Link
                      key={video.id}
                      href={`/pipeline/${video.id}`}
                      className="kanban-card block relative"
                      style={
                        travado
                          ? {
                              borderColor: "var(--danger)",
                              background: "rgba(239, 68, 68, 0.04)",
                            }
                          : {}
                      }
                    >
                      {/* Client color bar */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: video.projeto?.cor || "var(--accent)" }}
                          />
                          <span className="text-[11px] font-bold" style={{ color: video.projeto?.cor || "var(--text-muted)" }}>
                            {video.projeto?.nome || "Sem cliente"}
                          </span>
                        </div>
                        <span className="badge badge-neutral text-[10px]">
                          {FORMATO_LABELS[video.formato] || video.formato}
                        </span>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                        {video.titulo}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-muted)" }}>
                        <div className="flex items-center gap-3">
                          {video.prazoEntrega && (
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {new Date(video.prazoEntrega).toLocaleDateString("pt-BR", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                          {video.estimativaHoras && (
                            <span className="font-semibold">{horasParaTexto(video.estimativaHoras)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {video.rodadasAlteracao > 0 && (
                            <span
                              className="flex items-center gap-0.5 font-bold"
                              style={{
                                color: video.rodadasAlteracao >= 3 ? "var(--danger)" : "var(--text-muted)",
                              }}
                            >
                              <RotateCcw className="w-3 h-3" />
                              {video.rodadasAlteracao}
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-medium">
                            {AGUARDANDO_ICONS[video.aguardando || "eu"]}
                            {AGUARDANDO_LABELS[video.aguardando || "eu"]}
                          </span>
                        </div>
                      </div>

                      {/* Travado badge */}
                      {travado && (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--danger)" }}>
                          <AlertTriangle className="w-3 h-3" />
                          <span>{diasParado} dias parado neste estágio</span>
                        </div>
                      )}
                    </Link>
                  );
                })}

                {videosCol.length === 0 && (
                  <div
                    className="rounded-2xl border-2 border-dashed p-8 flex items-center justify-center text-xs font-medium"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Vazio
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
