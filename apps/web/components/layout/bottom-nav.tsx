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
      className="fixed bottom-0 left-0 right-0 z-40 hide-desktop select-none"
      style={{
        background: "rgba(236, 236, 234, 0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid var(--border)",
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
              className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all cursor-pointer"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                background: isActive ? "rgba(255, 90, 61, 0.08)" : "transparent",
              }}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.4 : 1.7} />
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
