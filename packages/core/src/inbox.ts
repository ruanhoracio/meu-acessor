export type StatusInbox = 'pendente' | 'processado' | 'erro' | 'ignorado'

export const STATUS_INBOX_LABELS: Record<StatusInbox, string> = {
  pendente: 'Pendente',
  processado: 'Processado',
  erro: 'Erro',
  ignorado: 'Ignorado',
}
