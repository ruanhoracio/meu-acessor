"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const sync = () => {
      const savedTheme = localStorage.getItem("theme");
      const dark = savedTheme !== "light";
      setIsDark(dark);
      document.documentElement.classList.toggle("dark", dark);
    };

    sync();

    // Mantém as instâncias do toggle (header + sidebar) sincronizadas
    window.addEventListener("theme_changed", sync);
    return () => window.removeEventListener("theme_changed", sync);
  }, []);

  const toggleTheme = () => {
    const novoDark = !isDark;
    localStorage.setItem("theme", novoDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", novoDark);
    setIsDark(novoDark);
    window.dispatchEvent(new Event("theme_changed"));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 px-3 rounded-lg border border-dashed border-border bg-card text-secondary hover:text-primary hover:border-accent transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-mono font-bold tracking-wider uppercase shadow-xs"
      title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-accent" />
          <span className="hidden sm:inline">Modo Claro</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-secondary" />
          <span className="hidden sm:inline">Modo Escuro</span>
        </>
      )}
    </button>
  );
}
