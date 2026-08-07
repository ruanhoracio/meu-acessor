"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Check, Clock, Bot, Sliders, User, Camera, CheckCircle2, Loader2, AlertCircle, Crop } from "lucide-react";
import { getProjetos, criarProjeto, excluirProjeto } from "@/actions/projetos";
import { ModalCropper } from "@/components/modals/modal-cropper";

export default function ConfigPage() {
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loadingProjetos, setLoadingProjetos] = useState(true);

  // Perfil
  const [nomeUsuario, setNomeUsuario] = useState("Ruan");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cropper Modal
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

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
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  useEffect(() => {
    // Carregar configurações salvas do localStorage
    try {
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
    } catch (e) {
      console.error("Erro ao ler localStorage:", e);
    }

    // Carregar projetos do Supabase DB
    carregarProjetos();
  }, []);

  const carregarProjetos = async () => {
    setLoadingProjetos(true);
    try {
      // Tenta via API REST primeiro (100% confiável no Vercel)
      const dataApi = await fetch("/api/projetos").then(r => r.json()).catch(() => null);
      if (Array.isArray(dataApi)) {
        setProjetos(dataApi);
      } else {
        const dataActions = await getProjetos();
        setProjetos(dataActions);
      }
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
    }
    setLoadingProjetos(false);
  };

  const handleAddProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novoNome.trim();
    if (!nomeLimpo || salvandoProjeto) return;

    setSalvandoProjeto(true);
    let novoItem = null;

    // 1. Tenta via REST API (Super rápido e sem dependência de RSC Server Action)
    try {
      const apiRes = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeLimpo, tipo: novoTipo, cor: novaCor }),
      });

      if (apiRes.ok) {
        novoItem = await apiRes.json();
      }
    } catch (err) {
      console.warn("REST API call falhou, tentando Server Action:", err);
    }

    // 2. Fallback via Server Action
    if (!novoItem) {
      try {
        const res = await criarProjeto({
          nome: nomeLimpo,
          tipo: novoTipo,
          cor: novaCor,
        });
        if (res && res.success && res.projeto) {
          novoItem = res.projeto;
        }
      } catch (err) {
        console.error("Server action também falhou:", err);
      }
    }

    setSalvandoProjeto(false);

    if (novoItem) {
      setNovoNome("");
      setProjetos((prev) => [...prev.filter((p) => p.id !== novoItem.id), novoItem]);
      exibirSucesso(`Cliente "${nomeLimpo}" adicionado com sucesso!`);
      // Recarrega a lista em segundo plano para sincronizar com Supabase
      carregarProjetos();
    } else {
      exibirErro("Não foi possível salvar o cliente. Tente novamente.");
    }
  };

  const handleExcluirProjeto = async (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover o cliente/projeto "${nome}"?`)) {
      try {
        const res = await excluirProjeto(id);
        if (res.success) {
          await carregarProjetos();
          exibirSucesso(`Projeto "${nome}" removido!`);
        } else {
          exibirErro("Erro ao excluir projeto.");
        }
      } catch (error) {
        console.error("Erro ao excluir projeto:", error);
        exibirErro("Erro ao excluir projeto.");
      }
    }
  };

  // Ao selecionar um arquivo do computador
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        if (result) {
          setRawImageSrc(result);
          setCropperOpen(true);
        }
      };
      reader.readAsDataURL(file);
    }
    // Resetar input para permitir selecionar o mesmo arquivo se quiser
    e.target.value = "";
  };

  // Ao salvar o recorte do modal cropper
  const handleCropSave = (croppedBase64: string) => {
    try {
      localStorage.setItem("ruan_user_avatar", croppedBase64);
      setUserAvatar(croppedBase64);
      window.dispatchEvent(new Event("storage_user_updated"));
      exibirSucesso("Foto de perfil enquadrada e salva com sucesso!");
    } catch (e) {
      exibirErro("Erro ao salvar foto de perfil.");
    }
  };

  const handleSalvarTudo = () => {
    try {
      localStorage.setItem("ruan_user_name", nomeUsuario);
      localStorage.setItem("ruan_horas_dia", horasDia);
      localStorage.setItem("ruan_horario_resumo", horarioResumo);
      localStorage.setItem("ruan_horario_checagem", horarioChecagem);
      localStorage.setItem("ruan_horario_fechamento", horarioFechamento);

      // Notificar outros componentes (Sidebar, Header, etc)
      window.dispatchEvent(new Event("storage_user_updated"));

      exibirSucesso("✅ Configurações salvas com sucesso!");
    } catch (e) {
      exibirErro("Erro ao salvar configurações.");
    }
  };

  const exibirSucesso = (msg: string) => {
    setMensagemErro(null);
    setMensagemSucesso(msg);
    setTimeout(() => setMensagemSucesso(null), 5000);
  };

  const exibirErro = (msg: string) => {
    setMensagemSucesso(null);
    setMensagemErro(msg);
    setTimeout(() => setMensagemErro(null), 8000);
  };

  return (
    <div className="animate-fade-in-up max-w-3xl space-y-8 pb-12">
      {/* Modal Interativo de Recorte/Enquadramento de Foto */}
      <ModalCropper
        isOpen={cropperOpen}
        imageSrc={rawImageSrc}
        onClose={() => setCropperOpen(false)}
        onCropSave={handleCropSave}
      />

      {mensagemSucesso && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 flex items-center gap-3 font-semibold text-sm shadow-xs animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}
      {mensagemErro && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3 font-semibold text-sm shadow-xs animate-fade-in-up">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* ── Perfil do Usuário ──────────────────────────── */}
      <section className="card p-6">
        <h2 className="font-heading text-lg font-semibold tracking-tight mb-2 flex items-center gap-2">
          <User className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Seu Perfil
        </h2>
        <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
          Escolha e enquadre sua foto de perfil do computador e personalize seu nome.
        </p>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group w-24 h-24 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border-3 hover:opacity-95 transition-all shadow-md"
              style={{ borderColor: "var(--accent)" }}
              title="Clique para escolher foto do seu computador"
            >
              {userAvatar ? (
                <img src={userAvatar} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--accent), #c22f16)" }}
                >
                  {nomeUsuario.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs gap-1 transition-opacity">
                <Camera className="w-5 h-5" />
                <span className="font-bold">Trocar</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-accent font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Crop className="w-3.5 h-3.5" />
              Enquadrar foto
            </button>
          </div>

          <div className="flex-1 w-full space-y-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
                Nome de Exibição:
              </label>
              <input
                type="text"
                value={nomeUsuario}
                onChange={(e) => setNomeUsuario(e.target.value)}
                className="input w-full max-w-md"
                placeholder="Ex: Ruan Horácio"
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
                className="flex items-center justify-between p-3.5 rounded-xl transition-colors border"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-xs" style={{ background: p.cor || "#ff5a3d" }} />
                  <span className="text-sm font-semibold text-gray-900">{p.nome}</span>
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

        {/* Form novo projeto - LAYOUT EXPLÍCITO E SEM COLAPSO */}
        <form onSubmit={handleAddProjeto} className="pt-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
          <label className="text-xs font-bold text-gray-600 block">Adicionar Novo Cliente / Projeto:</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Nome do cliente (ex: João Silva)"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="input w-full"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value as any)}
                className="input w-32"
              >
                <option value="cliente">Cliente</option>
                <option value="interno">Interno</option>
                <option value="pessoal">Pessoal</option>
              </select>

              <input
                type="color"
                value={novaCor}
                onChange={(e) => setNovaCor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-gray-200 p-1 flex-shrink-0"
                title="Escolher cor da etiqueta"
              />

              <button
                type="submit"
                disabled={salvandoProjeto}
                className="btn-primary flex items-center justify-center gap-1.5 px-6 whitespace-nowrap cursor-pointer"
              >
                {salvandoProjeto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </button>
            </div>
          </div>
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
          <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
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

          <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
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

          <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
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
        <button onClick={handleSalvarTudo} className="btn-primary flex items-center gap-2 px-8 py-3.5 text-sm cursor-pointer shadow-lg">
          <Check className="w-4 h-4" />
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}
