"use client";

import { useState, useEffect } from "react";
import { Sparkles, ChevronLeft, ChevronRight, Bell, Zap, Flame, ShieldAlert } from "lucide-react";

export interface AvisoItem {
  id: string;
  badge: string;
  titulo: string;
  descricao: string;
  cor: string;
  icon: React.ReactNode;
}

const AVISOS_PADRAO: AvisoItem[] = [
  {
    id: "1",
    badge: "Assessor Proativo",
    titulo: "Captura Ultra-Rápida pelo Telegram",
    descricao: "Mande qualquer texto, áudio de voz ou link de referência para o seu robô no Telegram. Ele organiza tudo automaticamente no seu painel em 2 segundos!",
    cor: "var(--accent)",
    icon: <Sparkles className="w-4 h-4 text-white" />,
  },
  {
    id: "2",
    badge: "Dica de Produtividade",
    titulo: "Mantenha o Foco no Pipeline",
    descricao: "Inicie uma sessão de foco cronometrada nos seus vídeos para registrar automaticamente as horas reais dedicadas à edição de cada cliente.",
    cor: "#3b82f6",
    icon: <Zap className="w-4 h-4 text-white" />,
  },
  {
    id: "3",
    badge: "Rotinas Inteligentes",
    titulo: "Resumos às 7h e Checagem às 14h",
    descricao: "Seu Assessor te envia relatórios diários no Telegram para garantir que nenhum prazo de vídeo ou tarefa passe despercebido.",
    cor: "#10b981",
    icon: <Flame className="w-4 h-4 text-white" />,
  },
  {
    id: "4",
    badge: "Anti-Gargalo",
    titulo: "Alerta de Vídeos Travados",
    descricao: "Vídeos parados há mais de 3 dias no mesmo estágio recebem destaque em vermelho e notificações automáticas.",
    cor: "#f59e0b",
    icon: <ShieldAlert className="w-4 h-4 text-white" />,
  },
];

export function BannerAvisos({ avisosAdicionais = [] }: { avisosAdicionais?: AvisoItem[] }) {
  const listaAvisos = [...avisosAdicionais, ...AVISOS_PADRAO];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % listaAvisos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [listaAvisos.length]);

  const proximo = () => setIndex((prev) => (prev + 1) % listaAvisos.length);
  const anterior = () => setIndex((prev) => (prev - 1 + listaAvisos.length) % listaAvisos.length);

  const atual = listaAvisos[index];

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
                Aviso {index + 1} de {listaAvisos.length}
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
        {listaAvisos.map((_, i) => (
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
