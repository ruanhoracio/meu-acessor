import { clsx } from "clsx";

export function cn(...inputs: (string | undefined | null | false)[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return formatDate(d);
}

export function horasParaTexto(horas: number): string {
  if (horas < 1) return `${Math.round(horas * 60)}min`;
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return m > 0 ? `${h}h${m}` : `${h}h`;
}
