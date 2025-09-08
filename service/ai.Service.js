// services/resume.service.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Get model instance
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// === Helper: clean AI response into sentences ===
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

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return cleanSentences(text);
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

    const result = await model.generateContent(prompt);

    if (!result?.response?.text) {
      throw new Error("AI did not return a valid response");
    }

    return result.response.text().trim();
  } catch (error) {
    console.error("Career Objective AI Error:", error);
    throw new Error("Failed to generate career objective");
  }
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

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    // extract JSON (even if wrapped in markdown)
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/{[\s\S]*}/);
    return JSON.parse(match[1] || match[0]);
  } catch (e) {
    return { technical: [], soft: [] }; // fallback if parsing fails
  }
}

// === 3. Suggest Career Summary ===
export async function suggestCareerSummary(data) {
  const work = data.workExperiences
    .map((exp) => `${exp.position} at ${exp.companyName}`)
    .join(", ");

  const education = data.education
    .map((edu) => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institutionName}`)
    .join(", ");

  const prompt = `
Write a professional career summary for a resume. 
Base it on work experiences: ${work || "No work experience"} 
and education: ${education || "No education info"}. 
Highlight key achievements and relevant skills in 5–7 sentences. 
Return only the sentences, no extra explanation.
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
