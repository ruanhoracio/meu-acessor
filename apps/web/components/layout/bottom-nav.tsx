"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clapperboard,
  CheckSquare,
  Calendar,
  MoreHorizontal,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Hoje", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Clapperboard },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/notas", label: "Mais", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 hide-desktop"
      style={{
        background: "rgba(236, 236, 234, 0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-around h-[72px] px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all"
              style={{
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                background: isActive ? "var(--bg-surface)" : "transparent",
              }}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.6} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
