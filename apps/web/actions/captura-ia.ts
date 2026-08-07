"use server";

import prisma from "@meu-assessor/db";
import OpenAI from "openai";
import { revalidatePath } from "next/cache";

const groqApiKey = process.env.GROQ_API_KEY;
const groq = groqApiKey
  ? new OpenAI({ apiKey: groqApiKey, baseURL: "https://api.groq.com/openai/v1" })
  : null;

export async function processarCapturaInteligente(texto: string) {
  if (!texto.trim()) return { success: false, error: "Digite algo para capturar." };

  try {
    const projetos = await prisma.projeto.findMany({ select: { id: true, nome: true } });
    const projetosNomes = projetos.map((p) => p.nome);

    let classificacao = {
      tipo: "tarefa",
      titulo: texto,
      projetoNome: null as string | null,
      formato: "outro",
      prazo: null as string | null,
      estimativa_horas: 4,
      prioridade: "alta",
    };

    if (groq) {
      try {
        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `Você é o classificador inteligente do "Meu Assessor" para um editor de vídeo profissional.
Data/hora atual: ${new Date().toISOString()}
Projetos ativos: ${JSON.stringify(projetosNomes)}

Classifique o texto do usuário e responda APENAS um JSON válido no formato:
{
  "tipo": "video" | "tarefa" | "evento" | "nota" | "referencia",
  "titulo": "string limpa e direta",
  "projetoNome": "nome do projeto coincidente se houver",
  "formato": "reels" | "vsl" | "criativo" | "aula" | "institucional" | "outro",
  "prazo": "ISO string da data/hora ou null",
  "estimativa_horas": 4,
  "prioridade": "urgente" | "alta" | "media" | "baixa"
}`,
            },
            { role: "user", content: texto },
          ],
          temperature: 0.1,
        });

        const resText = response.choices[0]?.message?.content;
        if (resText) {
          const jsonStr = resText.trim().replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
          classificacao = { ...classificacao, ...JSON.parse(jsonStr) };
        }
      } catch (err) {
        console.error("Erro na IA do Groq:", err);
      }
    }

    // Encontra projeto correspondente
    let projetoId = null;
    if (classificacao.projetoNome) {
      const proj = projetos.find(
        (p) => p.nome.toLowerCase() === classificacao.projetoNome?.toLowerCase()
      );
      if (proj) projetoId = proj.id;
    }

    let itemCriadoMsg = "";

    if (classificacao.tipo === "video") {
      await prisma.video.create({
        data: {
          titulo: classificacao.titulo,
          projetoId,
          formato: (classificacao.formato as any) || "outro",
          estagio: "briefing",
          prazoEntrega: classificacao.prazo ? new Date(classificacao.prazo) : null,
          estimativaHoras: classificacao.estimativa_horas || 4,
        },
      });
      itemCriadoMsg = `🎬 Vídeo adicionado no Pipeline: "${classificacao.titulo}"`;
    } else if (classificacao.tipo === "evento") {
      const inicio = classificacao.prazo ? new Date(classificacao.prazo) : new Date();
      const fim = new Date(inicio.getTime() + 60 * 60 * 1000);
      await prisma.evento.create({
        data: {
          titulo: classificacao.titulo,
          inicio,
          fim,
          projetoId,
        },
      });
      itemCriadoMsg = `📅 Compromisso adicionado na Agenda para ${inicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}: "${classificacao.titulo}"`;
    } else if (classificacao.tipo === "nota") {
      await prisma.nota.create({
        data: {
          titulo: classificacao.titulo,
          conteudo: texto,
          projetoId,
        },
      });
      itemCriadoMsg = `📝 Nota salva com sucesso: "${classificacao.titulo}"`;
    } else if (classificacao.tipo === "referencia") {
      await prisma.referencia.create({
        data: {
          url: texto.includes("http") ? texto : "https://youtube.com",
          titulo: classificacao.titulo,
          tags: ["inspiração"],
        },
      });
      itemCriadoMsg = `💡 Referência salva na biblioteca!`;
    } else {
      await prisma.tarefa.create({
        data: {
          titulo: classificacao.titulo,
          projetoId,
          prazo: classificacao.prazo ? new Date(classificacao.prazo) : null,
          prioridade: (classificacao.prioridade as any) || "alta",
          status: "aberta",
        },
      });
      itemCriadoMsg = `📋 Tarefa criada: "${classificacao.titulo}"`;
    }

    revalidatePath("/");
    revalidatePath("/pipeline");
    revalidatePath("/tarefas");
    revalidatePath("/agenda");

    return { success: true, mensagem: itemCriadoMsg };
  } catch (error: any) {
    console.error("Erro na captura inteligente:", error);
    return { success: false, error: "Falha ao processar captura." };
  }
}
