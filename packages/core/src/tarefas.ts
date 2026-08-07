export type StatusTarefa = 'aberta' | 'fazendo' | 'concluida' | 'cancelada'

export const STATUS_TAREFA_LABELS: Record<StatusTarefa, string> = {
  aberta: 'Aberta',
  fazendo: 'Fazendo',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

export function tarefaAtrasada(prazo: Date | null): boolean {
  if (!prazo) return false
  return new Date() > prazo
}
