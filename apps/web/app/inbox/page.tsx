"use client";

import { useState, useEffect } from "react";
import {
  Mic,
  Link2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  getInboxItems,
  marcarInboxProcessado,
  marcarTodosInboxProcessados,
} from "@/actions/inbox";

const TIPO_ICONS: Record<string, React.ReactNode> = {
  texto: <span className="text-lg">💬</span>,
  audio: <Mic className="w-4 h-4" />,
  foto: <span className="text-lg">📷</span>,
  link: <Link2 className="w-4 h-4" />,
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pendente: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "var(--warning)",
    label: "Pendente",
  },
  processado: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "var(--success)",
    label: "Processado",
  },
  erro: {
    icon: <XCircle className="w-4 h-4" />,
    color: "var(--danger)",
    label: "Erro",
  },
};

export default function InboxPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    const res = await getInboxItems();
    if (res.success) {
      setItems(res.items);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleMarcarUm = async (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "processado" } : item))
    );
    await marcarInboxProcessado(id);
    carregar();
  };

  const handleMarcarTodos = async () => {
    setLoading(true);
    setItems((prev) =>
      prev.map((item) => ({ ...item, status: "processado" }))
    );
    await marcarTodosInboxProcessados();
    await carregar();
    setLoading(false);
  };

  const pendentes = items.filter((i) => i.status !== "processado");

  return (
    <div className="animate-fade-in-up max-w-3xl">
      {/* Status bar */}
      <div className="card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full pulse-dot"
            style={{ background: pendentes.length > 0 ? "var(--warning)" : "var(--success)" }}
          />
          <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            {pendentes.length > 0
              ? `${pendentes.length} ${pendentes.length === 1 ? "item" : "itens"} pendentes`
              : "Inbox totalmente lido! 🎉"}
          </span>
        </div>
        {pendentes.length > 0 && (
          <button
            onClick={handleMarcarTodos}
            disabled={loading}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            {loading ? "Processando..." : "Marcar todos como lidos"}
          </button>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map((item) => {
          const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pendente;
          const criadoEm = new Date(item.criadoEm);

          return (
            <div
              key={item.id}
              className="card p-5 transition-all"
              style={
                item.status !== "processado"
                  ? { borderColor: "var(--border-hover)", background: "#ffffff" }
                  : { opacity: 0.65 }
              }
            >
              <div className="flex items-start gap-4">
                {/* Type icon */}
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "var(--bg-surface)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {TIPO_ICONS[item.tipoMidia] || TIPO_ICONS.texto}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="badge badge-neutral text-[10px] capitalize">
                      {item.origem}
                    </span>
                    <span className="badge badge-neutral text-[10px] capitalize">
                      {item.tipoMidia}
                    </span>
                    <span
                      className="badge text-[10px] flex items-center gap-1 font-semibold"
                      style={{
                        background: `${status.color}15`,
                        color: status.color,
                      }}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>

                  {item.transcricao && (
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      {item.transcricao}
                    </p>
                  )}

                  {!item.transcricao && (
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      {item.conteudoBruto}
                    </p>
                  )}

                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {criadoEm.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {criadoEm.toLocaleDateString("pt-BR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>

                {/* Action button: Marcar como lido/processado */}
                {item.status !== "processado" && (
                  <button
                    onClick={() => handleMarcarUm(item.id)}
                    className="flex-shrink-0 btn-ghost text-xs py-1.5 px-3 flex items-center gap-1 font-semibold cursor-pointer"
                    title="Marcar como lido"
                  >
                    <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
                    Concluir
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
              Nenhuma mensagem capturada no Inbox
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
