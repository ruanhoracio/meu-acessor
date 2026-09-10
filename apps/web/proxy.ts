import { NextRequest, NextResponse } from "next/server";
import { getCookieCache, getSessionCookie } from "better-auth/cookies";
import { auth } from "@/lib/auth";
import { obterSegredoAuth } from "@/lib/auth-secret";

/**
 * Exige sessão para as APIs e para as server actions (POST com header
 * `next-action`). Páginas passam: o AuthGate mostra o login no cliente.
 *
 * Verificação em duas etapas para não bater no banco a cada request:
 * 1. cookie de cache assinado (sem banco);
 * 2. se o cache expirou mas há cookie de sessão, consulta o banco.
 */

// Webhook do Telegram, cron da Vercel e o próprio Better Auth têm
// autenticação própria (ou nenhuma) e não podem depender de cookie.
const ROTAS_PUBLICAS = ["/api/auth", "/api/telegram", "/api/cron"];

async function temSessao(request: NextRequest): Promise<boolean> {
  try {
    const cache = await getCookieCache(request, { secret: obterSegredoAuth() });
    if (cache?.session) return true;
  } catch {
    // cache inválido ou de outro segredo: cai para a verificação no banco
  }
  if (!getSessionCookie(request)) return false;
  try {
    const sessao = await auth.api.getSession({ headers: request.headers });
    return !!sessao;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ROTAS_PUBLICAS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const ehApi = pathname.startsWith("/api/");
  const ehServerAction = request.method === "POST" && request.headers.has("next-action");
  if (!ehApi && !ehServerAction) return NextResponse.next();

  if (await temSessao(request)) return NextResponse.next();

  return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
}

export const config = {
  // Tudo, menos arquivos estáticos e assets do Next.
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?|json)$).*)"],
};
