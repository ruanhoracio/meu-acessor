import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../web/.env.local") });

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
  allowedChatId: process.env.TELEGRAM_ALLOWED_CHAT_ID || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
};

export function isAllowedUser(chatId: number | string): boolean {
  if (!config.allowedChatId) return true; // Se não configurou id, libera dev
  return String(chatId) === String(config.allowedChatId);
}
