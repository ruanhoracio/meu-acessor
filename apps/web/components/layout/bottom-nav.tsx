"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clapperboard,
  ClipboardCheck,
  CheckSquare,
  Calendar,
  MoreHorizontal,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Hoje", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Clapperboard },
  { href: "/entregas", label: "Entregas", icon: ClipboardCheck },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/notas", label: "Mais", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 hide-desktop select-none"
      style={{
        background: "var(--bg-sidebar)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "0.5px solid var(--border)",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-center justify-around h-[64px] px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded transition-all cursor-pointer"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                background: isActive ? "var(--accent-subtle)" : "transparent",
                border: isActive ? "0.5px solid var(--accent)" : "0.5px solid transparent",
              }}
            >
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2.4 : 1.7} />
              <span className={`text-[9px] font-mono uppercase tracking-widest ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
