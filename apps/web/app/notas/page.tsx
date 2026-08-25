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
          <div className="fixed inset-0 z-[999999] flex items-stretch sm:items-center justify-center sm:p-6 bg-black/60 backdrop-blur-md">
            <div className="bg-card w-full h-full sm:h-[92vh] sm:max-w-3xl sm:rounded-2xl shadow-elevated border border-border flex flex-col overflow-hidden">
              {/* Barra superior */}
              <div className="flex items-center justify-between gap-3 px-5 sm:px-7 h-16 border-b border-border flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted truncate">
                    {notaEditando ? "Editar Nota" : "Nova Nota"}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-ghost py-2 px-3.5 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    form="form-nota"
                    disabled={salvando}
                    className="btn-primary py-2 px-5 text-xs"
                  >
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface transition-colors cursor-pointer"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Área de escrita: título e corpo sem moldura, ocupando a tela */}
              <form
                id="form-nota"
                onSubmit={handleSalvar}
                className="flex-1 min-h-0 flex flex-col"
              >
                <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-7 py-6">
                  <input
                    type="text"
                    placeholder="Título"
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none font-heading text-2xl sm:text-3xl font-semibold text-primary placeholder:text-faint mb-1"
                    autoFocus
                  />
                  <p className="font-mono text-[10px] uppercase tracking-wider text-faint mb-5">
                    {new Date().toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <textarea
                    placeholder="Comece a escrever..."
                    value={formConteudo}
                    onChange={(e) => setFormConteudo(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none resize-none text-[15px] leading-7 text-secondary placeholder:text-faint min-h-[45vh]"
                    required
                  />
                </div>

                {/* Rodapé com os metadados, fora do caminho de quem escreve */}
                <div className="flex-shrink-0 border-t border-border px-5 sm:px-7 py-3 flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    placeholder="tags: ideia, roteiro"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="input flex-1 min-w-[160px] text-xs py-2"
                  />
                  <select
                    value={formProjetoId}
                    onChange={(e) => setFormProjetoId(e.target.value)}
                    className="input w-auto min-w-[150px] text-xs py-2"
                  >
                    <option value="">Nenhum cliente</option>
                    {projetos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                  {notaEditando && (
                    <button
                      type="button"
                      onClick={handleExcluir}
                      className="ml-auto p-2 text-danger hover:bg-danger-subtle rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hide-mobile">Excluir</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}
