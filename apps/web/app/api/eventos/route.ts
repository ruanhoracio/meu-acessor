import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");

    if (!inicio || !fim) {
      const eventos = await prisma.evento.findMany({
        include: { projeto: true },
        orderBy: { inicio: "asc" },
      });
      return NextResponse.json(eventos);
    }

    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);

    // Buscar eventos no período OU eventos recorrentes (para expandir)
    const eventos = await prisma.evento.findMany({
      where: {
        OR: [
          {
            inicio: { gte: dataInicio, lte: dataFim },
          },
          {
            recorrencia: { in: ["semanal", "mensal"] },
          },
        ],
      },
      include: { projeto: true },
      orderBy: { inicio: "asc" },
    });

    // Expandir eventos recorrentes dentro do período
    const resultado: any[] = [];

    for (const evt of eventos) {
      const inicioEvt = new Date(evt.inicio);
      const fimEvt = evt.fim ? new Date(evt.fim) : null;
      const duracaoMs = fimEvt ? fimEvt.getTime() - inicioEvt.getTime() : 3600000;

      // Evento único
      if (!evt.recorrencia || evt.recorrencia === "unico") {
        if (inicioEvt >= dataInicio && inicioEvt <= dataFim) {
          resultado.push(evt);
        }
        continue;
      }

      // Semanal
      if (evt.recorrencia === "semanal") {
        const diaSemanaTarget = inicioEvt.getDay();
        const curr = new Date(dataInicio);
        curr.setHours(0, 0, 0, 0);

        while (curr <= dataFim) {
          if (curr.getDay() === diaSemanaTarget) {
            const dp = new Date(
              curr.getFullYear(), curr.getMonth(), curr.getDate(),
              inicioEvt.getHours(), inicioEvt.getMinutes()
            );
            resultado.push({
              ...evt,
              id: `${evt.id}_${dp.getTime()}`,
              idOriginal: evt.id,
              inicio: dp.toISOString(),
              fim: new Date(dp.getTime() + duracaoMs).toISOString(),
              isProjetadoRecorrente: true,
            });
          }
          curr.setDate(curr.getDate() + 1);
        }
      }

      // Mensal
      else if (evt.recorrencia === "mensal") {
        const diaDoMesTarget = inicioEvt.getDate();
        const mesTarget = dataInicio.getMonth();
        const anoTarget = dataInicio.getFullYear();

        const dp = new Date(
          anoTarget, mesTarget, diaDoMesTarget,
          inicioEvt.getHours(), inicioEvt.getMinutes()
        );

        if (dp >= dataInicio && dp <= dataFim) {
          resultado.push({
            ...evt,
            id: `${evt.id}_${dp.getTime()}`,
            idOriginal: evt.id,
            inicio: dp.toISOString(),
            fim: new Date(dp.getTime() + duracaoMs).toISOString(),
            isProjetadoRecorrente: true,
          });
        }
      }
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro no GET /api/eventos:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { titulo, inicio, fim, projetoId, recorrencia } = body;

    if (!titulo || !titulo.trim()) {
      return NextResponse.json({ error: "Título do evento é obrigatório." }, { status: 400 });
    }

    const dataInicio = inicio ? new Date(inicio) : new Date();
    const dataFim = fim ? new Date(fim) : new Date(dataInicio.getTime() + 60 * 60 * 1000);

    const evento = await prisma.evento.create({
      data: {
        titulo: titulo.trim(),
        inicio: dataInicio,
        fim: dataFim,
        projetoId: projetoId || null,
        recorrencia: recorrencia || "unico",
        origem: "web",
      },
      include: { projeto: true },
    });

    return NextResponse.json(evento);
  } catch (error) {
    console.error("Erro no POST /api/eventos:", error);
    return NextResponse.json({ error: "Erro ao criar evento." }, { status: 500 });
  }
}
