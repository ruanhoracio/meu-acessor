"use client";

import { useState, useEffect } from "react";
import { Sparkles, ChevronLeft, ChevronRight, CheckSquare, Clapperboard, Calendar, Inbox, AlertTriangle } from "lucide-react";

export interface AvisoItem {
  id: string;
  badge: string;
  titulo: string;
  descricao: string;
  cor: string;
  icon: React.ReactNode;
}

export function BannerAvisos() {
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarAlertasReais() {
      setLoading(true);
      const novosAvisos: AvisoItem[] = [];

      try {
        const [resTarefas, resVideos, resEventos, resInbox] = await Promise.all([
          fetch("/api/tarefas").then((r) => r.json()).catch(() => []),
          fetch("/api/videos").then((r) => r.json()).catch(() => []),
          fetch("/api/eventos").then((r) => r.json()).catch(() => []),
          fetch("/api/inbox/count").then((r) => r.json()).catch(() => ({ count: 0 })),
        ]);

        const hojeStr = new Date().toDateString();

        // 1. Tarefas Abertas / Hoje
        if (Array.isArray(resTarefas)) {
          const abertas = resTarefas.filter((t: any) => t.status !== "concluida" && t.status !== "cancelada");
          const tarefasHoje = abertas.filter((t: any) => {
            if (!t.prazo) return true;
            return new Date(t.prazo).toDateString() === hojeStr;
          });

          if (tarefasHoje.length > 0) {
            const primeira = tarefasHoje[0].titulo;
            novosAvisos.push({
              id: "tarefas-hoje",
              badge: "Tarefas do Dia",
              titulo: `${tarefasHoje.length} ${tarefasHoje.length === 1 ? "tarefa pendente" : "tarefas pendentes"} para hoje`,
              descricao: `Próxima tarefa: "${primeira}". Acesse a aba Tarefas para concluir.`,
              cor: "#ff5a3d",
              icon: <CheckSquare className="w-4 h-4 text-white" />,
            });
          }
        }

        // 2. Vídeos no Pipeline
        if (Array.isArray(resVideos) && resVideos.length > 0) {
          const editando = resVideos.filter((v: any) => v.estagio === "cortando" || v.estagio === "material_recebido" || v.estagio === "briefing");
          if (editando.length > 0) {
            novosAvisos.push({
              id: "videos-pipeline",
              badge: "Pipeline em Andamento",
              titulo: `${resVideos.length} ${resVideos.length === 1 ? "vídeo em produção" : "vídeos em produção"} no Pipeline`,
              descricao: `Em edição: "${editando[0].titulo}" (${editando[0].projeto?.nome || "Sem cliente"}).`,
              cor: "#3b82f6",
              icon: <Clapperboard className="w-4 h-4 text-white" />,
            });
          }
        }

        // 3. Eventos da Agenda
        if (Array.isArray(resEventos)) {
          const eventosHoje = resEventos.filter((e: any) => {
            if (!e.inicio) return false;
            return new Date(e.inicio).toDateString() === hojeStr;
          });

          if (eventosHoje.length > 0) {
            const hora = new Date(eventosHoje[0].inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            novosAvisos.push({
              id: "agenda-hoje",
              badge: "Agenda do Dia",
              titulo: `${eventosHoje.length} ${eventosHoje.length === 1 ? "compromisso agendado" : "compromissos agendados"} para hoje`,
              descricao: `Hoje às ${hora}: "${eventosHoje[0].titulo}".`,
              cor: "#10b981",
              icon: <Calendar className="w-4 h-4 text-white" />,
            });
          }
        }

        // 4. Inbox Telegram
        if (resInbox.count > 0) {
          novosAvisos.push({
            id: "inbox-pendente",
            badge: "Novidades do Telegram",
            titulo: `${resInbox.count} ${resInbox.count === 1 ? "mensagem recebida" : "mensagens recebidas"} no Inbox`,
            descricao: "Você recebeu novas mensagens pelo Telegram aguardando revisão no Web App.",
            cor: "#f59e0b",
            icon: <Inbox className="w-4 h-4 text-white" />,
          });
        }
      } catch (e) {
        console.error(e);
      }

      // Se não houver avisos reais, aviso padrão de boas-vindas
      if (novosAvisos.length === 0) {
        novosAvisos.push({
          id: "tudo-em-dia",
          badge: "Tudo em Dia",
          titulo: "Nenhum alerta pendente no momento",
          descricao: "Sua agenda, pipeline e tarefas estão em ordem. Envie novas mensagens pelo Telegram a qualquer momento!",
          cor: "#10b981",
          icon: <Sparkles className="w-4 h-4 text-white" />,
        });
      }

      setAvisos(novosAvisos);
      setLoading(false);
    }

    carregarAlertasReais();
  }, []);

  useEffect(() => {
    if (avisos.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % avisos.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [avisos.length]);

  if (loading || avisos.length === 0) return null;

  const proximo = () => setIndex((prev) => (prev + 1) % avisos.length);
  const anterior = () => setIndex((prev) => (prev - 1 + avisos.length) % avisos.length);

  const atual = avisos[index] || avisos[0];

  return (
    <div
      className="card p-5 relative overflow-hidden transition-all shadow-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800"
      style={{
        borderLeft: `5px solid ${atual.cor}`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4 items-center">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs"
            style={{ background: atual.cor }}
          >
            {atual.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="badge text-[11px] font-bold"
                style={{
                  background: `${atual.cor}18`,
                  color: atual.cor,
                }}
              >
                {atual.badge}
              </span>
              {avisos.length > 1 && (
                <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                  {index + 1} de {avisos.length}
                </span>
              )}
            </div>
            <h3 className="font-heading text-base font-bold text-gray-900 dark:text-zinc-100">
              {atual.titulo}
            </h3>
            <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
              {atual.descricao}
            </p>
          </div>
        </div>

        {avisos.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={anterior}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={proximo}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {avisos.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {avisos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-accent" : "w-1.5 bg-gray-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
