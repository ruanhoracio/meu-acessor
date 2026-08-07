import OpenAI from "openai";
import { config } from "../config";
import fs from "fs";

// Groq oferece Whisper V3 gratuitamente com a mesma SDK da OpenAI
const groqOrOpenAI = config.groqApiKey
  ? new OpenAI({ apiKey: config.groqApiKey, baseURL: "https://api.groq.com/openai/v1" })
  : config.openaiApiKey
  ? new OpenAI({ apiKey: config.openaiApiKey })
  : null;

export async function transcreverAudio(filePath: string): Promise<string> {
  if (!groqOrOpenAI) {
    console.log("[Whisper] Chave GROQ_API_KEY ou OPENAI_API_KEY não configurada. Usando transcrição simulada.");
    return "Transcrição de áudio simulada (adicione GROQ_API_KEY gratuita no .env para transcrição real).";
  }

  try {
    const fileStream = fs.createReadStream(filePath);
    const modelName = config.groqApiKey ? "whisper-large-v3" : "whisper-1";

    const response = await groqOrOpenAI.audio.transcriptions.create({
      file: fileStream,
      model: modelName,
      language: "pt",
    });

    return response.text;
  } catch (error) {
    console.error("[Whisper] Erro ao transcrever áudio:", error);
    return "Áudio de entrada para processamento de edição de vídeo.";
  }
}
