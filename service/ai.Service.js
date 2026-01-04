// services/resume.service.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

// ---------- Gemini setup ----------
let geminiModel = null;
if (process.env.GOOGLE_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
}

// ---------- Groq setup ----------
const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

/** Unified AI call */
async function callAI(prompt) {
  // 1️⃣ Try Gemini
  if (geminiModel) {
    try {
      const res = await geminiModel.generateContent(prompt);
      return res.response.text();
    } catch (err) {
      if (err?.status !== 429) throw err;
      console.warn("[AI] Gemini quota exceeded → fallback to Groq");
    }
  }

  // 2️⃣ Groq fallback
  if (!groq) {
    throw new Error("No AI provider available");
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant", // ✅ Updated supported model
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return completion.choices[0].message.content;
}

// === Helper: clean AI response into bullet sentences ===
function cleanSentences(text) {
  return text
    .split("\n")
    .map((line) => line.trim().replace(/^[-•*>\d.\s]+/, "").trim()) // remove bullets/numbers
    .filter((line) => line.length > 0);
}

// === 1. Suggest Job Description ===
export async function suggestJobDescription(workExp) {
  const prompt = `
Generate 5 professional bullet points for job responsibilities and achievements 
for the position of "${workExp.position}" at "${workExp.companyName}". 
Make them concise, results-oriented, and impactful. 
Return only the bullet points, no extra text.
`;
  const text = await callAI(prompt);
  return cleanSentences(text);
}

// === 2. Suggest Skills ===
export async function suggestSkills(workExperiences) {
  const summary = workExperiences
    .map((exp) => `${exp.position} at ${exp.companyName}`)
    .join(", ");

  const prompt = `
Based on these experiences: ${summary}, suggest 10 resume skills. 
Categorize them into "technical" and "soft". 
Return valid JSON ONLY in this format:
{ "technical": ["skill1","skill2"], "soft": ["skill1","skill2"] }
`;
  const text = await callAI(prompt);

  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/{[\s\S]*}/);
    return JSON.parse(match[1] || match[0]);
  } catch (e) {
    return { technical: [], soft: [] }; // fallback if parsing fails
  }
}

// === 3. Suggest Career Summary ===
export async function suggestCareerSummary(data) {
  const work = Array.isArray(data.workExperiences)
    ? data.workExperiences.map((exp) => `${exp.position} at ${exp.companyName}`).join(", ")
    : "No work experience";

  const education = Array.isArray(data.education)
    ? data.education.map((edu) => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institutionName}`).join(", ")
    : "No education info";

  const prompt = `
Write a professional career summary for a resume. 
Base it on work experiences: ${work} 
and education: ${education}. 
Highlight key achievements and relevant skills in 5–7 sentences. 
Return only the sentences, no extra explanation.
`;

  const text = await callAI(prompt);
  return text.trim();
}

// === 4. Suggest Career Objective ===
export async function suggestCareerObjective(data) {
  try {
    const work = Array.isArray(data.workExperiences)
      ? data.workExperiences.map((exp) => `${exp.position} at ${exp.companyName}`).join(", ")
      : "No work experience";

    const education = Array.isArray(data.education)
      ? data.education.map((edu) => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institutionName}`).join(", ")
      : "No education info";

    const prompt = `
Write a professional career objective for a resume.
Base it on work experiences: ${work}
and education: ${education}.
Keep it 3–4 sentences, focused on career goals, ambition, and contribution.
Return only the sentences, no extra explanation.
`;

    const text = await callAI(prompt);
    return text.trim();
  } catch (error) {
    console.error("Career Objective AI Error:", error);
    throw new Error("Failed to generate career objective");
  }
}
