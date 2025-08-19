import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_API_KEY) {
  console.warn('[AI] GOOGLE_API_KEY missing — set it in .env');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Fast, low-latency: gemini-2.0-flash
export const aiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
