"use client";

import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, Inbox, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function PopoverNotificacoes({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/inbox/count")
        .then((r) => r.json())
        .then((d) => setInboxCount(d.count || 0))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-14 right-4 z-50 w-80 card p-4 bg-card shadow-elevated animate-fade-in-up">
      <div className="flex items-center justify-between border-b pb-2 mb-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-warning" />
          <span className="text-sm font-bold text-primary">Notificações</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 text-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {inboxCount > 0 ? (
          <Link
            href="/inbox"
            onClick={onClose}
            className="flex items-start gap-3 p-2.5 rounded-xl bg-warning-subtle hover:bg-warning-subtle transition-colors"
          >
            <Inbox className="w-4 h-4 text-warning mt-0.5" />
            <div>
              <p className="text-xs font-bold text-primary">{inboxCount} itens pendentes no Inbox</p>
              <p className="text-[11px] text-muted">Recebidos do Telegram para revisar</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-success-subtle text-success text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>Tudo em dia! Sem alertas pendentes.</span>
          </div>
        )}
      </div>
    </div>
  );
}
