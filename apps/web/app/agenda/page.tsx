"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Search,
  Clock,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { getEventos, criarEvento, excluirEvento } from "@/actions/agenda";
import { getProjetos } from "@/actions/projetos";

const DIAS_SEMANA = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CORES_EVENTO = [
  "#ff5a3d", // Laranja Meu Assessor
  "#84cc16", // Verde Limão
  "#6366f1", // Roxo / Azul Servidor
  "#f59e0b", // Amarelo Dourado
  "#ec4899", // Rosa
  "#3b82f6", // Azul
];

export default function AgendaPage() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [eventos, setEventos] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Novo Evento
  const [modalOpen, setModalOpen] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState<string>("");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoHorario, setNovoHorario] = useState("09:00");
  const [novoProjetoId, setNovoProjetoId] = useState("");
  const [novaCor, setNovaCor] = useState(CORES_EVENTO[0]);
  const [salvando, setSalvando] = useState(false);

  // Detalhes do Evento
  const [eventoSelecionado, setEventoSelecionado] = useState<any | null>(null);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 4000);
    const onFocus = () => carregarDados();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [dataAtual]);

  const carregarDados = async () => {
    try {
      const ano = dataAtual.getFullYear();
      const mes = dataAtual.getMonth();

      const inicio = new Date(ano, mes - 1, 1).toISOString();
      const fim = new Date(ano, mes + 2, 0).toISOString();

      const [resE, resP] = await Promise.all([
        fetch(`/api/eventos?inicio=${inicio}&fim=${fim}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch("/api/projetos", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      ]);

      if (Array.isArray(resE)) setEventos(resE);
      else {
        const evs = await getEventos(new Date(inicio), new Date(fim));
        setEventos(evs);
      }

      if (Array.isArray(resP)) setProjetos(resP);
      else {
        const projs = await getProjetos();
        setProjetos(projs);
      }
    } catch (e) {
      console.error("Erro ao carregar agenda:", e);
    } finally {
      setLoading(false);
    }
  };

  // Navegação do Mês
  const mesAnterior = () => {
    setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1));
  };

  const proximoMes = () => {
    setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1));
  };

  const irParaHoje = () => {
    setDataAtual(new Date());
  };

  // Montagem da grade mensal (5 semanas x 7 dias)
  const getDiasCalendario = () => {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();

    const primeiroDiaMes = new Date(ano, mes, 1);
    const diaSemanaPrimeiro = primeiroDiaMes.getDay();

    const dias = [];
    const inicioCalendario = new Date(ano, mes, 1 - diaSemanaPrimeiro);

    for (let i = 0; i < 35; i++) {
      const d = new Date(inicioCalendario);
      d.setDate(inicioCalendario.getDate() + i);
      dias.push(d);
    }

    return dias;
  };

  const abrirModalNovoNoDia = (dia: Date) => {
    const anoStr = dia.getFullYear();
    const mesStr = String(dia.getMonth() + 1).padStart(2, "0");
    const diaStr = String(dia.getDate()).padStart(2, "0");
    setDataSelecionada(`${anoStr}-${mesStr}-${diaStr}`);
    setModalOpen(true);
  };

  const handleSalvarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim() || !dataSelecionada || salvando) return;

    setSalvando(true);
    const [ano, mes, dia] = dataSelecionada.split("-").map(Number);
    const [horas, minutos] = novoHorario.split(":").map(Number);

    const inicio = new Date(ano, mes - 1, dia, horas, minutos);
    const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

    const res = await criarEvento({
      titulo: novoTitulo.trim(),
      inicio,
      fim,
      projetoId: novoProjetoId || undefined,
    });

    setSalvando(false);
    if (res.success) {
      setModalOpen(false);
      setNovoTitulo("");
      carregarDados();
    }
  };

  const handleExcluirEvento = async (id: string) => {
    if (confirm("Deseja realmente remover este compromisso da agenda?")) {
      const res = await excluirEvento(id);
      if (res.success) {
        setEventoSelecionado(null);
        carregarDados();
      }
    }
  };

  const diasGrade = getDiasCalendario();
  const hoje = new Date();

  return (
    <div className="animate-fade-in-up space-y-4 max-w-[1400px] mx-auto pb-10">
      {/* ── Top Bar da Agenda estilo Google Calendar ─────── */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-white border shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={irParaHoje}
            className="px-4 py-1.5 rounded-full border text-xs font-bold transition-all hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            Hoje
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={mesAnterior}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={proximoMes}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <h2 className="font-heading text-xl font-bold tracking-tight text-gray-900 ml-2">
            {MESES[dataAtual.getMonth()]} de {dataAtual.getFullYear()}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-gray-100 text-xs font-semibold text-gray-600 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <span>Mês</span>
          </div>

          <button
            onClick={() => abrirModalNovoNoDia(new Date())}
            className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>

      {/* ── Grade Mensal do Calendário (Estilo Google Agenda) ─── */}
      <div className="card p-0 overflow-hidden bg-white border shadow-card rounded-2xl">
        {/* Cabeçalho com dias da semana */}
        <div className="grid grid-cols-7 border-b bg-gray-50/80 text-center py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wider" style={{ borderColor: "var(--border)" }}>
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

            // Filtra eventos do dia
            const eventosDia = eventos.filter((ev) => {
              const dEv = new Date(ev.inicio);
              return (
                dEv.getDate() === dia.getDate() &&
                dEv.getMonth() === dia.getMonth() &&
                dEv.getFullYear() === dia.getFullYear()
              );
            });

            return (
              <div
                key={idx}
                onClick={() => abrirModalNovoNoDia(dia)}
                className={`min-h-[120px] p-1.5 bg-white flex flex-col justify-start transition-all hover:bg-gray-50/80 cursor-pointer group relative ${
                  !ehMesAtual ? "bg-gray-50/50" : ""
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

                {/* Lista de pílulas de eventos */}
                <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] custom-scrollbar">
                  {eventosDia.map((ev) => {
                    const horStr = new Date(ev.inicio).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const cor = ev.projeto?.cor || CORES_EVENTO[idx % CORES_EVENTO.length];

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventoSelecionado(ev);
                        }}
                        className="px-2 py-1 rounded-md text-[11px] font-semibold text-white truncate shadow-xs flex items-center gap-1 transition-transform hover:scale-[1.02] cursor-pointer"
                        style={{ background: cor }}
                        title={`${horStr} — ${ev.titulo}`}
                      >
                        <span className="opacity-90 font-mono text-[10px]">{horStr}</span>
                        <span className="truncate">{ev.titulo}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal Novo Evento ─────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="card p-6 w-full max-w-md bg-white shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading text-lg font-bold mb-4 text-gray-900">
              Novo Compromisso na Agenda
            </h3>

            <form onSubmit={handleSalvarEvento} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Título do Compromisso:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Consulta médica, Reunião com cliente..."
                  value={novoTitulo}
                  onChange={(e) => setNovoTitulo(e.target.value)}
                  className="input w-full"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Data:
                  </label>
                  <input
                    type="date"
                    value={dataSelecionada}
                    onChange={(e) => setDataSelecionada(e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Horário:
                  </label>
                  <input
                    type="time"
                    value={novoHorario}
                    onChange={(e) => setNovoHorario(e.target.value)}
                    className="input w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Vincular ao Projeto (Opcional):
                </label>
                <select
                  value={novoProjetoId}
                  onChange={(e) => setNovoProjetoId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Nenhum (Geral)</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
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
                  className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5"
                >
                  {salvando ? "Salvando..." : "Salvar na Agenda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Detalhes do Evento ─────────────────────── */}
      {eventoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="card p-6 w-full max-w-md bg-white shadow-2xl relative">
            <button
              onClick={() => setEventoSelecionado(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span
                className="w-4 h-4 rounded-full"
                style={{ background: eventoSelecionado.projeto?.cor || "var(--accent)" }}
              />
              <h3 className="font-heading text-lg font-bold text-gray-900">
                {eventoSelecionado.titulo}
              </h3>
            </div>

            <div className="space-y-3 text-sm text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  {new Date(eventoSelecionado.inicio).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  às{" "}
                  {new Date(eventoSelecionado.inicio).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {eventoSelecionado.projeto && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    Cliente: {eventoSelecionado.projeto.nome}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => handleExcluirEvento(eventoSelecionado.id)}
                className="text-red-600 hover:text-red-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Compromisso</span>
              </button>

              <button
                onClick={() => setEventoSelecionado(null)}
                className="btn-neutral py-2 px-4 text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
