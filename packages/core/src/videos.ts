import type { EstagioVideo } from '@meu-assessor/db'

export const ESTAGIOS_ORDEM: EstagioVideo[] = [
  'briefing',
  'material_recebido',
  'cortando',
  'primeiro_corte',
  'revisao',
  'ajustes',
  'aprovado',
  'entregue',
]

export const ESTAGIO_LABELS: Record<EstagioVideo, string> = {
  briefing: 'Briefing',
  material_recebido: 'Material Recebido',
  cortando: 'Cortando',
  primeiro_corte: 'Primeiro Corte',
  revisao: 'Revisão',
  ajustes: 'Ajustes',
  aprovado: 'Aprovado',
  entregue: 'Entregue',
}

export const FORMATO_LABELS: Record<string, string> = {
  reels: "Reels",
  vsl: "VSL",
  criativo: "Criativo",
  aula: "Aula",
  institucional: "Institucional",
  outro: "Outro",
}

export function diasParadoNoEstagio(ultimoEventoEm: Date | null, criadoEm: Date): number {
  const ref = ultimoEventoEm ?? criadoEm
  const agora = new Date()
  return Math.floor((agora.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24))
}

/** Verifica se o vídeo está travado (parado há mais de X dias) */
export function videoTravado(diasParado: number, limiteDias = 3): boolean {
  return diasParado >= limiteDias
}
