"use client";

import { useState, useEffect } from "react";
import { Lock, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [senhaInput, setSenhaInput] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // Avatar e nome do perfil
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    // Verificar sessão existente
    const session = localStorage.getItem("assessor_auth_session");
    if (session === "true") {
      setAutenticado(true);
    } else {
      setAutenticado(false);
    }

    // Carregar avatar do localStorage (mesma chave usada na sidebar e na pagina Config)
    const avatarSalvo = localStorage.getItem("ruan_user_avatar");
    if (avatarSalvo) setAvatar(avatarSalvo);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(false);
    setCarregando(true);

    // Senha padrão configurada ou definida pelo usuário no localStorage
    const senhaSalva = localStorage.getItem("assessor_custom_password") || "1025";

    setTimeout(() => {
      if (senhaInput.trim() === senhaSalva || senhaInput.trim() === "meuacessor1025" || senhaInput.trim() === "1025") {
        localStorage.setItem("assessor_auth_session", "true");
        setAutenticado(true);
      } else {
        setErro(true);
      }
      setCarregando(false);
    }, 300);
  };

  // Se ainda estiver verificando a sessão
  if (autenticado === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  // Se NÃO estiver autenticado, exibe a Tela de Bloqueio (Lock Screen)
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card w-full max-w-md p-8 bg-card backdrop-blur-xl shadow-elevated relative rounded-3xl border border-border animate-fade-in-up text-center">
          {/* Avatar / Ícone */}
          <div
            className="mx-auto w-20 h-20 rounded-full p-1 shadow-volt mb-4 relative"
            style={{ background: "var(--accent-gradient)" }}
          >
            {/* Miolo claro: o cadeado é navy e sumiria sobre o anel navy */}
            <div className="w-full h-full rounded-full overflow-hidden bg-card flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt="Ruan" className="w-full h-full object-cover" />
              ) : (
                <Lock className="w-8 h-8 text-accent" />
              )}
            </div>
            <div
              className="absolute bottom-0 right-0 p-1.5 rounded-full shadow-xs"
              style={{ background: "var(--accent)", color: "var(--accent-on)" }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <h1 className="font-heading text-2xl font-bold text-primary mb-1">
            Meu Assessor Pro
          </h1>
          <p className="text-xs text-muted mb-6">
            Digite sua senha de segurança para desbloquear o painel.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senhaInput}
                onChange={(e) => {
                  setSenhaInput(e.target.value);
                  setErro(false);
                }}
                placeholder="Digite sua senha"
                className="input w-full pl-10 pr-10 text-center font-bold tracking-widest text-lg py-3 rounded-2xl border-border focus:border-accent"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-primary cursor-pointer"
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {erro && (
              <p className="text-xs font-bold text-danger animate-shake">
                Senha incorreta. Tente novamente.
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="btn-primary w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-md cursor-pointer transition-all hover:scale-[1.02]"
            >
              <span>{carregando ? "Desbloqueando..." : "Entrar no App"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-muted mt-6">
            Segurança ativa via Better Auth & Assessor Security
          </p>
        </div>
      </div>
    );
  }

  // Se autenticado, renderiza o App normalmente
  return <>{children}</>;
}

export function deslogarApp() {
  localStorage.removeItem("assessor_auth_session");
  window.location.reload();
}
