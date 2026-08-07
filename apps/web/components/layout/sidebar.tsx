"use client";

import { useState, useEffect, useRef } from "react";
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
  Camera,
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
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const avatarSalvo = localStorage.getItem("ruan_user_avatar");
    if (avatarSalvo) setUserAvatar(avatarSalvo);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        if (base64) {
          localStorage.setItem("ruan_user_avatar", base64);
          setUserAvatar(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-[260px] border-r flex flex-col z-30 hide-mobile"
      style={{
        background: "var(--bg-sidebar)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo única meuacessor.svg */}
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

        {/* User avatar com upload de foto do computador */}
        <div className="mt-5 mx-3 flex items-center gap-3">
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
            className="relative group w-9 h-9 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border hover:opacity-90 transition-all"
            style={{ borderColor: "var(--border)" }}
            title="Clique para escolher foto do seu computador"
          >
            {userAvatar ? (
              <Image src={userAvatar} alt="Foto de perfil" fill className="object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, var(--accent), #c22f16)",
                  boxShadow: "0 3px 10px rgba(255, 90, 61, 0.25)",
                }}
              >
                R
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </button>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>Ruan</p>
            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>Editor de Vídeo</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
