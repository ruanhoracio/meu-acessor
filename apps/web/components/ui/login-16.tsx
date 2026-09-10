"use client";

/**
 * Tela de login.
 *
 * Anatomia do "login-16" (shadcn), reescrita sobre os tokens do nosso design
 * system. Sem provedores sociais: Google/Apple não estão configurados e
 * virariam botões mortos.
 */

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";

export default function Login16() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entrando) return;
    setErro(null);
    setEntrando(true);

    const { error } = await signIn.email({ email: email.trim(), password: senha });

    if (error) {
      setErro(
        error.status === 401 || error.status === 403 || /credential|password|invalid/i.test(error.message || "")
          ? "E-mail ou senha incorretos."
          : error.message || "Não foi possível entrar. Tente novamente."
      );
      setEntrando(false);
      return;
    }
    // useSession() no AuthGate percebe a sessão nova e troca a tela sozinho.
  };

  return (
    <section className="flex min-h-dvh items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-header.svg" alt="Meu Assessor" className="h-10 w-auto" />
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-muted">Entre na sua conta do Meu Assessor</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-xs font-semibold text-primary">
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input h-11"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-senha" className="text-xs font-semibold text-primary">
              Senha
            </label>
            <div className="relative">
              <input
                id="login-senha"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="input h-11 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-primary cursor-pointer"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {erro && (
            <p className="text-xs font-semibold text-danger" role="alert">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={entrando}
            className="btn-primary mt-1 h-11 w-full text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {entrando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Entrando...
              </>
            ) : (
              <>
                Entrar <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Precisa de acesso? Peça para quem administra o app criar sua conta em Configurações.
        </p>
      </div>
    </section>
  );
}
