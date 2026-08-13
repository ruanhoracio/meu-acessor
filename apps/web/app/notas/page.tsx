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
    <div className="animate-fade-in-up space-y-6 max-w-5xl mx-auto pb-16">
      {/* Busca + Tags */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
          />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input pl-10 text-xs font-mono"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Tag className="w-4 h-4 flex-shrink-0 text-muted" />
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
        <button className="card p-6 flex flex-col items-center justify-center gap-3 border-dashed cursor-pointer transition-all min-h-[160px] hover:border-[#c6f91f]">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#c6f91f]/10 border border-[#c6f91f]/30"
          >
            <Plus className="w-5 h-5 text-accent" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Nova nota
          </span>
        </button>

        {notasFiltradas.map((nota) => (
          <div
            key={nota.id}
            className="card p-5 cursor-pointer transition-all hover:border-[#c6f91f] rounded-xl"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <h3 className="font-heading text-base font-light text-primary truncate">
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

            <p className="text-xs text-secondary leading-relaxed mb-3 line-clamp-4 font-mono">
              {nota.conteudo}
            </p>

            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-dashed border-border">
              <span className="text-muted font-mono text-[10px]">
                {new Date(nota.criadoEm).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
              <div className="flex items-center gap-1">
                {nota.tags.map((tag) => (
                  <span key={tag} className="badge badge-neutral text-[9px] font-mono">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
