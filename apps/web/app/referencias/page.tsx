"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Link2,
  Plus,
  Search,
  Star,
  ExternalLink,
  Globe,
  Trash2,
  Edit3,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Pencil,
  Sparkles,
} from "lucide-react";
import { ModalPortal } from "@/components/modals/modal-portal";
import {
  listarLinks,
  salvarLink,
  excluirLink,
  alternarFavoritoLink,
  inspecionarLink,
  renomearColecao,
  excluirColecao,
} from "@/actions/links";

// Mesmo valor de actions/links.ts — arquivo "use server" não pode exportar constante
const COLECAO_PADRAO = "Geral";

interface LinkUtil {
  id: string;
  url: string;
  titulo: string | null;
  descricao: string | null;
  colecao: string | null;
  favorito: boolean;
  ordem: number;
}

function dominioDe(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function faviconDe(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${dominioDe(url)}&sz=64`;
}

export default function LinksUteisPage() {
  const [links, setLinks] = useState<LinkUtil[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());

  // Modal de link
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ url: "", titulo: "", descricao: "", colecao: COLECAO_PADRAO });
  const [novaColecaoNoForm, setNovaColecaoNoForm] = useState(false);
  const [inspecionando, setInspecionando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Renomear coleção
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");

  const carregar = async () => {
    const res = await listarLinks();
    if (res.success) setLinks(res.links);
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  // ── Agrupamento por coleção (favoritos primeiro dentro de cada uma) ──
  const colecoes = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const mapa = new Map<string, LinkUtil[]>();
    for (const l of links) {
      if (q && ![l.titulo, l.descricao, l.url, l.colecao].some((c) => c?.toLowerCase().includes(q))) continue;
      const nome = l.colecao || COLECAO_PADRAO;
      if (!mapa.has(nome)) mapa.set(nome, []);
      mapa.get(nome)!.push(l);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => Number(b.favorito) - Number(a.favorito) || a.ordem - b.ordem);
    }
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [links, busca]);

  const nomesColecoes = useMemo(
    () => Array.from(new Set(links.map((l) => l.colecao || COLECAO_PADRAO))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [links]
  );

  const favoritos = useMemo(() => links.filter((l) => l.favorito), [links]);

  // ── Ações ─────────────────────────────────────────────────────
  const abrirNovo = (colecao?: string) => {
    setEditandoId(null);
    setForm({ url: "", titulo: "", descricao: "", colecao: colecao || nomesColecoes[0] || COLECAO_PADRAO });
    setNovaColecaoNoForm(nomesColecoes.length === 0);
    setErroForm(null);
    setModalOpen(true);
  };

  const abrirEdicao = (l: LinkUtil) => {
    setEditandoId(l.id);
    setForm({ url: l.url, titulo: l.titulo || "", descricao: l.descricao || "", colecao: l.colecao || COLECAO_PADRAO });
    setNovaColecaoNoForm(false);
    setErroForm(null);
    setModalOpen(true);
  };

  // Ao sair do campo de URL, puxa título e descrição do próprio site
  const handleInspecionar = async () => {
    const url = form.url.trim();
    if (!url || inspecionando || (form.titulo && form.descricao)) return;
    setInspecionando(true);
    const r = await inspecionarLink(url);
    setInspecionando(false);
    if (r.success) {
      setForm((f) => ({
        ...f,
        titulo: f.titulo || r.titulo,
        descricao: f.descricao || r.descricao,
      }));
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;
    setErroForm(null);
    setSalvando(true);
    const atual = links.find((l) => l.id === editandoId);
    const res = await salvarLink({
      id: editandoId || undefined,
      url: form.url,
      titulo: form.titulo,
      descricao: form.descricao,
      colecao: form.colecao,
      favorito: atual?.favorito,
    });
    setSalvando(false);
    if (!res.success) {
      setErroForm(res.error || "Não foi possível salvar.");
      return;
    }
    setModalOpen(false);
    carregar();
  };

  const handleExcluir = async (l: LinkUtil) => {
    if (!confirm(`Remover "${l.titulo || dominioDe(l.url)}"?`)) return;
    setLinks((prev) => prev.filter((x) => x.id !== l.id));
    await excluirLink(l.id);
  };

  const handleFavorito = async (l: LinkUtil) => {
    setLinks((prev) => prev.map((x) => (x.id === l.id ? { ...x, favorito: !x.favorito } : x)));
    await alternarFavoritoLink(l.id, !l.favorito);
  };

  const alternarRecolhida = (nome: string) => {
    setRecolhidas((atual) => {
      const n = new Set(atual);
      if (n.has(nome)) n.delete(nome);
      else n.add(nome);
      return n;
    });
  };

  const confirmarRenomear = async (de: string) => {
    const para = novoNome.trim();
    setRenomeando(null);
    if (!para || para === de) return;
    setLinks((prev) => prev.map((l) => ((l.colecao || COLECAO_PADRAO) === de ? { ...l, colecao: para } : l)));
    await renomearColecao(de, para);
  };

  const handleExcluirColecao = async (nome: string, qtd: number) => {
    if (!confirm(`Apagar a coleção "${nome}" e os ${qtd} link(s) dentro dela?`)) return;
    setLinks((prev) => prev.filter((l) => (l.colecao || COLECAO_PADRAO) !== nome));
    await excluirColecao(nome);
  };

  // ── Card de link ───────────────────────────────────────────────
  const CardLink = ({ l }: { l: LinkUtil }) => (
    <div className="card p-0 group flex flex-col overflow-hidden hover:-translate-y-0.5 transition-transform">
      <a
        href={l.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 px-4 pt-4 pb-3 min-w-0"
        title={l.url}
      >
        <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faviconDe(l.url)}
            alt=""
            className="w-5 h-5"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-primary truncate group-hover:text-accent transition-colors">
            {l.titulo || dominioDe(l.url)}
          </p>
          <p className="text-[11px] text-muted truncate flex items-center gap-1">
            <Globe className="w-3 h-3 flex-shrink-0" />
            {dominioDe(l.url)}
          </p>
        </div>
        {l.favorito && <Star className="w-4 h-4 text-warning flex-shrink-0" fill="currentColor" />}
      </a>
      <div className="px-4 py-2.5 border-t border-border bg-surface/60 flex items-center justify-between gap-2 min-h-[40px]">
        <p className="text-[11px] text-muted truncate flex-1">{l.descricao || " "}</p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            type="button"
            onClick={() => handleFavorito(l)}
            className={`p-1 rounded cursor-pointer ${l.favorito ? "text-warning" : "text-muted hover:text-warning"}`}
            title={l.favorito ? "Tirar dos favoritos" : "Favoritar"}
          >
            <Star className="w-3.5 h-3.5" fill={l.favorito ? "currentColor" : "none"} />
          </button>
          <button type="button" onClick={() => abrirEdicao(l)} className="p-1 rounded text-muted hover:text-accent cursor-pointer" title="Editar">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => handleExcluir(l)} className="p-1 rounded text-muted hover:text-danger cursor-pointer" title="Remover">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <a href={l.url} target="_blank" rel="noreferrer" className="p-1 rounded text-muted hover:text-accent" title="Abrir">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );

  if (carregando) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6 max-w-7xl mx-auto pb-16">
      {/* Topo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-light tracking-tight text-primary flex items-center gap-2">
            <Link2 className="w-6 h-6 text-accent" />
            Links Úteis
          </h1>
          <p className="text-xs text-muted mt-1">
            {links.length} {links.length === 1 ? "link" : "links"} em {nomesColecoes.length}{" "}
            {nomesColecoes.length === 1 ? "coleção" : "coleções"}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar link..."
              className="input pl-9 py-2 text-sm w-48 md:w-64"
            />
          </div>
          <button onClick={() => abrirNovo()} className="btn-primary text-xs py-2.5 px-5 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Novo link
          </button>
        </div>
      </div>

      {/* Favoritos */}
      {favoritos.length > 0 && !busca && (
        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-warning" fill="currentColor" />
            <h2 className="font-heading text-base font-semibold text-primary">Favoritos</h2>
            <span className="font-mono text-[10px] text-muted">{favoritos.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {favoritos.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-surface border border-border hover:border-accent hover:bg-card text-xs font-semibold text-primary transition-colors"
                title={l.url}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={faviconDe(l.url)} alt="" className="w-4 h-4 rounded-sm" />
                {l.titulo || dominioDe(l.url)}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Coleções */}
      {colecoes.length === 0 ? (
        <div className="card p-12 text-center">
          <Link2 className="w-8 h-8 mx-auto mb-3 text-faint" />
          <p className="text-sm font-semibold text-primary">{links.length === 0 ? "Nenhum link ainda" : "Nada encontrado"}</p>
          <p className="text-xs text-muted mt-1 mb-4">
            {links.length === 0
              ? "Guarde os sites e ferramentas que você usa no dia a dia, organizados em coleções."
              : "Tente outra busca."}
          </p>
          {links.length === 0 && (
            <button onClick={() => abrirNovo()} className="btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" /> Adicionar o primeiro
            </button>
          )}
        </div>
      ) : (
        colecoes.map(([nome, lista]) => {
          const recolhida = recolhidas.has(nome);
          return (
            <section key={nome} className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-4 group/col">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => alternarRecolhida(nome)}
                    className="p-0.5 rounded text-muted hover:text-primary cursor-pointer"
                    aria-label={recolhida ? "Expandir" : "Recolher"}
                  >
                    {recolhida ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {renomeando === nome ? (
                    <input
                      type="text"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      onBlur={() => confirmarRenomear(nome)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmarRenomear(nome);
                        if (e.key === "Escape") setRenomeando(null);
                      }}
                      className="input py-1 px-2 text-base font-semibold w-56"
                      autoFocus
                    />
                  ) : (
                    <h2 className="font-heading text-base font-semibold text-primary truncate">{nome}</h2>
                  )}
                  <span className="font-mono text-[10px] text-muted">{lista.length}</span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity">
                  <button type="button" onClick={() => abrirNovo(nome)} className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface cursor-pointer" title="Adicionar link aqui">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenomeando(nome);
                      setNovoNome(nome);
                    }}
                    className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-surface cursor-pointer"
                    title="Renomear coleção"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => handleExcluirColecao(nome, lista.length)} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-subtle cursor-pointer" title="Apagar coleção">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!recolhida && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {lista.map((l) => (
                    <CardLink key={l.id} l={l} />
                  ))}
                  <button
                    type="button"
                    onClick={() => abrirNovo(nome)}
                    className="rounded-2xl border border-dashed border-border hover:border-accent hover:bg-surface text-muted hover:text-accent flex items-center justify-center gap-2 text-xs font-semibold min-h-[104px] transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
              )}
            </section>
          );
        })
      )}

      {/* Modal */}
      <ModalPortal isOpen={modalOpen}>
        {modalOpen && (
          <div className="fixed inset-0 z-[999999] flex items-start justify-center pt-8 sm:pt-16 px-4 pb-12 bg-black/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-card w-full max-w-lg rounded-2xl shadow-elevated border border-border p-6 relative">
              <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 right-4 p-1 rounded-lg text-muted hover:text-primary cursor-pointer" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-heading text-lg font-semibold text-primary mb-5 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-accent" />
                {editandoId ? "Editar link" : "Novo link"}
              </h3>

              <form onSubmit={handleSalvar} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">Link</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="url"
                      value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                      onBlur={handleInspecionar}
                      placeholder="cole o endereço do site"
                      className="input text-sm pr-9"
                      required
                      autoFocus
                    />
                    {inspecionando && <Loader2 className="w-4 h-4 animate-spin text-muted absolute right-3 top-1/2 -translate-y-1/2" />}
                  </div>
                  <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Título e descrição são puxados do site automaticamente.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">Título</label>
                  <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Ranking de Criativos" className="input text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1">Descrição (opcional)</label>
                  <input type="text" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Uma linha sobre o que é" className="input text-sm" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-secondary">Coleção</label>
                    {nomesColecoes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setNovaColecaoNoForm((v) => !v);
                          setForm({ ...form, colecao: novaColecaoNoForm ? nomesColecoes[0] : "" });
                        }}
                        className="text-[11px] font-semibold text-accent hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <FolderPlus className="w-3 h-3" />
                        {novaColecaoNoForm ? "Escolher existente" : "Nova coleção"}
                      </button>
                    )}
                  </div>
                  {novaColecaoNoForm ? (
                    <input type="text" value={form.colecao} onChange={(e) => setForm({ ...form, colecao: e.target.value })} placeholder="Ex: Tráfego 2026, IAs, Conteúdo" className="input text-sm" required />
                  ) : (
                    <select value={form.colecao} onChange={(e) => setForm({ ...form, colecao: e.target.value })} className="input text-sm">
                      {nomesColecoes.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                {erroForm && <p className="text-xs font-semibold text-danger">{erroForm}</p>}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost py-2 px-4 text-xs">Cancelar</button>
                  <button type="submit" disabled={salvando} className="btn-primary py-2 px-5 text-xs disabled:opacity-60">
                    {salvando ? "Salvando..." : editandoId ? "Salvar" : "Adicionar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}
