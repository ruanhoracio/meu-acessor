"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Check, Loader2, Edit3, Clapperboard } from "lucide-react";

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
  const [estagio, setEstagio] = useState("briefing");
  const [formato, setFormato] = useState("vsl");
  const [prazo, setPrazo] = useState("");
  const [estimativaHoras, setEstimativaHoras] = useState("4");
  const [aguardando, setAguardando] = useState("eu");
  const [linkBruto, setLinkBruto] = useState("");
  const [linkEntrega, setLinkEntrega] = useState("");

  const [projetos, setProjetos] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Buscar projetos do DB
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
      setEstagio(video.estagio || "briefing");
      setFormato(video.formato || "vsl");
      setEstimativaHoras(String(video.estimativaHoras || 4));
      setAguardando(video.aguardando || "eu");
      setLinkBruto(video.linkBruto || "");
      setLinkEntrega(video.linkEntrega || "");

      if (video.prazoEntrega) {
        const d = new Date(video.prazoEntrega);
        // Formatar para datetime-local input YYYY-MM-DDTHH:mm
        const formatted = d.toISOString().slice(0, 16);
        setPrazo(formatted);
      } else {
        setPrazo("");
      }
    }
  }, [isOpen, video]);

  if (!isOpen || !video) return null;

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
          estagio,
          formato,
          prazoEntrega: prazo || null,
          estimativaHoras: Number(estimativaHoras) || 4,
          aguardando,
          linkBruto: linkBruto.trim() || null,
          linkEntrega: linkEntrega.trim() || null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-lg p-6 bg-white shadow-2xl relative rounded-2xl animate-fade-in my-auto max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-gray-500 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-heading text-xl font-bold mb-1 text-gray-900 flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-accent" />
          Editar Vídeo
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
              className="input w-full font-semibold"
              placeholder="Ex: VSL do produto novo"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Cliente / Projeto</label>
              <select
                value={projetoId}
                onChange={(e) => setProjetoId(e.target.value)}
                className="input w-full"
              >
                <option value="">Nenhum (Sem cliente)</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.tipo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Estágio no Pipeline</label>
              <select
                value={estagio}
                onChange={(e) => setEstagio(e.target.value)}
                className="input w-full font-bold text-accent"
              >
                <option value="briefing">📋 BRIEFING</option>
                <option value="cortando">✂️ EDITANDO</option>
                <option value="revisao">🔍 EDITADO</option>
                <option value="entregue">🚀 ENVIADO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Formato</label>
              <select
                value={formato}
                onChange={(e) => setFormato(e.target.value)}
                className="input w-full"
              >
                <option value="reels">Reels / Shorts</option>
                <option value="vsl">VSL</option>
                <option value="criativo">Criativo Ads</option>
                <option value="aula">Aula</option>
                <option value="institucional">Institucional</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Aguardando por quem?</label>
              <select
                value={aguardando}
                onChange={(e) => setAguardando(e.target.value)}
                className="input w-full"
              >
                <option value="eu">🙋🏼‍♂️ Mim (Eu)</option>
                <option value="cliente">🤝 Cliente</option>
                <option value="gravacao">🎥 Gravação</option>
                <option value="aprovacao">✅ Aprovação</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Prazo de Entrega</label>
              <input
                type="datetime-local"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="input w-full"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Horas Estimadas</label>
              <input
                type="number"
                value={estimativaHoras}
                onChange={(e) => setEstimativaHoras(e.target.value)}
                className="input w-full"
                min="1"
                max="40"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Link do Material Bruto</label>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={linkBruto}
              onChange={(e) => setLinkBruto(e.target.value)}
              className="input w-full text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Link da Entrega Final</label>
            <input
              type="url"
              placeholder="https://frame.io/... ou Drive"
              value={linkEntrega}
              onChange={(e) => setLinkEntrega(e.target.value)}
              className="input w-full text-xs"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleExcluir}
              disabled={excluindo}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {excluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Apagar Vídeo
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost text-xs py-2.5 px-4 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="btn-primary text-xs py-2.5 px-6 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
