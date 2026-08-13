"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Check, Loader2, Edit3, Clapperboard } from "lucide-react";
import { ModalPortal } from "@/components/modals/modal-portal";

interface ModalEditarVideoProps {
  isOpen: boolean;
  video: any | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export function ModalEditarVideo({
  isOpen,
  video,
  onClose,
  onSaved,
  onDeleted,
}: ModalEditarVideoProps) {
  const [titulo, setTitulo] = useState("");
  const [projetoId, setProjetoId] = useState("");
  const [formato, setFormato] = useState("vsl");
  const [estagio, setEstagio] = useState("briefing");
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [estimativaHoras, setEstimativaHoras] = useState("4");
  const [driveUrl, setDriveUrl] = useState("");
  const [instrucoes, setInstrucoes] = useState("");

  const [projetos, setProjetos] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/projetos")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setProjetos(data);
        })
        .catch(() => {});
    }

    if (video) {
      setTitulo(video.titulo || "");
      setProjetoId(video.projetoId || "");
      setFormato(video.formato || "vsl");
      setEstagio(video.estagio || "briefing");
      setEstimativaHoras(String(video.estimativaHoras || 4));
      setDriveUrl(video.driveUrl || "");
      setInstrucoes(video.instrucoes || "");

      if (video.prazoEntrega) {
        const d = new Date(video.prazoEntrega);
        const formatted = d.toISOString().slice(0, 10);
        setPrazoEntrega(formatted);
      } else {
        setPrazoEntrega("");
      }
    }
  }, [isOpen, video]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || salvando) return;

    setSalvando(true);
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          projetoId: projetoId || null,
          formato,
          estagio,
          prazoEntrega: prazoEntrega ? new Date(`${prazoEntrega}T18:00:00.000Z`).toISOString() : null,
          estimativaHoras: Number(estimativaHoras) || 4,
          driveUrl: driveUrl.trim() || null,
          instrucoes: instrucoes.trim() || null,
        }),
      });

      if (res.ok) {
        onSaved();
        onClose();
      }
    } catch (e) {
      console.error("Erro ao salvar vídeo:", e);
    }
    setSalvando(false);
  };

  const handleExcluir = async () => {
    if (!confirm(`Tem certeza que deseja APAGAR o vídeo "${video.titulo}"?`)) return;

    setExcluindo(true);
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (onDeleted) onDeleted();
        else onSaved();
        onClose();
      }
    } catch (e) {
      console.error("Erro ao apagar vídeo:", e);
    }
    setExcluindo(false);
  };

  return (
    <ModalPortal isOpen={isOpen && !!video}>
      {/* Container Fixo na Tela Alinhado ao Topo Visível (Red Box Position) */}
      <div className="fixed inset-0 z-[999999] flex items-start justify-center pt-8 sm:pt-16 px-4 pb-12 bg-black/70 backdrop-blur-md overflow-y-auto">
        {/* Card do Modal */}
        <div className="card w-full max-w-lg p-6 bg-white dark:bg-zinc-900 shadow-2xl relative rounded-2xl animate-fade-in max-h-[85vh] overflow-y-auto border border-gray-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-gray-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="font-heading text-xl font-bold mb-1 text-gray-900 flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-accent" />
            Editar Vídeo do Pipeline
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Atualize os detalhes, altere o cliente, mude de estágio ou apague este vídeo.
          </p>

          <form onSubmit={handleSalvar} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Título do Vídeo</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="input w-full font-semibold text-sm"
                placeholder="Ex: VSL de Vendas 2026"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Cliente / Projeto</label>
                <select
                  value={projetoId}
                  onChange={(e) => setProjetoId(e.target.value)}
                  className="input w-full text-xs font-semibold"
                >
                  <option value="">Nenhum (Sem cliente)</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Formato</label>
                <select
                  value={formato}
                  onChange={(e) => setFormato(e.target.value)}
                  className="input w-full text-xs font-semibold"
                >
                  <option value="vsl">VSL</option>
                  <option value="reels">Reels / Shorts</option>
                  <option value="criativo">Criativo Ad</option>
                  <option value="aula">Aula / Curso</option>
                  <option value="institucional">Institucional</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Estágio do Pipeline</label>
                <select
                  value={estagio}
                  onChange={(e) => setEstagio(e.target.value)}
                  className="input w-full text-xs font-semibold"
                >
                  <option value="briefing">Briefing</option>
                  <option value="roteiro">Roteiro</option>
                  <option value="gravação">Gravação</option>
                  <option value="edicao">Edição</option>
                  <option value="revisao">Revisão</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="entregue">Entregue</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Prazo de Entrega</label>
                <input
                  type="date"
                  value={prazoEntrega}
                  onChange={(e) => setPrazoEntrega(e.target.value)}
                  className="input w-full text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Link da Pasta (Drive / Dropbox)</label>
              <input
                type="url"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                className="input w-full text-xs font-semibold"
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
              <button
                type="button"
                onClick={handleExcluir}
                disabled={excluindo}
                className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {excluindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Excluir Vídeo</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost text-xs py-2 px-4 cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {salvando ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
