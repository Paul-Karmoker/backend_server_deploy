
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Get model instance
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// === 1. Suggest Job Description ===
export async function suggestJobDescription(workExp) {
  
  const prompt = `
You are an expert resume writer tasked with creating a professional job description for a resume. Based on the any types of jobs .Generate 5 to 10 concise, impactful, and results-oriented sentences describing key responsibilities and achievements for the role. Ensure the sentences are:
- Tailored to the job title, company context, and any existing description provided.
- Professional, using strong action verbs and avoiding generic or vague phrases.
- Focused on measurable outcomes or significant contributions where applicable.
- Written as plain text sentences, each starting with a strong action verb.
- Free of special characters (e.g., **, *, -, •), numbers, or formatting markers.
- Between 5 and 10 sentences, prioritizing quality, relevance, and alignment with the provided data.

Incorporate details from the existing description (if any) to enhance relevance, but rephrase and improve them to be more impactful. Return only the sentences, one per line, with no additional text, explanations, or formatting.
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
You are an expert resume writer tasked with creating a professional career summary for a resume. Based on the following user data from a resume:
- Work Experiences: ${work}
- Education: ${education}
- Skills: ${skills}
- Certifications: ${certifications}
- Trainings: ${trainings}

Generate 5 to 10 concise, impactful, and results-oriented sentences summarizing the candidate's career. Ensure the sentences are:
- Tailored to the provided work experiences, education, skills, certifications, and trainings.
- Professional, using strong action verbs and avoiding generic or vague phrases.
- Focused on key achievements, expertise, and contributions where applicable.
- Written as plain text sentences, each starting with a strong action verb.
- Free of special characters (e.g., **, *, -, •), numbers, or formatting markers.
- Between 5 and 10 sentences, prioritizing quality, relevance, and alignment with the provided data.

Incorporate and enhance details from the provided data to highlight the candidate's strengths and accomplishments. Return only the sentences, one per line, with no additional text, explanations, or formatting.
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