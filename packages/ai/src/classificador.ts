/**
 * Schema de saída do classificador de IA.
 * Uma mensagem pode gerar múltiplos itens.
 */
export type TipoClassificacao =
  | 'video'
  | 'tarefa'
  | 'evento'
  | 'nota'
  | 'referencia'
  | 'consulta'
  | 'correcao'

export interface ItemClassificado {
  tipo: TipoClassificacao
  titulo: string
  projeto?: string
  formato?: string
  prazo?: string
  estimativaHoras?: number
  estagio?: string
  descricao?: string
  tags?: string[]
  url?: string
  confianca: number
  confirmacao: string
}

export interface ResultadoClassificacao {
  itens: ItemClassificado[]
  mensagemOriginal: string
}

/**
 * Classificador de mensagens — stub para Fase 3.
 * Na Fase 1 retorna resultado vazio.
 */
export async function classificarMensagem(
  _mensagem: string,
  _contexto: {
    dataAtual: string
    projetos: string[]
    ultimosItens: string[]
  }
): Promise<ResultadoClassificacao> {
  // TODO: implementar chamada ao Claude na Fase 3
  return {
    itens: [],
    mensagemOriginal: _mensagem,
  }
}
