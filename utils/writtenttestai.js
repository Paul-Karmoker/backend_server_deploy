import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn('[AI] GOOGLE_CLIENT_ID missing — set it in .env');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLIENT_ID);

// Fast, low-latency: gemini-2.0-flash
export const aiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
