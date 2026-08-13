"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, Plus } from "lucide-react";
import { ModalNovo } from "@/components/modals/modal-novo";
import { ModalBusca } from "@/components/modals/modal-busca";
import { PopoverNotificacoes } from "@/components/modals/popover-notificacoes";
import { ThemeToggle } from "@/components/theme-toggle";

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

  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <header
        className="sticky top-0 z-20 h-[64px] flex items-center justify-between px-4 md:px-8 relative backdrop-blur-md transition-all"
        style={{
          background: "var(--bg-primary)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <div>
          <h1
            className="font-heading text-lg font-bold uppercase tracking-wider"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h1>
          {pathname === "/" && (
            <p className="text-[11px] font-mono capitalize -mt-0.5" style={{ color: "var(--text-muted)" }}>
              {dateStr}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botão Alternar Tema */}
          <ThemeToggle />

          {/* Botão Pesquisar */}
          <button
            onClick={() => setModalBuscaOpen(true)}
            className="w-8 h-8 rounded flex items-center justify-center transition-all cursor-pointer hover:border-accent"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "0.5px solid var(--border)",
              boxShadow: "var(--shadow-xs)",
            }}
            title="Pesquisar (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>

          {/* Botão Notificações */}
          <button
            onClick={() => setPopoverNotifOpen(!popoverNotifOpen)}
            className="w-8 h-8 rounded flex items-center justify-center relative transition-all cursor-pointer hover:border-accent"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-secondary)",
              border: "0.5px solid var(--border)",
              boxShadow: "var(--shadow-xs)",
            }}
            title="Notificações"
          >
            <Bell className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full pulse-dot"
              style={{
                background: "var(--accent)",
                boxShadow: "0 0 8px var(--accent-glow)",
              }}
            />
          </button>

          {/* Botão + Novo */}
          <button
            onClick={() => setModalNovoOpen(true)}
            className="btn-primary flex items-center gap-1.5 text-[11px] font-mono font-bold py-2 px-4 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
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
