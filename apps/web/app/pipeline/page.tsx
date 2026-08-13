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
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { horasParaTexto } from "@/lib/utils";
import { ModalEditarVideo } from "@/components/modals/modal-editar-video";
import { ModalNovo } from "@/components/modals/modal-novo";

const KANBAN_COLUNAS = [
  { key: "briefing", titulo: "📋 BRIEFING", cor: "#6366f1", match: ["briefing"] },
  { key: "cortando", titulo: "✂️ EDITANDO", cor: "#ff5a3d", match: ["material_recebido", "cortando"] },
  { key: "revisao", titulo: "🔍 EDITADO", cor: "#f59e0b", match: ["primeiro_corte", "revisao", "ajustes"] },
  { key: "entregue", titulo: "🚀 ENVIADO", cor: "#10b981", match: ["aprovado", "entregue"] },
];

const FORMATO_LABELS: Record<string, string> = {
  reels: "Reels",
  vsl: "VSL",
  criativo: "Criativo",
  aula: "Aula",
  institucional: "Institucional",
  outro: "Outro",
};

export default function PipelineKanbanPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoParaEditar, setVideoParaEditar] = useState<any | null>(null);
  const [modalNovoOpen, setModalNovoOpen] = useState(false);

  const carregarVideos = async () => {
    try {
      const res = await fetch("/api/videos", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
      if (Array.isArray(res)) setVideos(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarVideos();
    const interval = setInterval(carregarVideos, 4000);
    const onFocus = () => carregarVideos();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleMoverEstagio = async (videoId: string, novoEstagio: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const estagioVal = e.target.value;

    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, estagio: estagioVal } : v))
    );

    try {
      await fetch(`/api/videos/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estagio: estagioVal }),
      });
      carregarVideos();
    } catch (err) {
      console.error("Erro ao mover vídeo:", err);
    }
  };

  const handleExcluirVideo = async (videoId: string, titulo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Tem certeza que deseja APAGAR o vídeo "${titulo}"?`)) {
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
      carregarVideos();
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6 pb-12">
      {/* Modais */}
      <ModalEditarVideo
        isOpen={!!videoParaEditar}
        video={videoParaEditar}
        onClose={() => setVideoParaEditar(null)}
        onSaved={carregarVideos}
        onDeleted={carregarVideos}
      />

      <ModalNovo
        isOpen={modalNovoOpen}
        onClose={() => setModalNovoOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            Pipeline de Vídeos
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            4 estágios simples: Briefing ➔ Editando ➔ Editado ➔ Enviado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregarVideos}
            className="p-2 rounded-xl border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Atualizar vídeos"
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
            Novo Vídeo
          </button>
        </div>
      </div>

      {/* Kanban board — 4 Colunas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {KANBAN_COLUNAS.map((col) => {
          const videosCol = videos.filter((v) => col.match.includes(v.estagio));

          return (
            <div
              key={col.key}
              className="flex flex-col bg-gray-50/70 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-gray-200 dark:border-zinc-800/80 min-h-[420px]"
            >
              {/* Header da coluna */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-zinc-800 px-1">
                <h3 className="text-xs font-bold tracking-wider" style={{ color: col.cor }}>
                  {col.titulo}
                </h3>
                <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-gray-700 dark:text-zinc-300">
                  {videosCol.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {videosCol.map((video) => {
                  const criadoEm = new Date(video.criadoEm);
                  const ultimoEv = video.ultimoEvento ? new Date(video.ultimoEvento) : criadoEm;
                  const diasParado = Math.floor((Date.now() - ultimoEv.getTime()) / (1000 * 60 * 60 * 24));
                  const travado = diasParado >= 3;

                  return (
                    <div
                      key={video.id}
                      onClick={() => setVideoParaEditar(video)}
                      className="card p-4 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-gray-400 dark:hover:border-zinc-700 transition-all shadow-xs cursor-pointer group relative"
                      style={
                        travado
                          ? { borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.08)" }
                          : {}
                      }
                    >
                      {/* Top Bar: Cliente + Formato */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: video.projeto?.cor || "#ff5a3d" }}
                          />
                          <span className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 truncate max-w-[120px]">
                            {video.projeto?.nome || "Sem cliente"}
                          </span>
                        </div>
                        <span className="badge badge-neutral text-[9px] font-bold dark:bg-zinc-800 dark:text-zinc-300">
                          {FORMATO_LABELS[video.formato] || video.formato}
                        </span>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-3 leading-snug">
                        {video.titulo}
                      </p>

                      {/* Quick Stage Selector on Card */}
                      <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={video.estagio}
                          onChange={(e) => handleMoverEstagio(video.id, video.estagio, e)}
                          className="w-full text-[11px] font-bold py-1 px-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <option value="briefing">📋 BRIEFING</option>
                          <option value="cortando">✂️ EDITANDO</option>
                          <option value="revisao">🔍 EDITADO</option>
                          <option value="entregue">🚀 ENVIADO</option>
                        </select>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400 pt-2 border-t border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          {video.prazoEntrega && (
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-gray-400" />
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

                        {/* Card Buttons: Editar e Apagar */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVideoParaEditar(video);
                            }}
                            className="p-1 rounded hover:bg-gray-100 text-gray-600 cursor-pointer"
                            title="Editar vídeo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleExcluirVideo(video.id, video.titulo, e)}
                            className="p-1 rounded hover:bg-red-50 text-red-500 cursor-pointer"
                            title="Apagar vídeo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Alerta de Vídeo Parado */}
                      {travado && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-red-600">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{diasParado} dias parado neste estágio</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {videosCol.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs font-medium">
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
