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
  "linear-gradient(135deg, #fef2f0 0%, #ececea 100%)",
  "linear-gradient(135deg, #eef2fa 0%, #ececea 100%)",
  "linear-gradient(135deg, #eefaf2 0%, #ececea 100%)",
  "linear-gradient(135deg, #fafaee 0%, #ececea 100%)",
];

export default function ReferenciasPage() {
  const [tagAtiva, setTagAtiva] = useState<string | null>(null);

  const todasTags = Array.from(new Set(REFERENCIAS.flatMap((r) => r.tags)));

  const refsFiltradas = tagAtiva
    ? REFERENCIAS.filter((r) => r.tags.includes(tagAtiva))
    : REFERENCIAS;

  return (
    <div className="animate-fade-in-up">
      {/* Tags */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <Tag className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
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
        <button className="card p-8 flex flex-col items-center justify-center gap-3 border-dashed cursor-pointer transition-all min-h-[200px]"
          style={{ borderStyle: "dashed", borderColor: "var(--border-hover)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--accent-subtle)" }}
          >
            <Plus className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Salvar referência
          </span>
        </button>

        {refsFiltradas.map((ref, i) => (
          <div
            key={ref.id}
            className="card overflow-hidden cursor-pointer transition-all hover:border-[rgba(255,90,61,0.2)] group"
          >
            {/* Thumbnail placeholder */}
            <div
              className="h-36 relative flex items-center justify-center"
              style={{ background: GRADIENT_BG[i % GRADIENT_BG.length] }}
            >
              <div className="text-center px-4">
                <Play
                  className="w-10 h-10 mx-auto mb-2 opacity-20 group-hover:opacity-50 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                />
                <p className="text-xs truncate max-w-[200px]" style={{ color: "var(--text-muted)" }}>
                  {ref.url}
                </p>
              </div>
              {/* Hover overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-t-[21px]"
                style={{ background: "rgba(26,26,26,0.6)" }}
              >
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir
                </a>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="text-sm font-medium mb-2 line-clamp-2">
                {ref.titulo}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ref.tags.map((tag) => (
                  <span key={tag} className="badge badge-neutral text-[10px] flex items-center gap-1">
                    {TAG_ICONS[tag]}
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
