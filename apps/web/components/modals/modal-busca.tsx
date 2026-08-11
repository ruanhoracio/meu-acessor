"use client";

import { useState, useEffect } from "react";
import { Search, X, Clapperboard, CheckSquare, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

export function ModalBusca({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<{
    videos: any[];
    tarefas: any[];
    eventos: any[];
  }>({ videos: [], tarefas: [], eventos: [] });

  useEffect(() => {
    if (query.trim().length > 1) {
      Promise.all([
        fetch("/api/videos").then((r) => r.json()).catch(() => []),
        fetch("/api/dashboard").then((r) => r.json()).catch(() => ({ tarefasHoje: [], eventosHoje: [] })),
      ]).then(([videos, dash]) => {
        const q = query.toLowerCase();
        const vFiltrados = (Array.isArray(videos) ? videos : []).filter(
          (v: any) => v.titulo.toLowerCase().includes(q) || v.projeto?.nome?.toLowerCase().includes(q)
        );
        setResultados({
          videos: vFiltrados,
          tarefas: [],
          eventos: [],
        });
      });
    } else {
      setResultados({ videos: [], tarefas: [], eventos: [] });
    }
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="card w-full max-w-xl p-4 relative bg-white shadow-2xl rounded-2xl animate-fade-in">
        <div className="flex items-center gap-3 border-b pb-3 px-2" style={{ borderColor: "var(--border)" }}>
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar vídeos, tarefas, clientes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full outline-none text-base font-semibold bg-transparent"
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[350px] overflow-y-auto py-2">
          {resultados.videos.length > 0 && (
            <div className="mb-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase px-3 block mb-2">Vídeos</span>
              {resultados.videos.map((v) => (
                <Link
                  key={v.id}
                  href={`/pipeline/${v.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clapperboard className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{v.titulo}</p>
                      <p className="text-xs text-gray-500">{v.projeto?.nome || "Sem cliente"}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Link>
              ))}
            </div>
          )}

          {query.length > 1 && resultados.videos.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">Nenhum resultado encontrado para "{query}"</p>
          )}

          {query.length <= 1 && (
            <p className="text-xs text-gray-400 text-center py-8">Digite pelo menos 2 caracteres para pesquisar</p>
          )}
        </div>
      </div>
    </div>
  );
}
