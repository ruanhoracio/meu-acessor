"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Lock,
  Plus,
  Search,
  Copy,
  Check,
  Eye,
  EyeOff,
  Star,
  ExternalLink,
  Globe,
  Trash2,
  Edit3,
  RefreshCw,
  ShieldCheck,
  X,
  Loader2,
} from "lucide-react";
import { ModalPortal } from "@/components/modals/modal-portal";
import {
  obterCofre,
  inicializarCofre,
  salvarItemCofre,
  excluirItemCofre,
  alternarFavoritoCofre,
} from "@/actions/cofre";
import {
  derivarChave,
  cifrar,
  decifrar,
  gerarSalt,
  gerarSenha,
  verificadorDe,
  chaveConfere,
  guardarChave,
  chaveGuardada,
} from "@/lib/cofre-crypto";

const CATEGORIAS = ["Site", "Software", "Financeiro", "Cliente", "Rede social", "Outro"];

interface Segredo {
  url?: string;
  usuario?: string;
  senha?: string;
  notas?: string;
}

interface ItemAberto extends Segredo {
  id: string;
  nome: string;
  categoria: string | null;
  favorito: boolean;
  atualizadoEm: string;
}

function dominioDe(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return null;
  }
}

export default function CofrePage() {
  const [carregando, setCarregando] = useState(true);
  const [chave, setChave] = useState<CryptoKey | null>(null);
  const [primeiroUso, setPrimeiroUso] = useState(false);
  const [salt, setSalt] = useState<string | null>(null);
  const [verificador, setVerificador] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemAberto[]>([]);

  // Desbloqueio
  const [senhaDesbloqueio, setSenhaDesbloqueio] = useState("");
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [erroDesbloqueio, setErroDesbloqueio] = useState<string | null>(null);

  // Lista
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [visiveis, setVisiveis] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", categoria: "Site", url: "", usuario: "", senha: "", notas: "" });
  const [mostrarSenhaForm, setMostrarSenhaForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const abrirComChave = async (k: CryptoKey, brutos: { id: string; nome: string; categoria: string | null; favorito: boolean; cifra: string; atualizadoEm: string }[]) => {
    const abertos: ItemAberto[] = [];
    for (const b of brutos) {
      try {
        const s = await decifrar<Segredo>(k, b.cifra);
        abertos.push({ id: b.id, nome: b.nome, categoria: b.categoria, favorito: b.favorito, atualizadoEm: b.atualizadoEm, ...s });
      } catch {
        // item cifrado com outra chave: mostra sem segredo, em vez de sumir
        abertos.push({ id: b.id, nome: b.nome, categoria: b.categoria, favorito: b.favorito, atualizadoEm: b.atualizadoEm, senha: undefined });
      }
    }
    setItens(abertos);
    setChave(k);
  };

  const carregar = async () => {
    setCarregando(true);
    const info = await obterCofre();
    if (!info.success) {
      setCarregando(false);
      return;
    }
    setSalt(info.salt);
    setVerificador(info.verificador);
    setPrimeiroUso(!info.salt);

    // Chave já na aba (login recente): abre direto
    const k = await chaveGuardada();
    if (k && info.verificador && (await chaveConfere(k, info.verificador))) {
      await abrirComChave(k, info.itens);
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleDesbloquear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (desbloqueando) return;
    setErroDesbloqueio(null);
    setDesbloqueando(true);
    try {
      if (primeiroUso) {
        const novoSalt = gerarSalt();
        const k = await derivarChave(senhaDesbloqueio, novoSalt);
        const v = await verificadorDe(k);
        const res = await inicializarCofre(novoSalt, v);
        if (!res.success) throw new Error(res.error);
        setSalt(novoSalt);
        setVerificador(v);
        setPrimeiroUso(false);
        await guardarChave(k);
        await abrirComChave(k, []);
      } else {
        const k = await derivarChave(senhaDesbloqueio, salt as string);
        if (!(await chaveConfere(k, verificador as string))) {
          setErroDesbloqueio("Senha incorreta.");
          return;
        }
        await guardarChave(k);
        const info = await obterCofre();
        await abrirComChave(k, info.itens);
      }
      setSenhaDesbloqueio("");
    } catch (err: any) {
      setErroDesbloqueio(err?.message || "Não foi possível abrir o cofre.");
    } finally {
      setDesbloqueando(false);
    }
  };

  const copiar = async (texto: string | undefined, rotulo: string) => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(rotulo);
      setTimeout(() => setCopiado((c) => (c === rotulo ? null : c)), 1500);
    } catch {}
  };

  const alternarVisivel = (id: string) => {
    setVisiveis((atual) => {
      const n = new Set(atual);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const abrirNovo = () => {
    setEditandoId(null);
    setForm({ nome: "", categoria: "Site", url: "", usuario: "", senha: "", notas: "" });
    setMostrarSenhaForm(false);
    setErroForm(null);
    setModalOpen(true);
  };

  const abrirEdicao = (item: ItemAberto) => {
    setEditandoId(item.id);
    setForm({
      nome: item.nome,
      categoria: item.categoria || "Outro",
      url: item.url || "",
      usuario: item.usuario || "",
      senha: item.senha || "",
      notas: item.notas || "",
    });
    setMostrarSenhaForm(false);
    setErroForm(null);
    setModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chave || salvando) return;
    setErroForm(null);
    setSalvando(true);
    try {
      const segredo: Segredo = {
        url: form.url.trim() || undefined,
        usuario: form.usuario.trim() || undefined,
        senha: form.senha || undefined,
        notas: form.notas.trim() || undefined,
      };
      const cifra = await cifrar(chave, segredo);
      const atual = itens.find((i) => i.id === editandoId);
      const res = await salvarItemCofre({
        id: editandoId || undefined,
        nome: form.nome,
        categoria: form.categoria,
        favorito: atual?.favorito ?? false,
        cifra,
      });
      if (!res.success) throw new Error(res.error);
      setModalOpen(false);
      const info = await obterCofre();
      await abrirComChave(chave, info.itens);
    } catch (err: any) {
      setErroForm(err?.message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (item: ItemAberto) => {
    if (!confirm(`Apagar o login de "${item.nome}"? Isso não tem volta.`)) return;
    setItens((prev) => prev.filter((i) => i.id !== item.id));
    await excluirItemCofre(item.id);
  };

  const handleFavorito = async (item: ItemAberto) => {
    setItens((prev) =>
      prev
        .map((i) => (i.id === item.id ? { ...i, favorito: !i.favorito } : i))
        .sort((a, b) => Number(b.favorito) - Number(a.favorito) || a.nome.localeCompare(b.nome))
    );
    await alternarFavoritoCofre(item.id, !item.favorito);
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((i) => {
      if (categoriaAtiva && (i.categoria || "Outro") !== categoriaAtiva) return false;
      if (!q) return true;
      return [i.nome, i.usuario, i.url, i.notas, i.categoria].some((c) => c?.toLowerCase().includes(q));
    });
  }, [itens, busca, categoriaAtiva]);

  // ── Carregando ─────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Bloqueado / primeiro uso ───────────────────────────────
  if (!chave) {
    return (
      <div className="animate-fade-in-up max-w-md mx-auto pt-10">
        <div className="card p-8 text-center">
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--accent-gradient)", color: "var(--accent-on)" }}
          >
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-primary mb-1">
            {primeiroUso ? "Criar o seu cofre" : "Cofre bloqueado"}
          </h1>
          <p className="text-sm text-muted mb-6">
            {primeiroUso
              ? "Digite sua senha de login. Ela vira a chave que cifra o cofre — só no seu aparelho."
              : "Digite sua senha de login para abrir. As senhas ficam cifradas e só abrem aqui."}
          </p>

          <form onSubmit={handleDesbloquear} className="space-y-3">
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha de login"
              value={senhaDesbloqueio}
              onChange={(e) => setSenhaDesbloqueio(e.target.value)}
              className="input h-11 text-center"
              autoFocus
              required
            />
            {erroDesbloqueio && (
              <p className="text-xs font-semibold text-danger" role="alert">
                {erroDesbloqueio}
              </p>
            )}
            <button type="submit" disabled={desbloqueando} className="btn-primary h-11 w-full text-sm disabled:opacity-60">
              {desbloqueando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Abrindo...
                </>
              ) : primeiroUso ? (
                "Criar cofre"
              ) : (
                "Abrir cofre"
              )}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-muted flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Cifrado no navegador (AES-256). O servidor não tem a chave.
          </p>
        </div>
      </div>
    );
  }

  // ── Cofre aberto ───────────────────────────────────────────
  return (
    <div className="animate-fade-in-up space-y-6 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-light tracking-tight text-primary flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-accent" />
            Cofre
          </h1>
          <p className="text-xs text-muted mt-1">
            {itens.length} {itens.length === 1 ? "login guardado" : "logins guardados"} · cifrados no seu aparelho
          </p>
        </div>
        <button onClick={abrirNovo} className="btn-primary text-xs py-2.5 px-5 flex items-center gap-1.5 self-start md:self-auto cursor-pointer">
          <Plus className="w-4 h-4" />
          Novo login
        </button>
      </div>

      {/* Busca + categorias */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, usuário, site..."
            className="input pl-10 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategoriaAtiva(null)}
            className={`badge cursor-pointer ${categoriaAtiva === null ? "badge-accent" : "badge-neutral"}`}
          >
            Todos
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoriaAtiva(categoriaAtiva === c ? null : c)}
              className={`badge cursor-pointer ${categoriaAtiva === c ? "badge-accent" : "badge-neutral"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="card p-12 text-center">
          <KeyRound className="w-8 h-8 mx-auto mb-3 text-faint" />
          <p className="text-sm font-semibold text-primary">
            {itens.length === 0 ? "Seu cofre está vazio" : "Nada encontrado"}
          </p>
          <p className="text-xs text-muted mt-1">
            {itens.length === 0 ? "Guarde o primeiro login clicando em “Novo login”." : "Tente outra busca ou categoria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtrados.map((item) => {
            const dominio = dominioDe(item.url);
            const aberto = visiveis.has(item.id);
            return (
              <div key={item.id} className="card p-4 flex flex-col gap-3 group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                    {dominio ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`https://www.google.com/s2/favicons?domain=${dominio}&sz=64`} alt="" className="w-5 h-5" />
                    ) : (
                      <Globe className="w-4 h-4 text-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-primary truncate">{item.nome}</p>
                      {item.categoria && <span className="badge badge-neutral text-[9px] hidden sm:inline-flex">{item.categoria}</span>}
                    </div>
                    {item.url && (
                      <a
                        href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-muted hover:text-accent flex items-center gap-1 truncate"
                      >
                        {dominio || item.url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFavorito(item)}
                    className={`p-1 rounded-lg cursor-pointer transition-colors ${item.favorito ? "text-warning" : "text-faint hover:text-warning"}`}
                    title={item.favorito ? "Tirar dos favoritos" : "Favoritar"}
                  >
                    <Star className="w-4 h-4" fill={item.favorito ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {item.usuario && (
                    <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted w-14 flex-shrink-0">Usuário</span>
                      <span className="text-xs font-medium text-primary truncate flex-1">{item.usuario}</span>
                      <button type="button" onClick={() => copiar(item.usuario, `u:${item.id}`)} className="p-1 text-muted hover:text-accent cursor-pointer" title="Copiar usuário">
                        {copiado === `u:${item.id}` ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted w-14 flex-shrink-0">Senha</span>
                    <span className="font-mono text-xs text-primary truncate flex-1 select-all">
                      {item.senha === undefined ? <span className="text-danger">não abre com esta chave</span> : aberto ? item.senha : "••••••••••••"}
                    </span>
                    <button type="button" onClick={() => alternarVisivel(item.id)} className="p-1 text-muted hover:text-accent cursor-pointer" title={aberto ? "Ocultar" : "Mostrar"}>
                      {aberto ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button type="button" onClick={() => copiar(item.senha, `s:${item.id}`)} className="p-1 text-muted hover:text-accent cursor-pointer" title="Copiar senha">
                      {copiado === `s:${item.id}` ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {item.notas && <p className="text-[11px] text-muted px-1 whitespace-pre-wrap">{item.notas}</p>}
                </div>

                <div className="flex items-center justify-end gap-0.5 -mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => abrirEdicao(item)} className="p-1.5 text-muted hover:text-accent rounded-lg hover:bg-surface cursor-pointer" title="Editar">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => handleExcluir(item)} className="p-1.5 text-muted hover:text-danger rounded-lg hover:bg-danger-subtle cursor-pointer" title="Apagar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal novo / editar */}
      <ModalPortal isOpen={modalOpen}>
        {modalOpen && (
          <div className="fixed inset-0 z-[999999] flex items-start justify-center pt-8 sm:pt-16 px-4 pb-12 bg-black/60 backdrop-blur-md overflow-y-auto">
            <div className="bg-card w-full max-w-lg rounded-2xl shadow-elevated border border-border p-6 relative">
              <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 right-4 p-1 rounded-lg text-muted hover:text-primary cursor-pointer" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-heading text-lg font-semibold text-primary mb-5 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-accent" />
                {editandoId ? "Editar login" : "Novo login"}
              </h3>

              <form onSubmit={handleSalvar} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-secondary block mb-1">Nome</label>
                    <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Google Drive, Adobe, Banco" className="input text-sm" required autoFocus />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary block mb-1">Categoria</label>
                    <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="input text-sm">
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-secondary block mb-1">Site (opcional)</label>
                    <input type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="drive.google.com" className="input text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-secondary block mb-1">Usuário / e-mail</label>
                    <input type="text" autoComplete="off" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} className="input text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-secondary block mb-1">Senha</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={mostrarSenhaForm ? "text" : "password"}
                          autoComplete="new-password"
                          value={form.senha}
                          onChange={(e) => setForm({ ...form, senha: e.target.value })}
                          className="input text-sm font-mono pr-10"
                        />
                        <button type="button" onClick={() => setMostrarSenhaForm((v) => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-primary cursor-pointer">
                          {mostrarSenhaForm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, senha: gerarSenha(16) });
                          setMostrarSenhaForm(true);
                        }}
                        className="btn-neutral text-xs px-3 flex items-center gap-1.5 whitespace-nowrap"
                        title="Gerar senha forte"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Gerar
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-secondary block mb-1">Notas (opcional)</label>
                    <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Pergunta de segurança, PIN, observações..." className="input text-sm min-h-[72px] resize-y" />
                  </div>
                </div>

                {erroForm && <p className="text-xs font-semibold text-danger">{erroForm}</p>}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost py-2 px-4 text-xs">Cancelar</button>
                  <button type="submit" disabled={salvando} className="btn-primary py-2 px-5 text-xs disabled:opacity-60">
                    {salvando ? "Salvando..." : editandoId ? "Salvar" : "Guardar no cofre"}
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
