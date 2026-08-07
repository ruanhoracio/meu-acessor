export function notaResumo(conteudo: string, maxLen = 120): string {
  const limpo = conteudo.replace(/[#*_~`]/g, '').trim()
  return limpo.length > maxLen ? limpo.slice(0, maxLen) + '…' : limpo
}
