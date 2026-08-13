"use client";

import { useState, useEffect, useTransition } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calendar,
  User,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Film,
  ArrowRight,
  Filter,
  Target,
  Edit3,
} from "lucide-react";
import {
  getEntregasMensais,
  toggleVideoConcluido,
  criarVideoEntrega,
  excluirVideoEntrega,
  atualizarMetaCliente,
} from "@/actions/entregas";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const FORMATOS = [
  { value: "reels", label: "Reels / TikTok", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "vsl", label: "VSL", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "criativo", label: "Criativo Ads", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "aula", label: "Aula / Youtube", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "institucional", label: "Institucional", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "outro", label: "Corte / Outro", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

export default function ControleEntregasPage() {
  const dataHoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState<number>(dataHoje.getMonth() + 1); // 1-12
  const [anoSelecionado, setAnoSelecionado] = useState<number>(dataHoje.getFullYear());
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>("todos");

  const [videos, setVideos] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Meta de vídeos
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput] = useState<number>(10);
  const [salvandoMeta, setSalvandoMeta] = useState(false);

  // Form de novo vídeo
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoFormato, setNovoFormato] = useState("outro");
  const [novoConcluido, setNovoConcluido] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);

  // Carrega lista ao mudar os filtros
  const recarregarDados = async () => {
    setCarregando(true);
    const res = await getEntregasMensais(
      projetoSelecionado,
      mesSelecionado,
      anoSelecionado
    );
    if (res.success) {
      setVideos(res.videos);
      setProjetos(res.projetos);

      if (projetoSelecionado !== "todos") {
        const projAtual = res.projetos.find((p: any) => p.id === projetoSelecionado);
        if (projAtual) setMetaInput(projAtual.metaVideosMensal || 10);
      }
    }
    setCarregando(false);
  };

  useEffect(() => {
    recarregarDados();
  }, [mesSelecionado, anoSelecionado, projetoSelecionado]);

  // Salvar Meta do Cliente
  const handleSalvarMeta = async () => {
    if (projetoSelecionado === "todos" || salvandoMeta) return;
    setSalvandoMeta(true);
    const res = await atualizarMetaCliente(projetoSelecionado, Number(metaInput));
    setSalvandoMeta(false);
    if (res.success) {
      setEditandoMeta(false);
      recarregarDados();
    }
  };

  // Alternar checkbox concluído
  const handleToggle = (id: string, estadoAtual: boolean) => {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              concluido: !estadoAtual,
            }
          : v
      )
    );

    startTransition(async () => {
      await toggleVideoConcluido(id, !estadoAtual);
    });
  };

  // Adicionar novo vídeo
  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;

    const res = await criarVideoEntrega({
      titulo: novoTitulo,
      projetoId: projetoSelecionado !== "todos" ? projetoSelecionado : null,
      formato: novoFormato,
      mes: mesSelecionado,
      ano: anoSelecionado,
      concluido: novoConcluido,
    });

    if (res.success) {
      setNovoTitulo("");
      recarregarDados();
    }
  };

  // Excluir vídeo
  const handleExcluir = async (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    startTransition(async () => {
      await excluirVideoEntrega(id);
    });
  };

  // Copiar resumo formatado para o cliente
  const handleCopiarResumo = () => {
    const nomeProjeto =
      projetoSelecionado === "todos"
        ? "Todos os Clientes"
        : projetos.find((p) => p.id === projetoSelecionado)?.nome || "Cliente";
    const nomeMes = MESES[mesSelecionado - 1];

    const concluidosCount = videos.filter(
      (v) => v.estagio === "entregue" || v.estagio === "aprovado"
    ).length;

    let texto = `🎬 *Relatório de Vídeos - ${nomeMes}/${anoSelecionado}*\n📌 *Cliente:* ${nomeProjeto}\n📊 *Progresso:* ${concluidosCount}/${metaTotal} concluídos\n\n`;

    videos.forEach((v) => {
      const isDone = v.estagio === "entregue" || v.estagio === "aprovado";
      texto += `${isDone ? "✅" : "⏳"} ${v.titulo}\n`;
    });

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  // Projeto selecionado objeto
  const projetoAtualObj = projetos.find((p) => p.id === projetoSelecionado);

  // Meta total configurada para o cliente (ou total de vídeos inseridos se não houver meta)
  const metaTotal = projetoSelecionado === "todos"
    ? videos.length
    : (projetoAtualObj?.metaVideosMensal || 10);

  const concluidosCount = videos.filter(
    (v) => v.concluido === true || v.estagio === "entregue" || v.estagio === "aprovado"
  ).length;

  const percentual = metaTotal > 0 ? Math.min(100, Math.round((concluidosCount / metaTotal) * 100)) : 0;

  const projetoAtualNome =
    projetoSelecionado === "todos"
      ? "Geral de Clientes"
      : projetoAtualObj?.nome || "Cliente";

  return (
    <div className="animate-fade-in-up space-y-6 max-w-5xl mx-auto pb-16">
      {/* ── Topo & Filtros ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Film className="w-7 h-7 text-accent" />
            Controle de Vídeos Entregues
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Selecione o cliente, defina a meta mensal e marque os vídeos concluídos.
          </p>
        </div>

        <button
          onClick={handleCopiarResumo}
          disabled={videos.length === 0}
          className="btn-primary text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02] transition-all"
        >
          {copiado ? (
            <>
              <Check className="w-4 h-4 text-green-300" />
              <span>Resumo Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copiar Resumo WhatsApp</span>
            </>
          )}
        </button>
      </div>

      {/* ── Barra de Seleção de Cliente e Mês ───────────────────────── */}
      <div className="card p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-zinc-800 shadow-xs flex flex-wrap items-center gap-3">
        {/* Filtro Cliente */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <User className="w-4 h-4 text-accent flex-shrink-0" />
          <select
            value={projetoSelecionado}
            onChange={(e) => setProjetoSelecionado(e.target.value)}
            className="input w-full py-2.5 text-xs font-bold rounded-xl border-gray-200 dark:border-zinc-700 cursor-pointer bg-gray-50/50 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
          >
            <option value="todos">🌐 Todos os Clientes</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                👤 {p.nome} (Meta: {p.metaVideosMensal || 10} vídeos/mês)
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Mês */}
        <div className="flex items-center gap-2 flex-1 min-w-[150px]">
          <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(Number(e.target.value))}
            className="input w-full py-2.5 text-xs font-bold rounded-xl border-gray-200 dark:border-zinc-700 cursor-pointer bg-gray-50/50 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
          >
            {MESES.map((m, idx) => (
              <option key={idx} value={idx + 1}>
                📅 {m}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Ano */}
        <div className="flex items-center gap-2 min-w-[100px]">
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(Number(e.target.value))}
            className="input py-2.5 text-xs font-bold rounded-xl border-gray-200 dark:border-zinc-700 cursor-pointer bg-gray-50/50 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {/* ── Banner de Progresso & Ajuste de Meta Mensal ───────────── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="font-heading text-lg md:text-xl font-bold tracking-tight flex items-center gap-2">
              <span>Vídeos de {MESES[mesSelecionado - 1]} — {projetoAtualNome}</span>
            </h2>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              Acompanhamento de contrato e entregas ativas do cliente
            </p>
          </div>

          {/* Controle de Meta do Cliente */}
          <div className="flex items-center gap-3 bg-emerald-950/30 p-2 px-3 rounded-xl border border-white/20 self-start md:self-auto">
            {projetoSelecionado !== "todos" ? (
              !editandoMeta ? (
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Target className="w-4 h-4 text-emerald-300" />
                  <span>Meta do Cliente: <u className="no-underline font-extrabold text-white text-sm px-1.5 py-0.5 bg-white/20 rounded-md">{metaTotal} vídeos/mês</u></span>
                  <button
                    type="button"
                    onClick={() => {
                      setMetaInput(metaTotal);
                      setEditandoMeta(true);
                    }}
                    className="p-1 text-emerald-200 hover:text-white rounded hover:bg-white/10 cursor-pointer"
                    title="Editar quantidade mensal de vídeos deste cliente"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-white">Meta Vídeos/Mês:</span>
                  <input
                    type="number"
                    value={metaInput}
                    onChange={(e) => setMetaInput(Number(e.target.value))}
                    className="w-16 py-1 px-2 text-center font-extrabold text-gray-900 bg-white rounded-lg text-xs"
                    min="1"
                    max="100"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSalvarMeta}
                    disabled={salvandoMeta}
                    className="px-2.5 py-1 bg-white text-emerald-900 hover:bg-emerald-100 rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                  >
                    {salvandoMeta ? "..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoMeta(false)}
                    className="text-xs text-emerald-200 hover:text-white"
                  >
                    X
                  </button>
                </div>
              )
            ) : (
              <span className="text-xs font-semibold text-emerald-100">
                Selecione um cliente para ajustar a meta contratada.
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="font-heading text-xl md:text-2xl font-extrabold tracking-tight">
              {concluidosCount}/{metaTotal} concluídos
            </span>
            <span className="block text-[11px] text-emerald-200 font-bold">
              ({percentual}% da meta atingida)
            </span>
          </div>
        </div>

        {/* Barra de Progresso Animada */}
        <div className="w-full bg-emerald-950/40 h-3 rounded-full overflow-hidden p-0.5 mt-2">
          <div
            className="bg-white h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${percentual}%` }}
          />
        </div>
      </div>

      {/* ── Form Adicionar Novo Vídeo ─────────────────────────────── */}
      <div className="card p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs">
        <form onSubmit={handleAdicionar} className="space-y-3">
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Digite aqui o nome do vídeo (Ex: Corte 1 - Video 2, VSL Nações, Criativo Ads)..."
              className="input w-full py-3.5 px-4 text-sm font-semibold border-gray-300 dark:border-zinc-700 rounded-xl bg-gray-50/50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:border-accent text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-xs"
            />
          </div>

          {/* Opções e Botão na linha inferior */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              {/* Formato */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">Formato:</span>
                <select
                  value={novoFormato}
                  onChange={(e) => setNovoFormato(e.target.value)}
                  className="input py-2 px-3 text-xs font-bold rounded-xl border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 cursor-pointer min-w-[150px]"
                >
                  {FORMATOS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status inicial */}
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-zinc-300 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-zinc-700 transition-all">
                <input
                  type="checkbox"
                  checked={novoConcluido}
                  onChange={(e) => setNovoConcluido(e.target.checked)}
                  className="rounded text-accent focus:ring-accent w-4 h-4 cursor-pointer"
                />
                <span>Marcar como Já Entregue</span>
              </label>
            </div>

            {/* Botão Adicionar */}
            <button
              type="submit"
              disabled={!novoTitulo.trim()}
              className="btn-primary text-xs py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-40 shadow-sm transition-all hover:scale-[1.02] sm:ml-auto w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Vídeo</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Lista / Checklist de Vídeos ──────────────────────────── */}
      <div className="card p-0 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        {carregando ? (
          <div className="p-12 text-center text-gray-400 dark:text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
            <p className="text-xs font-semibold">Carregando vídeos de {MESES[mesSelecionado - 1]}...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-zinc-500">
            <Film className="w-8 h-8 mx-auto mb-2 opacity-40 text-accent" />
            <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Nenhum vídeo cadastrado em {MESES[mesSelecionado - 1]}</p>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Use o campo acima para adicionar os vídeos editados deste mês.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {videos.map((video) => {
              const isDone = video.concluido === true || video.estagio === "entregue" || video.estagio === "aprovado";
              const formatoObj = FORMATOS.find((f) => f.value === video.formato) || FORMATOS[5];

              return (
                <div
                  key={video.id}
                  className={`flex items-center justify-between p-3.5 sm:px-5 transition-all ${
                    isDone
                      ? "bg-gray-50/70 dark:bg-zinc-900/60"
                      : "bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800/80"
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Checkbox interativo */}
                    <button
                      type="button"
                      onClick={() => handleToggle(video.id, isDone)}
                      className="cursor-pointer text-gray-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex-shrink-0"
                    >
                      {isDone ? (
                        <CheckSquare className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-5.5 h-5.5 text-gray-300 dark:text-zinc-600 hover:text-gray-400 dark:hover:text-zinc-400" />
                      )}
                    </button>

                    {/* Título com tachado se concluído */}
                    <span
                      className={`text-sm font-medium truncate ${
                        isDone
                          ? "line-through text-gray-400 dark:text-zinc-500 font-normal"
                          : "font-semibold text-gray-900 dark:text-zinc-100"
                      }`}
                    >
                      {video.titulo}
                    </span>

                    {/* Tag de Formato */}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${formatoObj.color} flex-shrink-0 hidden sm:inline-block`}
                    >
                      {formatoObj.label}
                    </span>

                    {/* Tag de Projeto se "Todos os Clientes" estiver selecionado */}
                    {projetoSelecionado === "todos" && video.projeto && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 flex-shrink-0">
                        {video.projeto.nome}
                      </span>
                    )}
                  </div>

                  {/* Botão Excluir */}
                  <button
                    type="button"
                    onClick={() => handleExcluir(video.id)}
                    className="p-1.5 text-gray-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer ml-2"
                    title="Excluir vídeo do controle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
