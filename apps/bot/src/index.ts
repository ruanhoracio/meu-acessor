import { Bot } from "grammy";
import { config } from "./config";
import {
  handleHoje,
  handleSemana,
  handleTravados,
  handleFoco,
  handleFim,
} from "./handlers/comandos";
import { handleMensagem } from "./handlers/mensagens";
import { iniciarRotinasAgendadas } from "./jobs/rotinas";

if (!config.telegramToken) {
  console.log("⚠️ TELEGRAM_BOT_TOKEN não encontrado nas variáveis de ambiente.");
  console.log("👉 Adicione o token no arquivo .env para iniciar o Bot do Telegram.");
  process.exit(0);
}

const bot = new Bot(config.telegramToken);

// Error Handler resiliente para que o bot NUNCA caia
bot.catch((err) => {
  console.error("⚠️ [Telegram Bot Error Guard]:", err.error || err);
});

// ── Comandos ───────────────────────────────────────────────
bot.command("start", (ctx) =>
  ctx.reply("👋 Olá, Ruan! Eu sou o seu Assessor. Manda áudio, texto, foto ou link que eu organizo tudo pra você!")
);
bot.command("hoje", handleHoje);
bot.command("semana", handleSemana);
bot.command("travados", handleTravados);
bot.command("foco", handleFoco);
bot.command("fim", handleFim);

// ── Captura Geral ──────────────────────────────────────────
bot.on("message", handleMensagem);

// ── Inicia rotinas ─────────────────────────────────────────
iniciarRotinasAgendadas(bot);

// ── Long Polling com reconexão automática ───────────────────
console.log("🚀 Bot do Meu Assessor iniciado com sucesso via Long Polling!");

bot.start({
  onStart: (info) => {
    console.log(`🤖 Conectado ao bot @${info.username} (ID: ${info.id})`);
  },
}).catch((err) => {
  console.error("❌ Falha fatal ao iniciar bot:", err);
});
