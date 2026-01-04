// utils/writtenttestai.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

// ---------- Gemini setup ----------
let geminiModel = null;
if (process.env.GOOGLE_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
}

// ---------- Groq (FREE fallback) ----------
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

/**
 * Unified AI text generator
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function generateAIText(prompt) {
  // 1️⃣ Try Gemini first
  if (geminiModel) {
    try {
      const res = await geminiModel.generateContent(prompt);
      return res.response.text();
    } catch (err) {
      if (err?.status !== 429) throw err;
      console.warn("[AI] Gemini quota exceeded → fallback to Groq");
    }
  }

  // 2️⃣ Fallback to Groq (FREE)
  if (!groq) {
    throw new Error("No AI provider available");
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message.content;
}
