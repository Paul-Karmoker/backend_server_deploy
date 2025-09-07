import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLIENT_ID);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1200,
  }
});

function getStyleInstructions(style) {
  const styles = {
    European: "Formal business format, 3 paragraphs max",
    USA: "Bullet points for achievements, direct tone",
    Worldwide: "Culturally neutral, highlight languages",
    Academic: "Focus on research, publications, awards",
    Creative: "Personal voice, creative formatting"
  };
  return styles[style] || styles.European;
}

export async function getResponse(jobDescription, resumeText, style = "European") {
  const prompt = `
    Generate a ${style}-style cover letter using:
    JOB: ${jobDescription.substring(0, 3000)}
    RESUME: ${resumeText.substring(0, 3000)}
    STYLE GUIDE: ${getStyleInstructions(style)}
    Include: Contact info, salutation, 3 paragraphs, sign-off
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Remove the default export and use named exports only
export default { getResponse };