"use client";

import { useState, useEffect } from "react";
import { X, Clapperboard, CheckSquare, Plus } from "lucide-react";
import { criarVideo } from "@/actions/videos";
import { criarTarefa } from "@/actions/tarefas";

export function ModalNovo({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tipo, setTipo] = useState<"video" | "tarefa">("video");
  const [titulo, setTitulo] = useState("");
  const [projetoId, setProjetoId] = useState("");
  const [formato, setFormato] = useState<any>("vsl");
  const [prazo, setPrazo] = useState("");
  const [estimativaHoras, setEstimativaHoras] = useState("4");
  const [prioridade, setPrioridade] = useState<any>("alta");
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/projetos")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setProjetos(data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setLoading(true);
    if (tipo === "video") {
      await criarVideo({
        titulo,
        projetoId: projetoId || undefined,
        formato,
        prazoEntrega: prazo || undefined,
        estimativaHoras: Number(estimativaHoras) || 4,
      });
    } else {
      await criarTarefa({
        titulo,
        projetoId: projetoId || undefined,
        prazo: prazo || undefined,
        prioridade,
      });
    }

    setLoading(false);
    setTitulo("");
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
      <div className="card w-full max-w-lg p-6 relative bg-white shadow-elevated">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-heading text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          Criar Novo
        </h2>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-surface)] rounded-2xl">
          <button
            type="button"
            onClick={() => setTipo("video")}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              tipo === "video" ? "bg-white shadow-xs text-black" : "text-gray-500"
            }`}
          >
            <Clapperboard className="w-4 h-4" />
            Vídeo
          </button>
          <button
            type="button"
            onClick={() => setTipo("tarefa")}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              tipo === "tarefa" ? "bg-white shadow-xs text-black" : "text-gray-500"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Tarefa
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Título</label>
            <input
              type="text"
              placeholder={tipo === "video" ? "ex: VSL do produto novo" : "ex: Revisar corte final"}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Cliente / Projeto</label>
              <select
                value={projetoId}
                onChange={(e) => setProjetoId(e.target.value)}
                className="input"
              >
                <option value="">Nenhum (Sem cliente)</option>
                {projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            {tipo === "video" ? (
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Formato</label>
                <select
                  value={formato}
                  onChange={(e) => setFormato(e.target.value)}
                  className="input"
                >
                  <option value="reels">Reels / Shorts</option>
                  <option value="vsl">VSL</option>
                  <option value="criativo">Criativo Ads</option>
                  <option value="aula">Aula</option>
                  <option value="institucional">Institucional</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Prioridade</label>
                <select
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value)}
                  className="input"
                >
                  <option value="urgente">🚨 Urgente</option>
                  <option value="alta">⚡ Alta</option>
                  <option value="media">🔹 Média</option>
                  <option value="baixa">☕ Baixa</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Prazo</label>
              <input
                type="datetime-local"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="input"
              />
            </div>

            {tipo === "video" && (
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Horas estimadas</label>
                <input
                  type="number"
                  value={estimativaHoras}
                  onChange={(e) => setEstimativaHoras(e.target.value)}
                  className="input"
                  min="1"
                  max="40"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost text-xs py-2.5 px-4">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary text-xs py-2.5 px-5 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              {loading ? "Criando..." : `Criar ${tipo === "video" ? "Vídeo" : "Tarefa"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
