import prisma from "@/lib/db";
import { ESTAGIOS_FINALIZADOS } from "@/lib/mock-data";

// Brasil não usa horário de verão: UTC-3 o ano inteiro.
const BRT_OFFSET_HORAS = 3;

/** Mês (1-12) e ano do instante, no calendário de Brasília. */
function mesAnoBRT(data: Date) {
  const d = new Date(data.getTime() - BRT_OFFSET_HORAS * 3600000);
  return { mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() };
}

/**
 * Mantém a aba Entregas espelhando o Pipeline.
 *
 * Chegou em ENVIADO (aprovado/entregue) → garante uma EntregaMensal ligada ao
 * vídeo, no mês da entrega, já marcada como concluída. Voltou para edição →
 * remove essa entrega. Entregas cadastradas à mão (videoId nulo) nunca são
 * tocadas. Chamada depois de qualquer mudança no vídeo; é idempotente.
 */
export async function sincronizarEntregaDoVideo(videoId: string) {
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return;

  const existente = await prisma.entregaMensal.findUnique({ where: { videoId } });
  const finalizado = ESTAGIOS_FINALIZADOS.includes(video.estagio);

  if (!finalizado) {
    if (existente) await prisma.entregaMensal.delete({ where: { id: existente.id } });
    return;
  }

  if (existente) {
    // Mantém mes/ano: se o usuário moveu a entrega de mês à mão, respeita.
    await prisma.entregaMensal.update({
      where: { id: existente.id },
      data: {
        titulo: video.titulo,
        formato: video.formato,
        projetoId: video.projetoId,
        concluido: true,
      },
    });
    return;
  }

  const { mes, ano } = mesAnoBRT(video.entregueEm ?? new Date());
  await prisma.entregaMensal.create({
    data: {
      videoId,
      userId: video.userId,
      titulo: video.titulo,
      formato: video.formato,
      projetoId: video.projetoId,
      concluido: true,
      mes,
      ano,
    },
  });
}
