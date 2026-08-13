"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clapperboard,
  CheckSquare,
  ClipboardCheck,
  Calendar,
  FileText,
  Bookmark,
  Inbox,
  Settings,
  Camera,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Hoje", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Clapperboard },
  { href: "/entregas", label: "Entregas", icon: ClipboardCheck },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/notas", label: "Notas", icon: FileText },
  { href: "/referencias", label: "Referências", icon: Bookmark },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

export function Sidebar() {
  const pathname = usePathname();
  const [inboxCount, setInboxCount] = useState(0);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [nomeUsuario, setNomeUsuario] = useState("Ruan");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const syncUser = () => {
      const avatarSalvo = localStorage.getItem("ruan_user_avatar");
      if (avatarSalvo) setUserAvatar(avatarSalvo);

      const nomeSalvo = localStorage.getItem("ruan_user_name");
      if (nomeSalvo) setNomeUsuario(nomeSalvo);
    };

    syncUser();

    const buscarInbox = () => {
      fetch("/api/inbox/count")
        .then((r) => r.json())
        .then((d) => setInboxCount(d.count || 0))
        .catch(() => {});
    };

    buscarInbox();
    const interval = setInterval(buscarInbox, 5000);

    window.addEventListener("storage_user_updated", syncUser);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage_user_updated", syncUser);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = document.createElement("img");
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 300;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
            const croppedBase64 = canvas.toDataURL("image/jpeg", 0.9);
            localStorage.setItem("ruan_user_avatar", croppedBase64);
            setUserAvatar(croppedBase64);
          }
        };
        img.src = evt.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[260px] border-r flex flex-col z-30 hide-mobile transition-all"
      style={{
        background: "var(--bg-sidebar)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo vetorial oficial Meu Assessor com marca d'água Vektor */}
      <div
        className="px-5 h-[76px] flex items-center justify-between border-b relative overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="relative w-[150px] h-[48px]">
          <Image
            src="/logo-header.svg"
            alt="Meu Assessor"
            fill
            className="object-contain object-left dark:brightness-125 transition-all"
            priority
          />
        </div>
        <span className="font-mono text-[9px] font-bold text-accent px-1.5 py-0.5 rounded border border-accent/30 bg-accent/10 uppercase tracking-widest">
          v2.5
        </span>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-accent/50 via-accent to-transparent" />
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
              <Icon className="w-[16px] h-[16px]" strokeWidth={isActive ? 2.4 : 1.8} />
              <span className="tracking-widest uppercase font-mono text-[11px] font-bold">{item.label}</span>
              {item.href === "/inbox" && inboxCount > 0 && (
                <span
                  className="ml-auto text-[10px] font-mono font-bold py-0.5 px-2 rounded transition-all"
                  style={{
                    background: "var(--accent)",
                    color: "#080808",
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
      <div className="px-3 py-4 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
        <div className="px-1">
          <ThemeToggle />
        </div>
        <Link href="/config" className={`sidebar-link ${pathname === "/config" ? "active" : ""}`}>
          <Settings className="w-[16px] h-[16px]" strokeWidth={1.8} />
          <span className="tracking-widest uppercase font-mono text-[11px] font-bold">Configurações</span>
        </Link>

        {/* User avatar com redimensionador de foto */}
        <div className="mt-3 mx-1 p-3 rounded-2xl border border-border bg-card flex items-center gap-3 shadow-xs">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group w-9 h-9 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border border-accent/40 hover:border-accent transition-all shadow-xs"
            title="Clique para escolher e redimensionar foto do seu computador"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-950"
                style={{
                  background: "var(--accent-gradient)",
                }}
              >
                {nomeUsuario.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <p className="text-xs font-bold truncate text-primary">{nomeUsuario}</p>
            </div>
            <p className="text-[10px] text-muted truncate">Assessor Ativo</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
