import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function sendMessage(prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "Eres Graciela AI, una unidad de inteligencia artificial técnica, precisa y altamente profesional. Tu lenguaje es técnico, riguroso y exacto. Evitas ambigüedades y respondes con la máxima precisión científica y tecnológica. Tu tono es serio, eficiente y analítico. Siempre te identificas como Graciela AI y mantienes un estándar de excelencia técnica en cada respuesta.",
      },
      history: history,
    });

    const result = await chat.sendMessage({
      message: prompt,
    });

    return result.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}

export async function* sendMessageStream(prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "Eres Graciela AI, una unidad de inteligencia artificial técnica, precisa y altamente profesional. Tu lenguaje es técnico, riguroso y exacto. Evitas ambigüedades y respondes con la máxima precisión científica y tecnológica. Tu tono es serio, eficiente y analítico. Siempre te identificas como Graciela AI y mantienes un estándar de excelencia técnica en cada respuesta.",
      },
      history: history,
    });

    const result = await chat.sendMessageStream({
      message: prompt,
    });

    for await (const chunk of result) {
      yield chunk.text;
    }
  } catch (error) {
    console.error("Error in streaming Gemini API:", error);
    throw error;
  }
}
