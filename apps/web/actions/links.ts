"use server";

import prisma from "@/lib/db";
import { usuarioAtualId } from "@/lib/sessao";
import { revalidatePath } from "next/cache";

/**
 * Links úteis — a tabela `referencias` reaproveitada como "coleções de
 * links" (estilo Toby): cada link tem coleção, título, descrição e favorito.
 */

const COLECAO_PADRAO = "Geral";

function normalizarUrl(url: string): string {
  const u = url.trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

/**
 * Título e descrição do próprio site (tags <title>, og:title, description).
 * Melhor esforço: se o site bloquear ou demorar, devolve vazio e o usuário
 * preenche na mão.
 */
export async function inspecionarLink(url: string) {
  const alvo = normalizarUrl(url);
  if (!alvo) return { success: false, titulo: "", descricao: "" };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(alvo, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MeuAssessor/1.0)", Accept: "text/html" },
    });
    clearTimeout(t);
    const html = (await res.text()).slice(0, 200_000);
    const pega = (re: RegExp) => {
      const m = html.match(re);
      return m ? m[1].replace(/\s+/g, " ").trim() : "";
    };
    const decod = (s: string) =>
      s
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ");
    const titulo =
      pega(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      pega(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
      pega(/<title[^>]*>([^<]+)<\/title>/i);
    const descricao =
      pega(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      pega(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      pega(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    return { success: true, titulo: decod(titulo).slice(0, 120), descricao: decod(descricao).slice(0, 200) };
  } catch {
    return { success: false, titulo: "", descricao: "" };
  }
}

export async function listarLinks() {
  try {
    const userId = await usuarioAtualId();
    const links = await prisma.referencia.findMany({
      where: { userId },
      orderBy: [{ colecao: "asc" }, { favorito: "desc" }, { ordem: "asc" }, { criadoEm: "asc" }],
    });
    return { success: true, links: JSON.parse(JSON.stringify(links)) as any[] };
  } catch (error: any) {
    return { success: false, error: String(error?.message || error), links: [] as any[] };
  }
}

export async function salvarLink(data: {
  id?: string;
  url: string;
  titulo?: string;
  descricao?: string;
  colecao?: string;
  favorito?: boolean;
}) {
  try {
    const userId = await usuarioAtualId();
    const url = normalizarUrl(data.url);
    if (!url) return { success: false, error: "Informe o link." };
    const colecao = (data.colecao || COLECAO_PADRAO).trim() || COLECAO_PADRAO;
    const campos = {
      url,
      titulo: data.titulo?.trim() || null,
      descricao: data.descricao?.trim() || null,
      colecao,
      ...(data.favorito !== undefined && { favorito: !!data.favorito }),
    };

    if (data.id) {
      const dono = await prisma.referencia.findFirst({ where: { id: data.id, userId }, select: { id: true } });
      if (!dono) return { success: false, error: "Link não encontrado." };
      const link = await prisma.referencia.update({ where: { id: data.id }, data: campos });
      revalidatePath("/referencias");
      return { success: true, link: JSON.parse(JSON.stringify(link)) };
    }

    const ultimo = await prisma.referencia.aggregate({ where: { userId, colecao }, _max: { ordem: true } });
    const link = await prisma.referencia.create({
      data: { userId, ...campos, ordem: (ultimo._max.ordem ?? -1) + 1 },
    });
    revalidatePath("/referencias");
    return { success: true, link: JSON.parse(JSON.stringify(link)) };
  } catch (error: any) {
    console.error("[salvarLink Error]:", error);
    return { success: false, error: String(error?.message || error) };
  }
}

export async function alternarFavoritoLink(id: string, favorito: boolean) {
  try {
    const userId = await usuarioAtualId();
    await prisma.referencia.updateMany({ where: { id, userId }, data: { favorito } });
    revalidatePath("/referencias");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: String(error?.message || error) };
  }
}

export async function excluirLink(id: string) {
  try {
    const userId = await usuarioAtualId();
    const { count } = await prisma.referencia.deleteMany({ where: { id, userId } });
    revalidatePath("/referencias");
    return count > 0 ? { success: true } : { success: false, error: "Link não encontrado." };
  } catch (error: any) {
    return { success: false, error: String(error?.message || error) };
  }
}

export async function renomearColecao(de: string, para: string) {
  try {
    const userId = await usuarioAtualId();
    const nome = para.trim();
    if (!nome) return { success: false, error: "Informe o nome da coleção." };
    await prisma.referencia.updateMany({ where: { userId, colecao: de }, data: { colecao: nome } });
    revalidatePath("/referencias");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: String(error?.message || error) };
  }
}

export async function excluirColecao(nome: string) {
  try {
    const userId = await usuarioAtualId();
    const { count } = await prisma.referencia.deleteMany({ where: { userId, colecao: nome } });
    revalidatePath("/referencias");
    return { success: true, removidos: count };
  } catch (error: any) {
    return { success: false, error: String(error?.message || error) };
  }
}
