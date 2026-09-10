import { createHash } from "node:crypto";

/**
 * Segredo que assina as sessões do Better Auth.
 *
 * Preferência: BETTER_AUTH_SECRET. Se não estiver definido (era o caso na
 * Vercel — o código antigo mascarava isso com um valor fixo, público no
 * repositório), deriva um segredo do DATABASE_URL: já é sigiloso, tem alta
 * entropia e existe em todo ambiente. Nunca um valor fixo em código.
 *
 * Trocar BETTER_AUTH_SECRET depois invalida as sessões (todo mundo entra de
 * novo) — comportamento esperado.
 */
export function obterSegredoAuth(): string {
  const definido = process.env.BETTER_AUTH_SECRET?.trim();
  if (definido && definido.length >= 32) return definido;

  const base = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!base) {
    throw new Error("Defina BETTER_AUTH_SECRET (ou DATABASE_URL) nas variáveis de ambiente.");
  }
  if (definido) {
    console.warn("[auth] BETTER_AUTH_SECRET tem menos de 32 caracteres; usando segredo derivado.");
  }
  return createHash("sha256").update(`meu-assessor|${base}`).digest("hex");
}
