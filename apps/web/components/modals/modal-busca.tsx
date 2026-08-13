"use client";

import { useState, useEffect } from "react";
import { Search, X, Clapperboard, CheckSquare, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ModalPortal } from "@/components/modals/modal-portal";

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

  return (
    <ModalPortal isOpen={isOpen}>
      <div className="fixed inset-0 z-[999999] flex items-start justify-center pt-8 sm:pt-16 px-4 pb-12 bg-black/70 backdrop-blur-md overflow-y-auto">
        <div className="card w-full max-w-xl p-4 relative bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl animate-fade-in max-h-[85vh] overflow-y-auto border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 border-b pb-3 px-2 border-gray-200">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar vídeos, tarefas, clientes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full outline-none text-base font-semibold bg-transparent text-gray-900"
              autoFocus
            />
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-4 space-y-4">
            {query.trim().length <= 1 ? (
              <div className="text-center py-6 text-xs text-gray-400">
                Digite pelo menos 2 caracteres para buscar em todo o aplicativo...
              </div>
            ) : resultados.videos.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">
                Nenhum resultado encontrado para "{query}".
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase px-2">Vídeos do Pipeline</h4>
                {resultados.videos.map((v) => (
                  <Link
                    key={v.id}
                    href={`/pipeline/${v.id}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <Clapperboard className="w-4 h-4 text-accent" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{v.titulo}</p>
                        <p className="text-[10px] text-gray-400">{v.projeto?.nome || "Sem cliente"} • {v.estagio}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
