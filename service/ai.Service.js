// services/resume.service.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLIENT_ID);

// Get model instance
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// === Helper: clean AI response into sentences ===
function cleanSentences(text, min = 5, max = 10) {
  const lines = text
    .split("\n")
    .map((line) => line.trim().replace(/^[-•*>\d.\s]+/, "").trim()) // remove bullets/numbers
    .filter((line) => line.length > 0);

  return lines.slice(0, max).concat(Array(Math.max(0, min - lines.length)).fill(""));
}

// === 1. Suggest Job Description ===
export async function suggestJobDescription(workExp) {
  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : "Present";

  const dateRange = `${formatDate(workExp.from)} - ${
    workExp.currentlyWorking ? "Present" : formatDate(workExp.to)
  }`;

  const existingDescription =
    workExp.description?.length > 0
      ? workExp.description.join("; ")
      : "No prior description provided";

  const prompt = `
You are an expert resume writer. Based on this job:
- Job Title: "${workExp.position}"
- Company Name: "${workExp.companyName}"
- Date Range: ${dateRange}
- Existing Description: "${existingDescription}"

Write 5–10 strong, results-oriented resume sentences about responsibilities and achievements. 
Do not use bullets, numbers, or special characters. Each line should be one complete sentence.
`;

  const result = await model.generateContent(prompt);
  return cleanSentences(result.response.text());
}

// === 2. Suggest Skills ===
export async function suggestSkills(workExperiences) {
  const summary = workExperiences
    .map((exp) => `${exp.position} at ${exp.companyName}`)
    .join(", ");

  const prompt = `
Based on these work experiences: ${summary}, suggest 10 resume skills.
Categorize into "technical" and "soft".
Return valid JSON in this format ONLY:
{ "technical": ["skill1","skill2"], "soft": ["skill1","skill2"] }
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  try {
    // Try to extract JSON even if wrapped in markdown
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/{[\s\S]*}/);
    return JSON.parse(match[1] || match[0]);
  } catch (e) {
    return { technical: [], soft: [] }; // fallback
  }
}

// === 3. Suggest Career Objective ===
export async function suggestCareerObjective(data) {
  const work = data.workExperiences
    .map((exp) => `${exp.position} at ${exp.companyName}`)
    .join(", ");
  const education = data.education
    .map((edu) => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institutionName}`)
    .join(", ");

  const prompt = `
Write a professional career objective for a resume.
Base it on these:
- Work: ${work || "No work experience"}
- Education: ${education || "No education info"}

Write 4–5 sentences only, concise and professional.
`;

  const result = await model.generateContent(prompt);
  return result.response.text().replace(/\n+/g, " ").trim();
}

// === 4. Suggest Career Summary ===
export async function suggestCareerSummary(data) {
  const work = data.workExperiences
    .map((exp) => {
      const dateRange = `${new Date(exp.from).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })} - ${
        exp.currentlyWorking
          ? "Present"
          : new Date(exp.to).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      }`;
      return `${exp.position} at ${exp.companyName} (${dateRange}): ${
        exp.description?.length > 0 ? exp.description.join("; ") : "No description provided"
      }`;
    })
    .join("; ");

  const education = data.education
    .map(
      (edu) =>
        `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institutionName} (${
          edu.passingYear || "Ongoing"
        })`
    )
    .join("; ");

  const skills =
    data.skills?.length > 0
      ? data.skills.map((skill) => `${skill.name} (${skill.level})`).join("; ")
      : "No skills provided";

  const certifications =
    data.certifications?.length > 0
      ? data.certifications
          .map(
            (cert) =>
              `${cert.name} from ${cert.authority} (${new Date(cert.date).toLocaleDateString(
                "en-US",
                { month: "short", year: "numeric" }
              )})`
          )
          .join("; ")
      : "No certifications provided";

  const trainings =
    data.trainings?.length > 0
      ? data.trainings
          .map(
            (train) =>
              `${train.name} at ${train.institution} (${train.duration || "No duration"})`
          )
          .join("; ")
      : "No trainings provided";

  const prompt = `
You are an expert resume writer. Based on:
- Work: ${work}
- Education: ${education}
- Skills: ${skills}
- Certifications: ${certifications}
- Trainings: ${trainings}

Write 5–10 impactful resume summary sentences. Each line should be one sentence. 
Do not use bullets, numbers, or special characters.
`;

  const result = await model.generateContent(prompt);
  return cleanSentences(result.response.text());
}
