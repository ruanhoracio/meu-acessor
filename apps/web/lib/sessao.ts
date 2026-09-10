import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Id do usuário logado, para route handlers e server actions.
 * Toda consulta a dados do usuário filtra por este id: o app passou a ter
 * mais de uma conta e cada uma só enxerga o que é seu.
 */
export async function usuarioAtualId(): Promise<string> {
  const sessao = await auth.api.getSession({ headers: await headers() });
  if (!sessao) throw new Error("Não autenticado.");
  return sessao.user.id;
}
