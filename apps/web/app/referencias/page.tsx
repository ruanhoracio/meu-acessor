"use client";

import { useState } from "react";
import {
  ExternalLink,
  Tag,
  Plus,
  Play,
  Palette,
  Sparkles,
  Layers,
  Type,
  BookOpen,
} from "lucide-react";
import { REFERENCIAS } from "@/lib/mock-data";

const TAG_ICONS: Record<string, React.ReactNode> = {
  "transição": <Layers className="w-3 h-3" />,
  "hook": <Sparkles className="w-3 h-3" />,
  "storytelling": <BookOpen className="w-3 h-3" />,
  "color": <Palette className="w-3 h-3" />,
  "motion": <Play className="w-3 h-3" />,
  "tipografia": <Type className="w-3 h-3" />,
};

const GRADIENT_BG = [
  "linear-gradient(135deg, rgba(198, 249, 31, 0.1) 0%, rgba(5, 8, 10, 0.8) 100%)",
  "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(5, 8, 10, 0.8) 100%)",
  "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(5, 8, 10, 0.8) 100%)",
  "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 8, 10, 0.8) 100%)",
];

export default function ReferenciasPage() {
  const [tagAtiva, setTagAtiva] = useState<string | null>(null);

  const todasTags = Array.from(new Set(REFERENCIAS.flatMap((r) => r.tags)));

  const refsFiltradas = tagAtiva
    ? REFERENCIAS.filter((r) => r.tags.includes(tagAtiva))
    : REFERENCIAS;

  return (
    <div className="animate-fade-in-up space-y-6 max-w-6xl mx-auto pb-16">
      {/* Tags */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Tag className="w-4 h-4 flex-shrink-0 text-muted" />
        <button
          onClick={() => setTagAtiva(null)}
          className={`badge cursor-pointer whitespace-nowrap ${!tagAtiva ? "badge-accent" : "badge-neutral"}`}
        >
          Todas
        </button>
        {todasTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setTagAtiva(tagAtiva === tag ? null : tag)}
            className={`badge cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              tagAtiva === tag ? "badge-accent" : "badge-neutral"
            }`}
          >
            {TAG_ICONS[tag]}
            {tag}
          </button>
        ))}
      </div>

      {/* Grade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Adicionar referência */}
        <button className="card p-8 flex flex-col items-center justify-center gap-3 border-dashed cursor-pointer transition-all min-h-[200px] hover:border-[#c6f91f]">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center bg-[#c6f91f]/10 border border-[#c6f91f]/30"
          >
            <Plus className="w-5 h-5 text-accent" />
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted">
            Salvar referência
          </span>
        </button>

        {refsFiltradas.map((ref, i) => (
          <div
            key={ref.id}
            className="card overflow-hidden cursor-pointer transition-all hover:border-[#c6f91f] group rounded-xl"
          >
            {/* Thumbnail placeholder */}
            <div
              className="h-36 relative flex items-center justify-center border-b border-dashed border-border"
              style={{ background: GRADIENT_BG[i % GRADIENT_BG.length] }}
            >
              <div className="text-center px-4">
                <Play
                  className="w-10 h-10 mx-auto mb-2 opacity-30 group-hover:opacity-80 transition-opacity text-[#c6f91f]"
                />
                <p className="text-xs font-mono text-muted truncate max-w-[200px]">
                  {ref.url}
                </p>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4">
              <h3 className="font-heading text-base font-light text-primary mb-1">
                {ref.titulo}
              </h3>
              <p className="text-xs text-secondary mb-3 line-clamp-2">
                {/* Assuming 'nota' exists in the data, if not available in data, replace with appropriate field */}
                {(ref as any).nota}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {ref.tags.map((tag) => (
                    <span key={tag} className="badge badge-neutral text-[9px] font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-muted hover:text-accent transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
