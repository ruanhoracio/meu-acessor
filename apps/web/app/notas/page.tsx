"use client";

import { useState, useEffect } from "react";
import { Search, FileText, Tag, Plus, X, Trash2 } from "lucide-react";
import { ModalPortal } from "@/components/modals/modal-portal";

export default function NotasPage() {
  const [notas, setNotas] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [tagAtiva, setTagAtiva] = useState<string | null>(null);

  // Modal criar/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [notaEditando, setNotaEditando] = useState<any>(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formConteudo, setFormConteudo] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formProjetoId, setFormProjetoId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const recarregar = async () => {
    try {
      const res = await fetch("/api/notas");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setNotas(data);
      }
    } catch (e) {
      console.error("Erro ao carregar notas:", e);
    }
    try {
      const res = await fetch("/api/projetos");
      if (res.ok) setProjetos(await res.json());
    } catch (e) {}
    setCarregando(false);
  };

  useEffect(() => {
    recarregar();
  }, []);

  const abrirNova = () => {
    setNotaEditando(null);
    setFormTitulo("");
    setFormConteudo("");
    setFormTags("");
    setFormProjetoId("");
    setModalOpen(true);
  };

  const abrirEdicao = (nota: any) => {
    setNotaEditando(nota);
    setFormTitulo(nota.titulo || "");
    setFormConteudo(nota.conteudo || "");
    setFormTags((nota.tags || []).join(", "));
    setFormProjetoId(nota.projetoId || "");
    setModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConteudo.trim()) return;
    setSalvando(true);

    const payload = {
      titulo: formTitulo,
      conteudo: formConteudo,
      tags: formTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      projetoId: formProjetoId || null,
    };

    try {
      const res = notaEditando
        ? await fetch(`/api/notas/${notaEditando.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/notas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (res.ok) {
        setModalOpen(false);
        recarregar();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    if (!notaEditando) return;
    setNotas((prev) => prev.filter((n) => n.id !== notaEditando.id));
    setModalOpen(false);
    try {
      await fetch(`/api/notas/${notaEditando.id}`, { method: "DELETE" });
      recarregar();
    } catch (err) {
      console.error(err);
    }
  };

  const todasTags = Array.from(new Set(notas.flatMap((n) => n.tags || [])));

  const notasFiltradas = notas.filter((n) => {
    if (tagAtiva && !(n.tags || []).includes(tagAtiva)) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (
        (n.titulo?.toLowerCase().includes(q) ?? false) ||
        (n.conteudo?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in-up space-y-6 max-w-5xl mx-auto pb-16">
      {/* Busca + Tags */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input pl-10 text-xs font-mono"
          />
        </div>
        {todasTags.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Tag className="w-4 h-4 flex-shrink-0 text-muted" />
            {todasTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagAtiva(tagAtiva === tag ? null : tag)}
                className={`badge cursor-pointer whitespace-nowrap ${
                  tagAtiva === tag ? "badge-accent" : "badge-neutral"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {carregando ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nota nova */}
          <button
            onClick={abrirNova}
            className="card p-6 flex flex-col items-center justify-center gap-3 border-dashed cursor-pointer transition-all min-h-[160px] hover:border-accent"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-subtle border border-border">
              <Plus className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
              Nova nota
            </span>
          </button>

          {notasFiltradas.map((nota) => (
            <div
              key={nota.id}
              onClick={() => abrirEdicao(nota)}
              className="card p-5 cursor-pointer transition-all hover:border-accent rounded-xl"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <h3 className="font-heading text-base font-light text-primary truncate">
                    {nota.titulo || "Sem título"}
                  </h3>
                </div>
                {nota.projeto && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                    style={{ background: nota.projeto.cor }}
                    title={nota.projeto.nome}
                  />
                )}
              </div>

              <p className="text-xs text-secondary leading-relaxed mb-3 line-clamp-4 font-mono whitespace-pre-wrap">
                {nota.conteudo}
              </p>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-dashed border-border">
                <span className="text-muted font-mono text-[10px]">
                  {new Date(nota.atualizadoEm || nota.criadoEm).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <div className="flex items-center gap-1">
                  {(nota.tags || []).map((tag: string) => (
                    <span key={tag} className="badge badge-neutral text-[9px] font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {notasFiltradas.length === 0 && (
            <div className="card p-8 flex items-center justify-center text-xs text-muted font-mono min-h-[160px]">
              Nenhuma nota encontrada.
            </div>
          )}
        </div>
      )}

      {/* Modal Criar / Editar Nota */}
      <ModalPortal isOpen={modalOpen}>
        {modalOpen && (
          <div className="fixed inset-0 z-[999999] flex items-start justify-center pt-8 sm:pt-16 px-4 pb-12 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="card p-6 w-full max-w-lg bg-card border border-dashed border-border shadow-elevated relative rounded-2xl max-h-[85vh] overflow-y-auto">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-muted hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-heading text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                {notaEditando ? "Editar Nota" : "Nova Nota"}
              </h3>

              <form onSubmit={handleSalvar} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">
                    Título (opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ideia de roteiro..."
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    className="input w-full font-semibold"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">
                    Conteúdo:
                  </label>
                  <textarea
                    placeholder="Escreva sua nota..."
                    value={formConteudo}
                    onChange={(e) => setFormConteudo(e.target.value)}
                    className="input w-full min-h-[140px] resize-y font-mono text-xs leading-relaxed"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-secondary block mb-1">
                      Tags (separadas por vírgula):
                    </label>
                    <input
                      type="text"
                      placeholder="ideia, roteiro, cliente"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      className="input w-full text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary block mb-1">
                      Vincular ao Cliente (opcional):
                    </label>
                    <select
                      value={formProjetoId}
                      onChange={(e) => setFormProjetoId(e.target.value)}
                      className="input w-full text-xs"
                    >
                      <option value="">Nenhum (Geral)</option>
                      {projetos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border">
                  {notaEditando ? (
                    <button
                      type="button"
                      onClick={handleExcluir}
                      className="p-2 text-danger hover:bg-danger-subtle rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir</span>
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="btn-neutral py-2 px-4 text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvando}
                      className="btn-primary py-2 px-5 text-xs font-bold"
                    >
                      {salvando ? "Salvando..." : "Salvar Nota"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}
