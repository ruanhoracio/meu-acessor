"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Check, Loader2, Edit3 } from "lucide-react";

interface ModalEditarTarefaProps {
  isOpen: boolean;
  tarefa: any | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ModalEditarTarefa({
  isOpen,
  tarefa,
  onClose,
  onSaved,
}: ModalEditarTarefaProps) {
  const [titulo, setTitulo] = useState("");
  const [projetoId, setProjetoId] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [prazo, setPrazo] = useState("");
  const [status, setStatus] = useState("aberta");

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

    if (tarefa) {
      setTitulo(tarefa.titulo || "");
      setProjetoId(tarefa.projetoId || "");
      setPrioridade(tarefa.prioridade || "media");
      setStatus(tarefa.status || "aberta");

      if (tarefa.prazo) {
        const d = new Date(tarefa.prazo);
        const formatted = d.toISOString().slice(0, 10);
        setPrazo(formatted);
      } else {
        setPrazo("");
      }
    }
  }, [isOpen, tarefa]);

  if (!isOpen || !tarefa) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || salvando) return;

    setSalvando(true);
    try {
      const res = await fetch(`/api/tarefas/${tarefa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          projetoId: projetoId || null,
          prioridade,
          prazo: prazo ? new Date(`${prazo}T18:00:00.000Z`).toISOString() : null,
          status,
        }),
      });

      if (res.ok) {
        onSaved();
        onClose();
      }
    } catch (e) {
      console.error("Erro ao salvar tarefa:", e);
    }
    setSalvando(false);
  };

  const handleExcluir = async () => {
    if (!confirm(`Tem certeza que deseja APAGAR a tarefa "${tarefa.titulo}"?`)) return;

    setExcluindo(true);
    try {
      const res = await fetch(`/api/tarefas/${tarefa.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onSaved();
        onClose();
      }
    } catch (e) {
      console.error("Erro ao apagar tarefa:", e);
    }
    setExcluindo(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
      <div className="card w-full max-w-md p-6 bg-white shadow-elevated relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-gray-500 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-heading text-xl font-bold mb-1 text-gray-900 flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-accent" />
          Editar Tarefa
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          Altere as informações, projeto, prioridade ou apague a tarefa.
        </p>

        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Título da Tarefa</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="input w-full font-semibold"
              placeholder="Ex: Ajustar áudio do vídeo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value)}
                className="input w-full"
              >
                <option value="urgente">🚨 Urgente</option>
                <option value="alta">⚡ Alta</option>
                <option value="media">🔹 Média</option>
                <option value="baixa">☕ Baixa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Data do Prazo</label>
              <input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="input w-full"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input w-full font-bold"
              >
                <option value="aberta">⏳ Aberta</option>
                <option value="concluida">✅ Concluída</option>
              </select>
            </div>
          </div>

          {/* Ações */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleExcluir}
              disabled={excluindo}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {excluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Apagar Tarefa
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
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
