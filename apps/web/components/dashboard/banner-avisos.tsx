"use client";

import { useState, useEffect } from "react";
import { Sparkles, ChevronLeft, ChevronRight, Zap, Flame, ShieldAlert, Inbox, Calendar } from "lucide-react";

export interface AvisoItem {
  id: string;
  badge: string;
  titulo: string;
  descricao: string;
  cor: string;
  icon: React.ReactNode;
}

const AVISOS_DICAS: AvisoItem[] = [
  {
    id: "dica-1",
    badge: "Assessor Proativo",
    titulo: "Captura Ultra-Rápida pelo Telegram",
    descricao: "Mande qualquer texto, áudio de voz ou link de referência para o seu robô no Telegram. Ele organiza tudo automaticamente no seu painel em 2 segundos!",
    cor: "var(--accent)",
    icon: <Sparkles className="w-4 h-4 text-white" />,
  },
  {
    id: "dica-2",
    badge: "Dica de Produtividade",
    titulo: "Mantenha o Foco no Pipeline",
    descricao: "Inicie uma sessão de foco cronometrada nos seus vídeos para registrar automaticamente as horas reais dedicadas à edição de cada cliente.",
    cor: "#3b82f6",
    icon: <Zap className="w-4 h-4 text-white" />,
  },
  {
    id: "dica-3",
    badge: "Lembrete Matinal 08:00",
    titulo: "Resumo Diário Automático no Telegram",
    descricao: "Todo dia às 08:00 o seu robô te envia no Telegram a lista de compromissos da agenda, tarefas do dia e vídeos prioritários.",
    cor: "#10b981",
    icon: <Flame className="w-4 h-4 text-white" />,
  },
];

export function BannerAvisos() {
  const [avisosReais, setAvisosReais] = useState<AvisoItem[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    async function carregarAlertasReais() {
      const novosAvisos: AvisoItem[] = [];

      try {
        const [resInbox, resDash] = await Promise.all([
          fetch("/api/inbox/count").then((r) => r.json()).catch(() => ({ count: 0 })),
          fetch("/api/videos").then((r) => r.json()).catch(() => []),
        ]);

        if (resInbox.count > 0) {
          novosAvisos.push({
            id: "inbox-pendente",
            badge: "Atenção no Inbox",
            titulo: `${resInbox.count} ${resInbox.count === 1 ? "mensagem pendente" : "mensagens pendentes"} no Inbox`,
            descricao: "Você recebeu novas mensagens ou áudios do Telegram aguardando revisão. Acesse a aba Inbox para concluir.",
            cor: "#f59e0b",
            icon: <Inbox className="w-4 h-4 text-white" />,
          });
        }

        if (Array.isArray(resDash)) {
          const travados = resDash.filter((v: any) => {
            const ev = v.ultimoEvento ? new Date(v.ultimoEvento) : new Date(v.criadoEm);
            return Math.floor((Date.now() - ev.getTime()) / (1000 * 60 * 60 * 24)) >= 3;
          });

          if (travados.length > 0) {
            novosAvisos.push({
              id: "videos-travados",
              badge: "Alerta de Estagnação",
              titulo: `${travados.length} ${travados.length === 1 ? "vídeo travado" : "vídeos travados"} no Pipeline`,
              descricao: `O vídeo "${travados[0].titulo}" está parado há mais de 3 dias no mesmo estágio. Vale a pena verificar!`,
              cor: "#ef4444",
              icon: <ShieldAlert className="w-4 h-4 text-white" />,
            });
          }
        }
      } catch (e) {
        console.error(e);
      }

      setAvisosReais(novosAvisos);
    }

    carregarAlertasReais();
  }, []);

  const listaCompleta = [...avisosReais, ...AVISOS_DICAS];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % listaCompleta.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [listaCompleta.length]);

  const proximo = () => setIndex((prev) => (prev + 1) % listaCompleta.length);
  const anterior = () => setIndex((prev) => (prev - 1 + listaCompleta.length) % listaCompleta.length);

  const atual = listaCompleta[index] || AVISOS_DICAS[0];

  return (
    <div
      className="card p-5 relative overflow-hidden transition-all"
      style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f9f9f8 100%)",
        borderLeft: `5px solid ${atual.cor}`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs"
            style={{ background: atual.cor }}
          >
            {atual.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="badge text-[11px] font-bold"
                style={{
                  background: `${atual.cor}18`,
                  color: atual.cor,
                }}
              >
                {atual.badge}
              </span>
              <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Aviso {index + 1} de {listaCompleta.length}
              </span>
            </div>
            <h3 className="font-heading text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {atual.titulo}
            </h3>
            <p className="text-xs mt-1 leading-relaxed max-w-2xl" style={{ color: "var(--text-secondary)" }}>
              {atual.descricao}
            </p>
          </div>
        </div>

        {/* Controles do carrossel */}
        <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
          <button
            onClick={anterior}
            className="w-8 h-8 rounded-full flex items-center justify-center border hover:bg-black/5 transition-all cursor-pointer"
            style={{ borderColor: "var(--border)" }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={proximo}
            className="w-8 h-8 rounded-full flex items-center justify-center border hover:bg-black/5 transition-all cursor-pointer"
            style={{ borderColor: "var(--border)" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Indicadores de bolinhas */}
      <div className="flex justify-center gap-1.5 mt-3">
        {listaCompleta.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className="h-1.5 rounded-full transition-all cursor-pointer"
            style={{
              width: i === index ? "20px" : "6px",
              background: i === index ? atual.cor : "var(--border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
