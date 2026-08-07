"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, Plus } from "lucide-react";
import { ModalNovo } from "@/components/modals/modal-novo";
import { ModalBusca } from "@/components/modals/modal-busca";
import { PopoverNotificacoes } from "@/components/modals/popover-notificacoes";
import { BarraCapturaIA } from "@/components/dashboard/barra-captura-ia";

const PAGE_TITLES: Record<string, string> = {
  "/": "Hoje",
  "/pipeline": "Pipeline",
  "/tarefas": "Tarefas",
  "/agenda": "Agenda",
  "/notas": "Notas",
  "/referencias": "Referências",
  "/inbox": "Inbox",
  "/config": "Configurações",
};

export function Header() {
  const pathname = usePathname();
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalBuscaOpen, setModalBuscaOpen] = useState(false);
  const [popoverNotifOpen, setPopoverNotifOpen] = useState(false);

  const title = PAGE_TITLES[pathname] ??
    (pathname.startsWith("/pipeline/") ? "Vídeo" : "Meu Assessor");

  return (
    <>
      <header
        className="sticky top-0 z-20 h-[72px] flex items-center justify-between px-4 md:px-8 gap-4 relative"
        style={{
          background: "rgba(236, 236, 234, 0.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex-shrink-0 min-w-[120px]">
          <h1
            className="font-heading text-xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h1>
        </div>

        {/* Barra de Captura Inteligente por IA sempre visível no Topo */}
        <div className="flex-1 max-w-xl mx-2">
          <BarraCapturaIA />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Botão Pesquisar */}
          <button
            onClick={() => setModalBuscaOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:bg-white"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-xs)",
            }}
            title="Pesquisar (Cmd+K)"
          >
            <Search className="w-4 h-4" strokeWidth={1.8} />
          </button>

          {/* Botão Notificações */}
          <button
            onClick={() => setPopoverNotifOpen(!popoverNotifOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center relative transition-all cursor-pointer hover:bg-white"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-xs)",
            }}
            title="Notificações"
          >
            <Bell className="w-4 h-4" strokeWidth={1.8} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full pulse-dot"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 8px var(--accent-glow)",
                border: "2px solid var(--bg-primary)",
              }}
            />
          </button>

          {/* Botão + Novo */}
          <button
            onClick={() => setModalNovoOpen(true)}
            className="btn-primary flex items-center gap-1.5 text-[13px] py-2.5 px-5 cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            <span className="hide-mobile">Novo</span>
          </button>
        </div>

        {/* Popover Notificações */}
        <PopoverNotificacoes
          isOpen={popoverNotifOpen}
          onClose={() => setPopoverNotifOpen(false)}
        />
      </header>

      {/* Modais */}
      <ModalNovo
        isOpen={modalNovoOpen}
        onClose={() => setModalNovoOpen(false)}
      />

      <ModalBusca
        isOpen={modalBuscaOpen}
        onClose={() => setModalBuscaOpen(false)}
      />
    </>
  );
}
