"use client";

import { createAuthClient } from "better-auth/react";

/** Cliente do Better Auth para componentes (login, sessão, trocar senha, sair). */
export const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;
