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
            className="font-heading text-xl font-light tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h1>
          {pathname === "/" && (
            <p className="text-xs text-muted capitalize -mt-0.5" style={{ color: "var(--text-muted)" }}>
              {dateStr}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botão Alternar Tema */}
          <ThemeToggle />

          {/* Botão Pesquisar */}
          <button
            onClick={() => setModalBuscaOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer hover:border-accent"
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
            className="w-9 h-9 rounded-full flex items-center justify-center relative transition-all cursor-pointer hover:border-accent"
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
              className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"
              style={{
                boxShadow: "0 0 10px rgba(52, 211, 153, 0.6)",
              }}
            />
          </button>

          {/* Botão + Novo */}
          <button
            onClick={() => setModalNovoOpen(true)}
            className="btn-primary cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={2.4} />
            <span>Novo</span>
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
