/**
 * Envio de mensagens no Telegram com verificação de entrega.
 *
 * O código antigo disparava fetch e ignorava a resposta: quando o token não
 * existia (ou o Markdown quebrava), a mensagem sumia silenciosamente e o
 * lembrete ainda era marcado como "enviado". Aqui todo envio devolve o
 * resultado real, e quem chama decide o que fazer com a falha.
 */

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

export interface EnvioResultado {
  ok: boolean;
  erro?: string;
}

export function telegramConfigurado(): boolean {
  return TELEGRAM_TOKEN.length > 0;
}

export async function enviarTelegram(
  chatId: string,
  texto: string,
  opcoes: { markdown?: boolean } = {}
): Promise<EnvioResultado> {
  if (!TELEGRAM_TOKEN) {
    const erro = "TELEGRAM_BOT_TOKEN ausente nas variáveis de ambiente";
    console.error("[Telegram]", erro);
    return { ok: false, erro };
  }
  if (!chatId) {
    return { ok: false, erro: "chat_id ausente" };
  }

  const usarMarkdown = opcoes.markdown !== false;

  const tentar = async (comMarkdown: boolean): Promise<EnvioResultado> => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: texto,
          ...(comMarkdown ? { parse_mode: "Markdown" } : {}),
          disable_web_page_preview: true,
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) return { ok: true };

      const descricao = json?.description || `HTTP ${res.status}`;
      return { ok: false, erro: descricao };
    } catch (err) {
      return { ok: false, erro: String(err) };
    }
  };

  const primeira = await tentar(usarMarkdown);
  if (primeira.ok) return primeira;

  // Markdown mal formado (título com _ ou * solto) derruba a mensagem inteira.
  // Reenvia como texto puro para o usuário nunca ficar sem resposta.
  if (usarMarkdown && /pars|entit|markdown/i.test(primeira.erro || "")) {
    const semMarkdown = await tentar(false);
    if (semMarkdown.ok) {
      console.warn("[Telegram] Markdown rejeitado, enviado como texto puro:", primeira.erro);
      return semMarkdown;
    }
    return semMarkdown;
  }

  console.error("[Telegram] Falha ao enviar:", primeira.erro);
  return primeira;
}

/** Escapa os caracteres que quebram o parser Markdown do Telegram. */
export function escaparMarkdown(texto: string): string {
  return (texto || "").replace(/([_*`\[\]])/g, "\\$1");
}
