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
} from "lucide-react";
import {
  getEntregasMensais,
  toggleVideoConcluido,
  criarVideoEntrega,
  excluirVideoEntrega,
} from "@/actions/entregas";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const FORMATOS = [
  { value: "reels", label: "Reels / TikTok", color: "bg-purple-100 text-purple-700" },
  { value: "vsl", label: "VSL", color: "bg-blue-100 text-blue-700" },
  { value: "criativo", label: "Criativo Ads", color: "bg-amber-100 text-amber-700" },
  { value: "aula", label: "Aula / Youtube", color: "bg-emerald-100 text-emerald-700" },
  { value: "institucional", label: "Institucional", color: "bg-indigo-100 text-indigo-700" },
  { value: "outro", label: "Corte / Outro", color: "bg-gray-100 text-gray-700" },
];

export default function ControleEntregasPage() {
  const dataHoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState<number>(dataHoje.getMonth() + 1); // 1-12
  const [anoSelecionado, setAnoSelecionado] = useState<number>(dataHoje.getFullYear());
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>("todos");

  const [videos, setVideos] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

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
    }
    setCarregando(false);
  };

  useEffect(() => {
    recarregarDados();
  }, [mesSelecionado, anoSelecionado, projetoSelecionado]);

  // Alternar checkbox concluído
  const handleToggle = (id: string, estadoAtual: boolean) => {
    // Otimista
    setVideos((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              estagio: !estadoAtual ? "entregue" : "briefing",
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

    let texto = `🎬 *Relatório de Vídeos - ${nomeMes}/${anoSelecionado}*\n📌 *Cliente:* ${nomeProjeto}\n📊 *Progresso:* ${concluidosCount}/${videos.length} concluídos\n\n`;

    videos.forEach((v) => {
      const isDone = v.estagio === "entregue" || v.estagio === "aprovado";
      texto += `${isDone ? "✅" : "⏳"} ${v.titulo}\n`;
    });

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  // Cálculo de progresso
  const totalVideos = videos.length;
  const concluidosCount = videos.filter(
    (v) => v.estagio === "entregue" || v.estagio === "aprovado"
  ).length;
  const percentual = totalVideos > 0 ? Math.round((concluidosCount / totalVideos) * 100) : 0;

  const projetoAtualNome =
    projetoSelecionado === "todos"
      ? "Geral de Clientes"
      : projetos.find((p) => p.id === projetoSelecionado)?.nome || "Cliente";

  return (
    <div className="animate-fade-in-up space-y-6 max-w-5xl mx-auto pb-16">
      {/* ── Topo & Filtros ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Film className="w-7 h-7 text-accent" />
            Controle de Vídeos Editalidos
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Selecione o cliente e o mês para acompanhar os vídeos produzidos e entregues.
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

      {/* ── Barra de Controles (Cliente, Mês, Ano) ───────────────── */}
      <div className="card p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center gap-3">
        {/* Filtro Cliente */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <User className="w-4 h-4 text-accent flex-shrink-0" />
          <select
            value={projetoSelecionado}
            onChange={(e) => setProjetoSelecionado(e.target.value)}
            className="input w-full py-2 text-xs font-semibold rounded-xl border-gray-200 cursor-pointer"
          >
            <option value="todos">🌐 Todos os Clientes</option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id}>
                👤 {p.nome}
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
            className="input w-full py-2 text-xs font-semibold rounded-xl border-gray-200 cursor-pointer"
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
            className="input py-2 text-xs font-semibold rounded-xl border-gray-200 cursor-pointer"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {/* ── Banner de Progresso (Idêntico ao modelo do usuário) ──── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="font-heading text-lg md:text-xl font-bold tracking-tight">
              Vídeos de {MESES[mesSelecionado - 1]} — {projetoAtualNome}
            </h2>
            <p className="text-xs text-emerald-100 font-medium">
              Controle mensal de entregas ativas do cliente
            </p>
          </div>

          <div className="text-right">
            <span className="font-heading text-lg md:text-xl font-extrabold tracking-tight">
              {concluidosCount}/{totalVideos} concluído
            </span>
            <span className="block text-[11px] text-emerald-200 font-bold">
              ({percentual}%)
            </span>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-emerald-950/40 h-2.5 rounded-full overflow-hidden p-0.5">
          <div
            className="bg-white h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${percentual}%` }}
          />
        </div>
      </div>

      {/* ── Adicionar Novo Vídeo ao Controle ────────────────────── */}
      <form onSubmit={handleAdicionar} className="card p-3 bg-gray-50 border border-gray-200/80 rounded-2xl flex flex-wrap md:flex-nowrap items-center gap-2">
        <input
          type="text"
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          placeholder={`+ Adicionar vídeo em ${MESES[mesSelecionado - 1]} (Ex: Corte 1, VSL 2)...`}
          className="input flex-1 py-2.5 px-4 text-xs font-semibold border-gray-200 rounded-xl bg-white"
        />

        <select
          value={novoFormato}
          onChange={(e) => setNovoFormato(e.target.value)}
          className="input py-2.5 text-xs font-semibold rounded-xl border-gray-200 bg-white cursor-pointer"
        >
          {FORMATOS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 px-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={novoConcluido}
            onChange={(e) => setNovoConcluido(e.target.checked)}
            className="rounded text-accent focus:ring-accent w-4 h-4 cursor-pointer"
          />
          <span>Já Entregue</span>
        </label>

        <button
          type="submit"
          disabled={!novoTitulo.trim()}
          className="btn-primary text-xs py-2.5 px-5 rounded-xl flex items-center gap-1.5 font-bold cursor-pointer flex-shrink-0 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar</span>
        </button>
      </form>

      {/* ── Lista / Checklist de Vídeos (Idêntico à Planilha) ──────── */}
      <div className="card p-0 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        {carregando ? (
          <div className="p-12 text-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-accent" />
            <p className="text-xs font-semibold">Carregando controle de {MESES[mesSelecionado - 1]}...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Film className="w-8 h-8 mx-auto mb-2 opacity-40 text-accent" />
            <p className="text-sm font-semibold text-gray-700">Nenhum vídeo cadastrado em {MESES[mesSelecionado - 1]}</p>
            <p className="text-xs text-gray-400 mt-1">Use a barra acima para adicionar o primeiro vídeo deste mês.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {videos.map((video) => {
              const isDone = video.estagio === "entregue" || video.estagio === "aprovado";
              const formatoObj = FORMATOS.find((f) => f.value === video.formato) || FORMATOS[5];

              return (
                <div
                  key={video.id}
                  className={`flex items-center justify-between p-3.5 sm:px-5 transition-all hover:bg-gray-50/80 ${
                    isDone ? "bg-gray-50/50" : "bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Checkbox interativo */}
                    <button
                      type="button"
                      onClick={() => handleToggle(video.id, isDone)}
                      className="cursor-pointer text-gray-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                    >
                      {isDone ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                      )}
                    </button>

                    {/* Título com tachado se concluído */}
                    <span
                      className={`text-sm font-medium text-gray-900 truncate ${
                        isDone ? "line-through text-gray-400" : ""
                      }`}
                    >
                      {video.titulo}
                    </span>

                    {/* Tag de Formato */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${formatoObj.color} flex-shrink-0 hidden sm:inline-block`}
                    >
                      {formatoObj.label}
                    </span>

                    {/* Tag de Projeto se "Todos os Clientes" estiver selecionado */}
                    {projetoSelecionado === "todos" && video.projeto && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 flex-shrink-0">
                        {video.projeto.nome}
                      </span>
                    )}
                  </div>

                  {/* Botão Excluir */}
                  <button
                    type="button"
                    onClick={() => handleExcluir(video.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer ml-2"
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
