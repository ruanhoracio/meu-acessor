"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Check, Loader2, Edit3 } from "lucide-react";
import { ModalPortal } from "@/components/modals/modal-portal";

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
    <ModalPortal isOpen={isOpen && !!tarefa}>
      {/* Container Fixo na Tela Alinhado ao Topo Visível (Red Box Position) */}
      <div className="fixed inset-0 z-[999999] flex items-start justify-center pt-8 sm:pt-16 px-4 pb-12 bg-black/70 backdrop-blur-md overflow-y-auto">
        {/* Card do Modal */}
        <div className="card w-full max-w-md p-6 bg-card shadow-2xl relative rounded-2xl animate-fade-in max-h-[85vh] overflow-y-auto border border-border">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="font-heading text-xl font-bold mb-1 text-primary flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-accent" />
            Editar Tarefa
          </h2>
          <p className="text-xs text-muted mb-5">
            Altere as informações, projeto, prioridade ou apague a tarefa.
          </p>

          <form onSubmit={handleSalvar} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-secondary block mb-1">Título da Tarefa</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="input w-full font-semibold text-sm"
                placeholder="Ex: Ajustar áudio do vídeo"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-secondary block mb-1">Cliente / Projeto</label>
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
                <label className="text-xs font-bold text-secondary block mb-1">Prioridade</label>
                <select
                  value={prioridade}
                  onChange={(e) => setPrioridade(e.target.value)}
                  className="input w-full text-xs font-semibold"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-secondary block mb-1">Prazo</label>
                <input
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="input w-full text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input w-full text-xs font-semibold"
                >
                  <option value="aberta">Pendente</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <button
                type="button"
                onClick={handleExcluir}
                disabled={excluindo}
                className="px-3 py-2 text-xs font-bold text-danger hover:bg-danger-subtle rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {excluindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Excluir</span>
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
