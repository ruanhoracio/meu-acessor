"use client";

import Login16 from "@/components/ui/login-16";
import { useSession } from "@/lib/auth-client";

/**
 * Só renderiza o app com uma sessão válida do Better Auth.
 *
 * Substitui a tela de bloqueio antiga, que comparava a senha digitada com
 * valores fixos no código (visíveis a qualquer um no bundle) e guardava
 * "autenticado" no localStorage. A proteção de verdade das APIs e das server
 * actions está no proxy.ts; aqui é só a experiência de entrar.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: sessao, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!sessao) return <Login16 />;

  return <>{children}</>;
}
