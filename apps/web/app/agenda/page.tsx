"use client";

import { useState, useEffect, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Edit2,
  X,
  Check,
  Repeat,
  GripVertical,
} from "lucide-react";
import { getEventos, criarEvento, atualizarEvento, excluirEvento } from "@/actions/agenda";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CORES_EVENTO = [
  "#ff5a3d", // Laranja
  "#84cc16", // Verde Limão
  "#6366f1", // Roxo / Azul
  "#f59e0b", // Amarelo
  "#ec4899", // Rosa
  "#3b82f6", // Azul
];

function getCorEvento(ev: any) {
  if (ev.projeto?.cor) return ev.projeto.cor;
  const key = ev.idOriginal || ev.id || ev.titulo || "";
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CORES_EVENTO.length;
  return CORES_EVENTO[index];
}

export default function AgendaPage() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [eventos, setEventos] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Modal Novo Evento
  const [modalOpen, setModalOpen] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [dataFimSelecionada, setDataFimSelecionada] = useState("");
  const [novoHorario, setNovoHorario] = useState("09:00");
  const [novoProjetoId, setNovoProjetoId] = useState("");
  const [novaRecorrencia, setNovaRecorrencia] = useState("unico");
  const [salvando, setSalvando] = useState(false);

  // Modal Detalhes / Edição
  const [eventoSelecionado, setEventoSelecionado] = useState<any>(null);
  const [editando, setEditando] = useState(false);
  const [editTitulo, setEditTitulo] = useState("");
  const [editDataInicio, setEditDataInicio] = useState("");
  const [editDataFim, setEditDataFim] = useState("");
  const [editHorario, setEditHorario] = useState("");
  const [editProjetoId, setEditProjetoId] = useState("");
  const [editRecorrencia, setEditRecorrencia] = useState("unico");

  const [isPending, startTransition] = useTransition();

  // Carregar eventos da grade
  const recarregarEventos = async () => {
    setCarregando(true);

    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();

    const primeiroDia = new Date(ano, mes, 1);
    const inicioGrade = new Date(primeiroDia);
    inicioGrade.setDate(inicioGrade.getDate() - primeiroDia.getDay());

    const ultimoDia = new Date(ano, mes + 1, 0);
    const fimGrade = new Date(ultimoDia);
    fimGrade.setDate(fimGrade.getDate() + (6 - ultimoDia.getDay()));
    fimGrade.setHours(23, 59, 59, 999);

    const resEvts = await getEventos(inicioGrade, fimGrade);
    setEventos(resEvts);

    // Buscar lista de projetos
    try {
      const resProjs = await fetch("/api/projetos");
      if (resProjs.ok) {
        const dataProjs = await resProjs.json();
        setProjetos(dataProjs);
      }
    } catch (e) {}

    setCarregando(false);
  };

  useEffect(() => {
    recarregarEventos();
  }, [dataAtual]);

  // Arrastar e Soltar (Drag & Drop) compromisso em outro dia do calendário
  const handleDropNoDia = async (e: React.DragEvent, diaAlvo: Date) => {
    e.preventDefault();
    const eventoIdRaw = e.dataTransfer.getData("text/plain");
    if (!eventoIdRaw) return;

    const targetId = eventoIdRaw.includes("_") ? eventoIdRaw.split("_")[0] : eventoIdRaw;
    const evt = eventos.find((item) => item.id === eventoIdRaw || item.id === targetId);

    if (!evt) return;

    const inicioAntigo = new Date(evt.inicio);
    const fimAntigo = evt.fim ? new Date(evt.fim) : new Date(inicioAntigo.getTime() + 3600000);
    const diffDiasMs = fimAntigo.getTime() - inicioAntigo.getTime();

    // Nova data de início preservando o horário
    const novoInicio = new Date(
      diaAlvo.getFullYear(),
      diaAlvo.getMonth(),
      diaAlvo.getDate(),
      inicioAntigo.getHours(),
      inicioAntigo.getMinutes()
    );

    const novoFim = new Date(novoInicio.getTime() + diffDiasMs);

    // Atualização otimista
    setEventos((prev) =>
      prev.map((item) =>
        item.id === eventoIdRaw
          ? {
              ...item,
              inicio: novoInicio.toISOString(),
              fim: novoFim.toISOString(),
            }
          : item
      )
    );

    startTransition(async () => {
      await atualizarEvento(targetId, {
        inicio: novoInicio,
        fim: novoFim,
      });
      recarregarEventos();
    });
  };

  // Navegar entre meses
  const mesAnterior = () => {
    setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1));
  };
  const proximoMes = () => {
    setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1));
  };
  const irParaHoje = () => {
    setDataAtual(new Date());
  };

  // Abrir modal novo evento em um dia específico
  const abrirModalNovoNoDia = (dia: Date) => {
    const dtStr = dia.toISOString().split("T")[0];
    setDataSelecionada(dtStr);
    setDataFimSelecionada(dtStr);
    setNovoTitulo("");
    setNovoHorario("09:00");
    setNovoProjetoId("");
    setNovaRecorrencia("unico");
    setModalOpen(true);
  };

  // Criar evento
  const handleSalvarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim() || !dataSelecionada) return;

    setSalvando(true);

    const inicio = new Date(`${dataSelecionada}T${novoHorario}:00`);
    const fimData = dataFimSelecionada || dataSelecionada;
    const fim = new Date(`${fimData}T${novoHorario}:00`);

    if (fim <= inicio) {
      fim.setHours(inicio.getHours() + 1);
    }

    const res = await criarEvento({
      titulo: novoTitulo,
      inicio,
      fim,
      projetoId: novoProjetoId || undefined,
      recorrencia: novaRecorrencia,
    });

    setSalvando(false);
    if (res.success) {
      setModalOpen(false);
      recarregarEventos();
    }
  };

  // Salvar Edição do Evento
  const handleSalvarEdicao = async () => {
    if (!eventoSelecionado || !editTitulo.trim()) return;

    setSalvando(true);

    const inicio = new Date(`${editDataInicio}T${editHorario}:00`);
    const fimData = editDataFim || editDataInicio;
    const fim = new Date(`${fimData}T${editHorario}:00`);

    if (fim <= inicio) {
      fim.setHours(inicio.getHours() + 1);
    }

    const res = await atualizarEvento(eventoSelecionado.id, {
      titulo: editTitulo,
      inicio,
      fim,
      projetoId: editProjetoId || null,
      recorrencia: editRecorrencia,
    });

    setSalvando(false);
    if (res.success) {
      setEventoSelecionado(null);
      setEditando(false);
      recarregarEventos();
    }
  };

  // Excluir Evento
  const handleExcluirEvento = async (id: string) => {
    setEventos((prev) => prev.filter((e) => e.id !== id));
    setEventoSelecionado(null);
    startTransition(async () => {
      await excluirEvento(id);
      recarregarEventos();
    });
  };

  // Abrir Detalhes
  const abrirDetalhesEvento = (ev: any) => {
    setEventoSelecionado(ev);
    setEditando(false);
    setEditTitulo(ev.titulo);

    const dtInicio = new Date(ev.inicio);
    setEditDataInicio(dtInicio.toISOString().split("T")[0]);

    const dtFim = ev.fim ? new Date(ev.fim) : dtInicio;
    setEditDataFim(dtFim.toISOString().split("T")[0]);

    const horStr = dtInicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setEditHorario(horStr);
    setEditProjetoId(ev.projetoId || "");
    setEditRecorrencia(ev.recorrencia || "unico");
  };

  // Gerar dias da grade
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  const primeiroDiaMes = new Date(ano, mes, 1);
  const diaSemanaPrimeiro = primeiroDiaMes.getDay();

  const inicioGrade = new Date(primeiroDiaMes);
  inicioGrade.setDate(inicioGrade.getDate() - diaSemanaPrimeiro);

  const diasGrade: Date[] = [];
  const tempDate = new Date(inicioGrade);

  for (let i = 0; i < 35; i++) {
    diasGrade.push(new Date(tempDate));
    tempDate.setDate(tempDate.getDate() + 1);
  }

  const hoje = new Date();

  return (
    <div className="animate-fade-in-up space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── Topo do Calendário ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-accent" />
            Agenda & Compromissos
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Arraste os compromissos para mudar os dias. Crie eventos de múltiplos dias ou fixos.
          </p>
        </div>

        {/* Controles de Navegação de Mês */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={irParaHoje}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-xs"
          >
            Hoje
          </button>
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={mesAnterior}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-heading text-sm font-bold px-3 min-w-[140px] text-center text-gray-900">
              {MESES[mes]} {ano}
            </span>
            <button
              onClick={proximoMes}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => abrirModalNovoNoDia(new Date())}
            className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Compromisso</span>
          </button>
        </div>
      </div>

      {/* ── Grade Mensal do Calendário ──────────────────────── */}
      <div className="card p-0 overflow-hidden bg-white border shadow-card rounded-2xl">
        {/* Cabeçalho com dias da semana */}
        <div
          className="grid grid-cols-7 border-b bg-gray-50/80 text-center py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider"
          style={{ borderColor: "var(--border)" }}
        >
          {DIAS_SEMANA.map((dia) => (
            <div key={dia}>{dia}</div>
          ))}
        </div>

        {/* Grade de 35 células (5 semanas x 7 dias) */}
        <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-[1px]">
          {diasGrade.map((dia, idx) => {
            const ehMesAtual = dia.getMonth() === dataAtual.getMonth();
            const ehHoje =
              dia.getDate() === hoje.getDate() &&
              dia.getMonth() === hoje.getMonth() &&
              dia.getFullYear() === hoje.getFullYear();

            // Filtra eventos do dia (incluindo compromissos de múltiplos dias!)
            const inicioDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0, 0);
            const fimDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59, 999);

            const eventosDia = eventos.filter((ev) => {
              const inicioEvt = new Date(ev.inicio);
              const fimEvt = ev.fim ? new Date(ev.fim) : inicioEvt;

              return inicioEvt <= fimDia && fimEvt >= inicioDia;
            });

            return (
              <div
                key={idx}
                onClick={() => abrirModalNovoNoDia(dia)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => handleDropNoDia(e, dia)}
                className={`min-h-[120px] p-1.5 bg-white flex flex-col justify-start transition-all hover:bg-gray-50/90 cursor-pointer group relative ${
                  !ehMesAtual ? "bg-gray-50/50 opacity-60" : ""
                }`}
              >
                {/* Número do Dia */}
                <div className="flex items-center justify-between mb-1 px-1">
                  <span
                    className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                      ehHoje
                        ? "bg-accent text-white shadow-xs"
                        : ehMesAtual
                        ? "text-gray-800"
                        : "text-gray-400"
                    }`}
                    style={ehHoje ? { background: "var(--accent)" } : {}}
                  >
                    {dia.getDate() === 1
                      ? `${dia.getDate()} ${MESES[dia.getMonth()].slice(0, 3).toLowerCase()}.`
                      : dia.getDate()}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirModalNovoNoDia(dia);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-gray-700 transition-opacity"
                    title="Adicionar evento neste dia"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Lista de pílulas de eventos (Arrastáveis!) */}
                <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                  {eventosDia.map((ev) => {
                    const horStr = new Date(ev.inicio).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const cor = getCorEvento(ev);
                    const isMensal = ev.recorrencia === "mensal";
                    const isSemanal = ev.recorrencia === "semanal";

                    const dtIni = new Date(ev.inicio);
                    const dtFim = ev.fim ? new Date(ev.fim) : dtIni;
                    const ehMultidias = dtIni.getDate() !== dtFim.getDate() || dtIni.getMonth() !== dtFim.getMonth();

                    return (
                      <div
                        key={ev.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", ev.idOriginal || ev.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirDetalhesEvento(ev);
                        }}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold text-white truncate shadow-xs flex items-center gap-1 transition-transform hover:scale-[1.02] cursor-grab active:cursor-grabbing select-none"
                        style={{ background: cor }}
                        title={`${horStr} — ${ev.titulo} ${ehMultidias ? "(Múltiplos dias)" : ""}`}
                      >
                        <GripVertical className="w-2.5 h-2.5 opacity-60 flex-shrink-0" />
                        {isMensal || isSemanal ? (
                          <Repeat className="w-3 h-3 flex-shrink-0 text-white animate-pulse" />
                        ) : null}
                        <span className="opacity-90 font-mono text-[10px]">{horStr}</span>
                        <span className="truncate flex-1">{ev.titulo}</span>
                        {ehMultidias && <span className="text-[9px] bg-black/20 px-1 rounded">2d+</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal Criar Novo Evento ─────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="card p-6 w-full max-w-md bg-white shadow-2xl relative rounded-2xl animate-fade-in my-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-accent" />
              Novo Compromisso na Agenda
            </h3>

            <form onSubmit={handleSalvarEvento} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Título do Compromisso:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Consulta médica, Viagem, Evento de 2 dias..."
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  className="input w-full font-semibold"
                  required
                  autoFocus
                />
              </div>

              {/* Data Início & Data Término (Múltiplos Dias!) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Data de Início:
                  </label>
                  <input
                    type="date"
                    value={dataSelecionada}
                    onChange={(e) => {
                      setDataSelecionada(e.target.value);
                      if (!dataFimSelecionada || dataFimSelecionada < e.target.value) {
                        setDataFimSelecionada(e.target.value);
                      }
                    }}
                    className="input w-full text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Data de Término (Múltiplos Dias):
                  </label>
                  <input
                    type="date"
                    value={dataFimSelecionada}
                    onChange={(e) => setDataFimSelecionada(e.target.value)}
                    className="input w-full text-xs font-semibold"
                    min={dataSelecionada}
                    required
                  />
                </div>
              </div>

              {/* Horário */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Horário de Início:
                </label>
                <input
                  type="time"
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  className="input w-full text-xs font-semibold"
                  required
                />
              </div>

              {/* Repetição / Evento Fixo */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-accent" />
                  Repetição / Evento Fixo:
                </label>
                <select
                  value={novaRecorrencia}
                  onChange={(e) => setNovaRecorrencia(e.target.value)}
                  className="input w-full text-xs font-bold text-gray-800"
                >
                  <option value="unico">📌 Compromisso Único</option>
                  <option value="mensal">🔁 Fixo Mensal (Repete todo mês)</option>
                  <option value="semanal">🔄 Fixo Semanal (Repete toda semana)</option>
                </select>
              </div>

              {/* Projeto / Cliente */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Vincular ao Cliente (Opcional):
                </label>
                <select
                  value={novoProjetoId}
                  onChange={(e) => setNovoProjetoId(e.target.value)}
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

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
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
                  className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5 font-bold"
                >
                  {salvando ? "Salvando..." : "Salvar na Agenda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Detalhes e Edição do Evento ───────────────── */}
      {eventoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="card p-6 w-full max-w-md bg-white shadow-2xl relative rounded-2xl animate-fade-in my-auto">
            <button
              onClick={() => setEventoSelecionado(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            {!editando ? (
              <>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: getCorEvento(eventoSelecionado) }}
                    />
                    <h3 className="font-heading text-lg font-bold text-gray-900">
                      {eventoSelecionado.titulo}
                    </h3>
                  </div>

                  <button
                    onClick={() => setEditando(true)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-accent hover:bg-gray-100 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                    title="Editar compromisso"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                </div>

                <div className="space-y-3 text-sm text-gray-600 mb-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>
                      {new Date(eventoSelecionado.inicio).toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {eventoSelecionado.fim && (
                        <>
                          até{" "}
                          {new Date(eventoSelecionado.fim).toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </>
                      )}{" "}
                      às{" "}
                      {new Date(eventoSelecionado.inicio).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {eventoSelecionado.projeto && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: eventoSelecionado.projeto.cor }} />
                      <span>Cliente: {eventoSelecionado.projeto.nome}</span>
                    </div>
                  )}

                  {eventoSelecionado.recorrencia && eventoSelecionado.recorrencia !== "unico" && (
                    <div className="flex items-center gap-2 text-xs font-bold text-accent">
                      <Repeat className="w-3.5 h-3.5" />
                      <span>
                        {eventoSelecionado.recorrencia === "mensal"
                          ? "Evento Fixo Mensal"
                          : "Evento Fixo Semanal"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleExcluirEvento(eventoSelecionado.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </button>

                  <button
                    onClick={() => setEventoSelecionado(null)}
                    className="btn-neutral py-2 px-5 text-xs font-bold"
                  >
                    Fechar
                  </button>
                </div>
              </>
            ) : (
              /* Formulário de Edição do Evento */
              <div className="space-y-4">
                <h3 className="font-heading text-lg font-bold text-gray-900">
                  Editar Compromisso
                </h3>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Título:
                  </label>
                  <input
                    type="text"
                    value={editTitulo}
                    onChange={(e) => setEditTitulo(e.target.value)}
                    className="input w-full font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Data Início:
                    </label>
                    <input
                      type="date"
                      value={editDataInicio}
                      onChange={(e) => setEditDataInicio(e.target.value)}
                      className="input w-full text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Data Término:
                    </label>
                    <input
                      type="date"
                      value={editDataFim}
                      onChange={(e) => setEditDataFim(e.target.value)}
                      className="input w-full text-xs font-semibold"
                      min={editDataInicio}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Horário:
                  </label>
                  <input
                    type="time"
                    value={editHorario}
                    onChange={(e) => setEditHorario(e.target.value)}
                    className="input w-full text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Repetição:
                  </label>
                  <select
                    value={editRecorrencia}
                    onChange={(e) => setEditRecorrencia(e.target.value)}
                    className="input w-full text-xs font-bold"
                  >
                    <option value="unico">📌 Compromisso Único</option>
                    <option value="mensal">🔁 Fixo Mensal</option>
                    <option value="semanal">🔄 Fixo Semanal</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Cliente:
                  </label>
                  <select
                    value={editProjetoId}
                    onChange={(e) => setEditProjetoId(e.target.value)}
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

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setEditando(false)}
                    className="btn-neutral py-2 px-4 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSalvarEdicao}
                    disabled={salvando}
                    className="btn-primary py-2 px-5 text-xs font-bold"
                  >
                    {salvando ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
