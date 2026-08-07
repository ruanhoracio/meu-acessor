export interface CapacidadeSemana {
  horasComprometidas: number
  horasDisponiveis: number
  percentual: number
  estourada: boolean
}

export function calcularCapacidade(
  estimativasHoras: number[],
  horasDisponiveisDia = 6,
  diasUteis = 5
): CapacidadeSemana {
  const horasDisponiveis = horasDisponiveisDia * diasUteis
  const horasComprometidas = estimativasHoras.reduce((a, b) => a + b, 0)
  const percentual = horasDisponiveis > 0
    ? Math.round((horasComprometidas / horasDisponiveis) * 100)
    : 0

  return {
    horasComprometidas,
    horasDisponiveis,
    percentual,
    estourada: horasComprometidas > horasDisponiveis,
  }
}
