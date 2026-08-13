"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { processarCapturaInteligente } from "@/actions/captura-ia";

export function BarraCapturaIA({ onSucesso }: { onSucesso?: () => void }) {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || loading) return;

    setLoading(true);
    setFeedback(null);

    const res = await processarCapturaInteligente(texto);
    setLoading(false);

    if (res.success && res.mensagem) {
      setFeedback(res.mensagem);
      setTexto("");
      if (onSucesso) onSucesso();
      setTimeout(() => setFeedback(null), 6000);
    } else {
      setFeedback("⚠️ Não foi possível classificar. Tente novamente.");
    }
  };

  return (
    <div className="card p-3 relative overflow-hidden bg-card border border-border shadow-card">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "var(--accent)",
            boxShadow: "0 4px 12px rgba(255, 90, 61, 0.25)",
          }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>

        <input
          type="text"
          placeholder="Escreva algo em linguagem natural (ex: 'Criar VSL da Ana pra sexta 18h' ou 'Consulta dentista hoje 16:30')..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-primary placeholder:text-muted"
          disabled={loading}
        />

        <button
          type="submit"
          disabled={!texto.trim() || loading}
          className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Entendendo...</span>
            </>
          ) : (
            <>
              <span>Capturar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {feedback && (
        <div className="mt-2 pt-2 border-t flex items-center gap-2 text-xs font-bold text-success animate-fade-in-up" style={{ borderColor: "var(--border)" }}>
          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
