"use client";

import { use, useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  User,
  Users,
  Camera,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  FileText,
  Timer,
  ChevronRight,
  Trash2,
  Edit3,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { horasParaTexto } from "@/lib/utils";
import { ModalEditarVideo } from "@/components/modals/modal-editar-video";

const KANBAN_STAGES = [
  { key: "briefing", label: "BRIEFING" },
  { key: "cortando", label: "EDITANDO" },
  { key: "revisao", label: "EDITADO" },
  { key: "entregue", label: "ENVIADO" },
];

export default function VideoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [video, setVideo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);

  const carregarVideo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/videos/${id}`).then((r) => r.json()).catch(() => null);
      if (res && res.id) setVideo(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    carregarVideo();
  }, [id]);

  const handleMoverEstagio = async (novoEstagio: string) => {
    if (!video) return;
    setVideo({ ...video, estagio: novoEstagio });
    try {
      await fetch(`/api/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estagio: novoEstagio }),
      });
      carregarVideo();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExcluirVideo = async () => {
    if (!video || !confirm(`Tem certeza que deseja APAGAR o vídeo "${video.titulo}"?`)) return;
    try {
      await fetch(`/api/videos/${id}`, { method: "DELETE" });
      router.push("/pipeline");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="card p-12 text-center flex flex-col items-center justify-center gap-2 animate-fade-in-up">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <p className="text-xs text-muted">Carregando vídeo do Supabase...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="card p-12 text-center space-y-4 animate-fade-in-up">
        <p className="text-sm font-semibold text-secondary">Vídeo não encontrado</p>
        <Link href="/pipeline" className="btn-primary inline-flex text-xs px-4 py-2">
          Voltar ao Pipeline
        </Link>
      </div>
    );
  }

  const estagioIdx = KANBAN_STAGES.findIndex((s) => s.key === video.estagio);

  return (
    <div className="animate-fade-in-up max-w-4xl space-y-6 pb-12">
      {/* Modal Editar */}
      <ModalEditarVideo
        isOpen={modalEditarOpen}
        video={video}
        onClose={() => setModalEditarOpen(false)}
        onSaved={carregarVideo}
        onDeleted={() => router.push("/pipeline")}
      />

      {/* Voltar */}
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Pipeline
      </Link>

      {/* Header com botões Editar e Apagar */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: video.projeto?.cor || "#ff5a3d" }}
            />
            <span className="text-sm font-bold" style={{ color: video.projeto?.cor || "#ff5a3d" }}>
              {video.projeto?.nome || "Sem cliente"}
            </span>
            <span className="badge badge-neutral text-xs capitalize">{video.formato || "Vídeo"}</span>
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-primary">
            {video.titulo}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalEditarOpen(true)}
            className="btn-primary flex items-center gap-1.5 text-xs py-2.5 px-5 cursor-pointer shadow-xs"
          >
            <Edit3 className="w-4 h-4" />
            Editar Detalhes
          </button>

          <button
            type="button"
            onClick={handleExcluirVideo}
            className="px-4 py-2.5 rounded-full border border-danger/30 text-danger hover:bg-danger-subtle text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Apagar Vídeo
          </button>
        </div>
      </div>

      {/* Estágios — Mudar Estágio com 1 Clique */}
      <div className="card p-6">
        <h2 className="font-heading text-base font-semibold tracking-tight mb-4 text-primary">
          Progresso no Pipeline (Clique para alterar estágio)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {KANBAN_STAGES.map((stg, i) => {
            const isCurrent = video.estagio === stg.key;
            const isDone = i < estagioIdx;

            return (
              <button
                key={stg.key}
                onClick={() => handleMoverEstagio(stg.key)}
                className={`p-3 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border ${
                  isCurrent
                    ? "bg-accent text-white border-accent shadow-md"
                    : isDone
                    ? "bg-success-subtle text-success border-success/30 hover:bg-success-subtle"
                    : "bg-surface text-secondary border-border hover:bg-surface-hover"
                }`}
              >
                {stg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade de Detalhes e Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-heading text-base font-semibold tracking-tight text-primary border-b pb-2">
            Informações do Projeto
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted">Cliente/Projeto:</span>
              <span className="font-bold text-primary">{video.projeto?.nome || "Sem cliente"}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted">Prazo de entrega:</span>
              <span className="font-bold text-primary">
                {video.prazoEntrega
                  ? new Date(video.prazoEntrega).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : "Sem prazo"}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted">Estimativa de horas:</span>
              <span className="font-bold text-primary">
                {video.estimativaHoras ? horasParaTexto(video.estimativaHoras) : "—"}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted">Aguardando por:</span>
              <span className="font-bold text-primary capitalize">{video.aguardando || "eu"}</span>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="card p-6 space-y-4">
          <h2 className="font-heading text-base font-semibold tracking-tight text-primary border-b pb-2">
            Links do Projeto
          </h2>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-surface flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary">Material Bruto:</span>
              {video.linkBruto ? (
                <a
                  href={video.linkBruto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                >
                  Abrir Link <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-xs text-muted">Não informado</span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-surface flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary">Entrega Final:</span>
              {video.linkEntrega ? (
                <a
                  href={video.linkEntrega}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                >
                  Abrir Link <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-xs text-muted">Não informado</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
