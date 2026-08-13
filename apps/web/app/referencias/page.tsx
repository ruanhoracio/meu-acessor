"use client";

import { useState, useEffect } from "react";
import {
  ExternalLink,
  Tag,
  Plus,
  Play,
  Palette,
  Sparkles,
  Layers,
  Type,
  BookOpen,
  Bookmark,
  X,
  Trash2,
} from "lucide-react";
import { ModalPortal } from "@/components/modals/modal-portal";

const TAG_ICONS: Record<string, React.ReactNode> = {
  "transição": <Layers className="w-3 h-3" />,
  "hook": <Sparkles className="w-3 h-3" />,
  "storytelling": <BookOpen className="w-3 h-3" />,
  "color": <Palette className="w-3 h-3" />,
  "motion": <Play className="w-3 h-3" />,
  "tipografia": <Type className="w-3 h-3" />,
};

const GRADIENT_BG = [
  "linear-gradient(135deg, rgba(198, 249, 31, 0.1) 0%, rgba(5, 8, 10, 0.8) 100%)",
  "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(5, 8, 10, 0.8) 100%)",
  "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(5, 8, 10, 0.8) 100%)",
  "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 8, 10, 0.8) 100%)",
];

export default function ReferenciasPage() {
  const [referencias, setReferencias] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tagAtiva, setTagAtiva] = useState<string | null>(null);

  // Modal criar/editar
  const [modalOpen, setModalOpen] = useState(false);
  const [refEditando, setRefEditando] = useState<any>(null);
  const [formUrl, setFormUrl] = useState("");
  const [formTitulo, setFormTitulo] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formObservacao, setFormObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const recarregar = async () => {
    try {
      const res = await fetch("/api/referencias");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setReferencias(data);
      }
    } catch (e) {
      console.error("Erro ao carregar referências:", e);
    }
    setCarregando(false);
  };

  useEffect(() => {
    recarregar();
  }, []);

  const abrirNova = () => {
    setRefEditando(null);
    setFormUrl("");
    setFormTitulo("");
    setFormTags("");
    setFormObservacao("");
    setModalOpen(true);
  };

  const abrirEdicao = (ref: any) => {
    setRefEditando(ref);
    setFormUrl(ref.url || "");
    setFormTitulo(ref.titulo || "");
    setFormTags((ref.tags || []).join(", "));
    setFormObservacao(ref.observacao || "");
    setModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUrl.trim()) return;
    setSalvando(true);

    const payload = {
      url: formUrl,
      titulo: formTitulo,
      tags: formTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      observacao: formObservacao,
    };

    try {
      const res = refEditando
        ? await fetch(`/api/referencias/${refEditando.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/referencias", {
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
    if (!refEditando) return;
    setReferencias((prev) => prev.filter((r) => r.id !== refEditando.id));
    setModalOpen(false);
    try {
      await fetch(`/api/referencias/${refEditando.id}`, { method: "DELETE" });
      recarregar();
    } catch (err) {
      console.error(err);
    }
  };

  const todasTags = Array.from(new Set(referencias.flatMap((r) => r.tags || [])));

  const refsFiltradas = tagAtiva
    ? referencias.filter((r) => (r.tags || []).includes(tagAtiva))
    : referencias;

  return (
    <div className="animate-fade-in-up space-y-6 max-w-6xl mx-auto pb-16">
      {/* Tags */}
      {todasTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Tag className="w-4 h-4 flex-shrink-0 text-muted" />
          <button
            onClick={() => setTagAtiva(null)}
            className={`badge cursor-pointer whitespace-nowrap ${!tagAtiva ? "badge-accent" : "badge-neutral"}`}
          >
            Todas
          </button>
          {todasTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagAtiva(tagAtiva === tag ? null : tag)}
              className={`badge cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                tagAtiva === tag ? "badge-accent" : "badge-neutral"
              }`}
            >
              {TAG_ICONS[tag]}
              {tag}
            </button>
          ))}
        </div>
      )}

      {carregando ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Adicionar referência */}
          <button
            onClick={abrirNova}
            className="card p-8 flex flex-col items-center justify-center gap-3 border-dashed cursor-pointer transition-all min-h-[200px] hover:border-[#c6f91f]"
          >
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#c6f91f]/10 border border-[#c6f91f]/30">
              <Plus className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
              Salvar referência
            </span>
          </button>

          {refsFiltradas.map((ref, i) => (
            <div
              key={ref.id}
              onClick={() => abrirEdicao(ref)}
              className="card overflow-hidden cursor-pointer transition-all hover:border-[#c6f91f] group rounded-xl"
            >
              {/* Thumbnail placeholder */}
              <div
                className="h-36 relative flex items-center justify-center border-b border-dashed border-border"
                style={{ background: GRADIENT_BG[i % GRADIENT_BG.length] }}
              >
                <div className="text-center px-4">
                  <Play className="w-10 h-10 mx-auto mb-2 opacity-30 group-hover:opacity-80 transition-opacity text-[#c6f91f]" />
                  <p className="text-xs font-mono text-muted truncate max-w-[200px]">
                    {ref.url}
                  </p>
                </div>
              </div>

              {/* Conteúdo */}
              <div className="p-4">
                <h3 className="font-heading text-base font-light text-primary mb-1">
                  {ref.titulo || "Sem título"}
                </h3>
                {ref.observacao && (
                  <p className="text-xs text-secondary mb-3 line-clamp-2">{ref.observacao}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {(ref.tags || []).map((tag: string) => (
                      <span key={tag} className="badge badge-neutral text-[9px] font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 text-muted hover:text-accent transition-colors"
                    title="Abrir link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}

          {refsFiltradas.length === 0 && (
            <div className="card p-8 flex items-center justify-center text-xs text-muted font-mono min-h-[200px]">
              Nenhuma referência salva ainda.
            </div>
          )}
        </div>
      )}

      {/* Modal Criar / Editar Referência */}
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
                <Bookmark className="w-5 h-5 text-accent" />
                {refEditando ? "Editar Referência" : "Salvar Referência"}
              </h3>

              <form onSubmit={handleSalvar} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">
                    URL do vídeo / link:
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="input w-full text-xs font-mono"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">
                    Título:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Transição incrível de zoom"
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    className="input w-full font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">
                    Tags (separadas por vírgula):
                  </label>
                  <input
                    type="text"
                    placeholder="hook, transição, motion"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="input w-full text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">
                    Observação (o que tem de bom aqui?):
                  </label>
                  <textarea
                    placeholder="Ex: usar esse estilo de corte no próximo vídeo do Petron..."
                    value={formObservacao}
                    onChange={(e) => setFormObservacao(e.target.value)}
                    className="input w-full min-h-[80px] resize-y text-xs leading-relaxed"
                  />
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-border">
                  {refEditando ? (
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
                      {salvando ? "Salvando..." : "Salvar"}
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
