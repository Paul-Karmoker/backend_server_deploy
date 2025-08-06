// services/resume.service.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Get model instance
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// === 1. Suggest Job Description ===
export async function suggestJobDescription(workExp) {
  const prompt = `
Generate 5 professional bullet points for job responsibilities and achievements for the position of "${workExp.position}" at "${workExp.companyName}". 
Make them concise, results-oriented, and impactful. Return only the bullet points.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Normalize and extract lines
  const lines = text
    .split('\n')
    .map(line => line.trim().replace(/^[-•\d.\s]+/, '').trim()) // Remove bullets/numbers
    .filter(line => line.length > 0);

  return lines;
}


// === 2. Suggest Skills ===
export async function suggestSkills(workExperiences) {
  const summary = workExperiences.map(exp => `${exp.position} at ${exp.companyName}`).join(', ');
  const prompt = `
Based on the following work experiences: ${summary}, suggest 10 relevant skills for a resume.
Categorize them into Technical Skills and Soft Skills. 
Return JSON with this format: { "technical": [], "soft": [] }
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/{[\s\S]*}/);
    return JSON.parse(match[1] || match[0]);
  } catch (e) {
    throw new Error('Failed to parse skills JSON');
  }
}

// === 3. Suggest Career Objective ===
export async function suggestCareerObjective(data) {
  const work = data.workExperiences.map(exp => `${exp.position} at ${exp.companyName}`).join(', ');
  const education = data.education.map(edu => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institutionName}`).join(', ');

  const prompt = `
Write a professional career objective for a resume.
Base it on these work experiences: ${work} and education: ${education}.
Keep it concise in 4–5 sentences.
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// === 4. Suggest Career Summary ===
export async function suggestCareerSummary(data) {
  const work = data.workExperiences.map(exp => `${exp.position} at ${exp.companyName}`).join(', ');
  const education = data.education.map(edu => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institutionName}`).join(', ');

  const prompt = `
Write a detailed career summary for a resume based on work experiences: ${work} and education: ${education}.
Highlight key achievements and relevant skills in 5–7 sentences.
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
