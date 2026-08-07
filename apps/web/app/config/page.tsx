"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Check, Clock, Bot, Sliders, User, Camera, CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import { getProjetos, criarProjeto, excluirProjeto } from "@/actions/projetos";

export default function ConfigPage() {
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loadingProjetos, setLoadingProjetos] = useState(true);

  // Perfil
  const [nomeUsuario, setNomeUsuario] = useState("Ruan");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Configurações de Horas e Telegram
  const [horasDia, setHorasDia] = useState("6");
  const [horarioResumo, setHorarioResumo] = useState("08:00");
  const [horarioChecagem, setHorarioChecagem] = useState("14:00");
  const [horarioFechamento, setHorarioFechamento] = useState("17:00");

  // Form Novo Projeto
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"cliente" | "interno" | "pessoal">("cliente");
  const [novaCor, setNovaCor] = useState("#ff5a3d");
  const [salvandoProjeto, setSalvandoProjeto] = useState(false);

  // Feedback
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  useEffect(() => {
    // Carregar configurações salvas
    const avatar = localStorage.getItem("ruan_user_avatar");
    if (avatar) setUserAvatar(avatar);

    const nome = localStorage.getItem("ruan_user_name");
    if (nome) setNomeUsuario(nome);

    const hDia = localStorage.getItem("ruan_horas_dia");
    if (hDia) setHorasDia(hDia);

    const hResumo = localStorage.getItem("ruan_horario_resumo");
    if (hResumo) setHorarioResumo(hResumo);

    const hChecagem = localStorage.getItem("ruan_horario_checagem");
    if (hChecagem) setHorarioChecagem(hChecagem);

    const hFechamento = localStorage.getItem("ruan_horario_fechamento");
    if (hFechamento) setHorarioFechamento(hFechamento);

    // Carregar projetos do Supabase DB
    carregarProjetos();
  }, []);

  const carregarProjetos = async () => {
    setLoadingProjetos(true);
    const data = await getProjetos();
    setProjetos(data);
    setLoadingProjetos(false);
  };

  const handleAddProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || salvandoProjeto) return;

    setSalvandoProjeto(true);
    const res = await criarProjeto({
      nome: novoNome.trim(),
      tipo: novoTipo,
      cor: novaCor,
    });
    setSalvandoProjeto(false);

    if (res.success) {
      setNovoNome("");
      carregarProjetos();
      exibirSucesso("Projeto/Cliente adicionado com sucesso!");
    }
  };

  const handleExcluirProjeto = async (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover o cliente/projeto "${nome}"?`)) {
      const res = await excluirProjeto(id);
      if (res.success) {
        carregarProjetos();
        exibirSucesso(`Projeto "${nome}" removido!`);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        if (base64) {
          localStorage.setItem("ruan_user_avatar", base64);
          setUserAvatar(base64);
          exibirSucesso("Foto de perfil atualizada!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSalvarTudo = () => {
    localStorage.setItem("ruan_user_name", nomeUsuario);
    localStorage.setItem("ruan_horas_dia", horasDia);
    localStorage.setItem("ruan_horario_resumo", horarioResumo);
    localStorage.setItem("ruan_horario_checagem", horarioChecagem);
    localStorage.setItem("ruan_horario_fechamento", horarioFechamento);

    exibirSucesso("✅ Todas as configurações salvas com sucesso!");
  };

  const exibirSucesso = (msg: string) => {
    setMensagemSucesso(msg);
    setTimeout(() => setMensagemSucesso(null), 5000);
  };

  return (
    <div className="animate-fade-in-up max-w-3xl space-y-8 pb-12">
      {mensagemSucesso && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 flex items-center gap-3 font-semibold text-sm shadow-xs animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* ── Perfil do Usuário ──────────────────────────── */}
      <section className="card p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight mb-2 flex items-center gap-2">
          <User className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Seu Perfil
        </h2>
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          Personalize sua foto de perfil e nome de exibição no app.
        </p>

        <div className="flex items-center gap-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group w-20 h-20 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border-2 hover:opacity-95 transition-all"
            style={{ borderColor: "var(--accent)" }}
            title="Clique para escolher foto do seu computador"
          >
            {userAvatar ? (
              <Image src={userAvatar} alt="Foto de perfil" fill className="object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--accent), #c22f16)" }}
              >
                R
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs gap-1 transition-opacity">
              <Camera className="w-5 h-5" />
              <span>Trocar</span>
            </div>
          </button>

          <div className="flex-1 space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
                Nome de Exibição:
              </label>
              <input
                type="text"
                value={nomeUsuario}
                onChange={(e) => setNomeUsuario(e.target.value)}
                className="input w-full max-w-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Projetos & Clientes ─────────────────────────────── */}
      <section className="card p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight mb-2 flex items-center gap-2">
          <Sliders className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Projetos & Clientes (Banco Supabase)
        </h2>
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          Gerencie os clientes e categorias ativas salvas no seu banco de dados.
        </p>

        {/* Lista de projetos */}
        {loadingProjetos ? (
          <div className="flex items-center justify-center py-6 text-sm text-gray-500 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Carregando projetos do Supabase...</span>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            {projetos.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3.5 rounded-xl transition-colors"
                style={{ background: "var(--bg-surface)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ background: p.cor || "#ff5a3d" }} />
                  <span className="text-sm font-semibold">{p.nome}</span>
                  <span className="badge badge-neutral text-[10px] capitalize">{p.tipo}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleExcluirProjeto(p.id, p.nome)}
                  className="text-xs p-1.5 rounded-lg transition-colors hover:text-red-500 cursor-pointer"
                  style={{ color: "var(--text-muted)" }}
                  title="Excluir projeto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

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
            onChange={(e) => setNovoTipo(e.target.value as any)}
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
            title="Escolher cor"
          />
          <button type="submit" disabled={salvandoProjeto} className="btn-primary flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer">
            {salvandoProjeto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
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
          Define o limite de horas produtivas por dia para o cálculo da capacidade semanal no Dashboard.
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
          <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
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
          Horários em que o seu Assessor entra em contato com você no Telegram para enviar resumos.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--bg-surface)" }}>
            <div>
              <p className="text-sm font-semibold">Resumo Matinal</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Agenda, tarefas e vídeos do dia</p>
            </div>
            <input
              type="time"
              value={horarioResumo}
              onChange={(e) => setHorarioResumo(e.target.value)}
              className="input w-32 text-center font-bold"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--bg-surface)" }}>
            <div>
              <p className="text-sm font-semibold">Checagem da Tarde</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Status do que ainda falta concluir</p>
            </div>
            <input
              type="time"
              value={horarioChecagem}
              onChange={(e) => setHorarioChecagem(e.target.value)}
              className="input w-32 text-center font-bold"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--bg-surface)" }}>
            <div>
              <p className="text-sm font-semibold">Fechamento de Sexta</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Resumo semanal e projeção da próxima semana</p>
            </div>
            <input
              type="time"
              value={horarioFechamento}
              onChange={(e) => setHorarioFechamento(e.target.value)}
              className="input w-32 text-center font-bold"
            />
          </div>
        </div>
      </section>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button onClick={handleSalvarTudo} className="btn-primary flex items-center gap-2 px-8 py-3 text-sm cursor-pointer shadow-lg">
          <Check className="w-4 h-4" />
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}
