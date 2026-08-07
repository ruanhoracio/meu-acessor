"use client";

import { useState } from "react";
import { Search, FileText, Tag, Plus } from "lucide-react";
import { NOTAS } from "@/lib/mock-data";

export default function NotasPage() {
  const [busca, setBusca] = useState("");
  const [tagAtiva, setTagAtiva] = useState<string | null>(null);

  const todasTags = Array.from(new Set(NOTAS.flatMap((n) => n.tags)));

  const notasFiltradas = NOTAS.filter((n) => {
    if (tagAtiva && !n.tags.includes(tagAtiva)) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return (
        (n.titulo?.toLowerCase().includes(q) ?? false) ||
        n.conteudo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="animate-fade-in-up max-w-4xl">
      {/* Busca + Tags */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Tag className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          {todasTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagAtiva(tagAtiva === tag ? null : tag)}
              className={`badge cursor-pointer whitespace-nowrap ${
                tagAtiva === tag ? "badge-accent" : "badge-neutral"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nota nova */}
        <button className="card p-6 flex flex-col items-center justify-center gap-3 border-dashed cursor-pointer transition-all min-h-[160px]"
          style={{ borderStyle: "dashed", borderColor: "var(--border-hover)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-subtle)" }}
          >
            <Plus className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nova nota
          </span>
        </button>

        {notasFiltradas.map((nota) => (
          <div
            key={nota.id}
            className="card p-5 cursor-pointer transition-all hover:border-[rgba(255,90,61,0.2)]"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <h3 className="text-sm font-semibold truncate">
                  {nota.titulo || "Sem título"}
                </h3>
              </div>
              {nota.projeto && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                  style={{ background: nota.projeto.cor }}
                  title={nota.projeto.nome}
                />
              )}
            </div>

            <p
              className="text-xs leading-relaxed mb-3 line-clamp-4"
              style={{ color: "var(--text-muted)" }}
            >
              {nota.conteudo}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {nota.tags.map((tag) => (
                  <span key={tag} className="badge badge-neutral text-[10px]">
                    {tag}
                  </span>
                ))}
              </div>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {nota.criadoEm.toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
