"use client";

import { useState } from "react";
import { Plus, Trash2, Check, Clock, Bot, Sparkles, Sliders } from "lucide-react";
import { PROJETOS } from "@/lib/mock-data";

export default function ConfigPage() {
  const [projetos, setProjetos] = useState(PROJETOS);
  const [horasDia, setHorasDia] = useState("6");
  const [horarioResumo, setHorarioResumo] = useState("07:00");
  const [horarioChecagem, setHorarioChecagem] = useState("14:00");
  const [horarioFechamento, setHorarioFechamento] = useState("17:00");

  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"cliente" | "interno" | "pessoal">("cliente");
  const [novaCor, setNovaCor] = useState("#ff5a3d");

  const handleAddProjeto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setProjetos([
      ...projetos,
      {
        id: String(Date.now()),
        nome: novoNome,
        tipo: novoTipo,
        cor: novaCor,
        ativo: true,
      },
    ]);
    setNovoNome("");
  };

  return (
    <div className="animate-fade-in-up max-w-3xl space-y-8">
      {/* ── Projetos ────────────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight mb-2 flex items-center gap-2">
          <Sliders className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Projetos & Clientes
        </h2>
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          Gerencie os clientes e categorias para organizar seus vídeos e tarefas.
        </p>

        {/* Lista de projetos */}
        <div className="space-y-2 mb-6">
          {projetos.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-xl transition-colors"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ background: p.cor }} />
                <span className="text-sm font-medium">{p.nome}</span>
                <span className="badge badge-neutral text-[10px] capitalize">{p.tipo}</span>
              </div>
              <button
                onClick={() => setProjetos(projetos.filter((item) => item.id !== p.id))}
                className="text-xs p-1.5 rounded-lg transition-colors hover:text-red-400"
                style={{ color: "var(--text-muted)" }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Form novo projeto */}
        <form onSubmit={handleAddProjeto} className="flex flex-col sm:flex-row gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <input
            type="text"
            placeholder="Nome do cliente/projeto"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            className="input flex-1"
          />
          <select
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value as "cliente" | "interno" | "pessoal")}
            className="input sm:w-32"
          >
            <option value="cliente">Cliente</option>
            <option value="interno">Interno</option>
            <option value="pessoal">Pessoal</option>
          </select>
          <input
            type="color"
            value={novaCor}
            onChange={(e) => setNovaCor(e.target.value)}
            className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-1"
          />
          <button type="submit" className="btn-primary flex items-center justify-center gap-1.5 whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </form>
      </section>

      {/* ── Capacidade de Trabalho ─────────────────────────── */}
      <section className="card p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Horas de Trabalho
        </h2>
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          Define o limite de horas produtivas por dia para o cálculo da capacidade semanal.
        </p>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Horas disponíveis por dia:
          </label>
          <input
            type="number"
            value={horasDia}
            onChange={(e) => setHorasDia(e.target.value)}
            className="input w-24 text-center font-bold"
            min="1"
            max="16"
          />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            h/dia (= {Number(horasDia) * 5}h por semana)
          </span>
        </div>
      </section>

      {/* ── Rotinas do Bot do Telegram ───────────────────────── */}
      <section className="card p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight mb-2 flex items-center gap-2">
          <Bot className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Rotinas Proativas (Telegram)
        </h2>
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          Horários em que o seu Assessor entra em contato com você para relatórios e lembretes.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--bg-surface)" }}>
            <div>
              <p className="text-sm font-medium">Resumo Matinal</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Agenda, tarefas e vídeos do dia</p>
            </div>
            <input
              type="time"
              value={horarioResumo}
              onChange={(e) => setHorarioResumo(e.target.value)}
              className="input w-32 text-center"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--bg-surface)" }}>
            <div>
              <p className="text-sm font-medium">Checagem de Tarde</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Status do que ainda falta concluir</p>
            </div>
            <input
              type="time"
              value={horarioChecagem}
              onChange={(e) => setHorarioChecagem(e.target.value)}
              className="input w-32 text-center"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--bg-surface)" }}>
            <div>
              <p className="text-sm font-medium">Fechamento de Sexta</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Resumo semanal e projeção da próxima semana</p>
            </div>
            <input
              type="time"
              value={horarioFechamento}
              onChange={(e) => setHorarioFechamento(e.target.value)}
              className="input w-32 text-center"
            />
          </div>
        </div>
      </section>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button className="btn-primary flex items-center gap-2 px-6 py-3 text-sm">
          <Check className="w-4 h-4" />
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}
