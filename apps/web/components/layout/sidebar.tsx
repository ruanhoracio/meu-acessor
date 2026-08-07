"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clapperboard,
  CheckSquare,
  Calendar,
  FileText,
  Bookmark,
  Inbox,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Hoje", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Clapperboard },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/notas", label: "Notas", icon: FileText },
  { href: "/referencias", label: "Referências", icon: Bookmark },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

export function Sidebar() {
  const pathname = usePathname();
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    const buscarInbox = () => {
      fetch("/api/inbox/count")
        .then((r) => r.json())
        .then((d) => setInboxCount(d.count || 0))
        .catch(() => {});
    };

    buscarInbox();
    const interval = setInterval(buscarInbox, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[260px] border-r flex flex-col z-30 hide-mobile"
      style={{
        background: "var(--bg-sidebar)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo única meuacessor.svg em tamanho mais compacto e elegante */}
      <div
        className="px-6 h-[72px] flex items-center border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="relative w-[135px] h-[38px]">
          <Image
            src="/meuacessor.svg"
            alt="Meu Assessor"
            fill
            className="object-contain object-left"
            priority
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
              {item.label}
              {item.href === "/inbox" && inboxCount > 0 && (
                <span
                  className="ml-auto text-[11px] font-bold py-0.5 px-2 rounded-full transition-all"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.25)" : "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {inboxCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <Link href="/config" className={`sidebar-link ${pathname === "/config" ? "active" : ""}`}>
          <Settings className="w-[18px] h-[18px]" strokeWidth={1.8} />
          Configurações
        </Link>

        {/* User avatar */}
        <div className="mt-5 mx-3 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, var(--accent), #c22f16)",
              color: "#fff",
              boxShadow: "0 3px 10px rgba(255, 90, 61, 0.25)",
            }}
          >
            R
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>Ruan</p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Editor de Vídeo</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
