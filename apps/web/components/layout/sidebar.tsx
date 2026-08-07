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
  const [nomeUsuario, setNomeUsuario] = useState("Ruan");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const avatarSalvo = localStorage.getItem("ruan_user_avatar");
    if (avatarSalvo) setUserAvatar(avatarSalvo);

    const nomeSalvo = localStorage.getItem("ruan_user_name");
    if (nomeSalvo) setNomeUsuario(nomeSalvo);

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

        {/* User avatar com redimensionador de foto */}
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
            className="relative group w-10 h-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer border-2 hover:opacity-90 transition-all shadow-xs"
            style={{ borderColor: "var(--accent)" }}
            title="Clique para escolher e redimensionar foto do seu computador"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, var(--accent), #c22f16)",
                }}
              >
                {nomeUsuario.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </button>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{nomeUsuario}</p>
            <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>Editor de Vídeo</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
