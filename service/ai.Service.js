// services/resume.service.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLIENT_ID);

// Get model instance
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// === 1. Suggest Job Description ===
export async function suggestJobDescription(workExp) {
  // Format date range for the prompt
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Present';
  const dateRange = `${formatDate(workExp.from)} - ${workExp.currentlyWorking ? 'Present' : formatDate(workExp.to)}`;

  // Use existing description if available, otherwise leave empty
  const existingDescription = workExp.description?.length > 0 ? workExp.description.join('; ') : 'No prior description provided';

  const prompt = `
You are an expert resume writer tasked with creating a professional job description for a resume. Based on the following user data from a resume:
- Job Title: "${workExp.position}"
- Company Name: "${workExp.companyName}"
- Date Range: ${dateRange}
- Existing Description: "${existingDescription}"

Generate 5 to 10 concise, impactful, and results-oriented sentences describing key responsibilities and achievements for the role. Ensure the sentences are:
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
    .map(line => line.trim().replace(/^[-•*>\d.\s]+/, '').trim()) // Remove any bullets, numbers, or special characters
    .filter(line => line.length > 0)
    .slice(0, 10); // Ensure no more than 10 sentences

  // Ensure at least 5 sentences (pad with empty strings if needed, though unlikely)
  while (lines.length < 5) {
    lines.push('');
  }

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
  // Extract and format work experience
  const work = data.workExperiences.map(exp => {
    const dateRange = `${new Date(exp.from).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${exp.currentlyWorking ? 'Present' : new Date(exp.to).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    return `${exp.position} at ${exp.companyName} (${dateRange}): ${exp.description?.length > 0 ? exp.description.join('; ') : 'No description provided'}`;
  }).join('; ');

  // Extract and format education
  const education = data.education.map(edu => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institutionName} (${edu.passingYear || 'Ongoing'})`).join('; ');

  // Extract and format skills
  const skills = data.skills?.length > 0 ? data.skills.map(skill => `${skill.name} (${skill.level})`).join('; ') : 'No skills provided';

  // Extract and format certifications
  const certifications = data.certifications?.length > 0 ? data.certifications.map(cert => `${cert.name} from ${cert.authority} (${new Date(cert.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`).join('; ') : 'No certifications provided';

  // Extract and format trainings
  const trainings = data.trainings?.length > 0 ? data.trainings.map(train => `${train.name} at ${train.institution} (${train.duration || 'No duration provided'})`).join('; ') : 'No trainings provided';

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
  const text = result.response.text().trim();

  // Normalize and extract lines
  const lines = text
    .split('\n')
    .map(line => line.trim().replace(/^[-•*>\d.\s]+/, '').trim()) // Remove any bullets, numbers, or special characters
    .filter(line => line.length > 0)
    .slice(0, 10); // Ensure no more than 10 sentences

  // Ensure at least 5 sentences (pad with empty strings if needed, though unlikely)
  while (lines.length < 5) {
    lines.push('');
  }

  return lines;
}