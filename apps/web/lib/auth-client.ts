"use client";

import { createAuthClient } from "better-auth/react";

/** Cliente do Better Auth para componentes (login, sessão, trocar senha, sair). */
export const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;

/** Sair da conta esquecendo a chave do cofre guardada na aba. */
export async function sairDaConta() {
  try {
    sessionStorage.removeItem("cofre:chave");
  } catch {}
  await signOut();
}
