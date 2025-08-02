import * as apiClient  from '../utils/apiClient.js';


   export  async  function suggestJobDescription(workExp) {
    const prompt = `Generate 5 professional bullet points for job responsibilities and achievements for the position of ${workExp.position} at ${workExp.companyName}. Make them concise and impactful.`;
    const suggestion = await apiClient.post(process.env.GROK_API_URL, {
      model: 'grok-beta',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for generating resume content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    return suggestion.choices[0].message.content.trim().split('\n').filter(line => line.trim());
  }

  export async function suggestSkills(workExperiences) {
    const workSummary = workExperiences.map(exp => `${exp.position} at ${exp.companyName}`).join(', ');
    const prompt = `Based on the following work experiences: ${workSummary}, suggest 10 relevant skills for a resume, categorized into Technical Skills and Soft Skills. Return as JSON: {"technical": [], "soft": []}`;
    const suggestion = await apiClient.post(process.env.GROK_API_URL, {
      model: 'grok-beta',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for generating resume content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    return JSON.parse(suggestion.choices[0].message.content.trim());
  }

  export async function suggestCareerObjective(data) {
    const workSummary = data.workExperiences.map(exp => `${exp.position} at ${exp.companyName}`).join(', ');
    const eduSummary = data.education.map(edu => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institutionName}`).join(', ');
    const prompt = `Write a professional career objective for a resume based on work experiences: ${workSummary} and education: ${eduSummary}. Keep it to 4-5 sentences.`;
    const suggestion = await apiClient.post(process.env.GROK_API_URL, {
      model: 'grok-beta',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for generating resume content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    return suggestion.choices[0].message.content.trim();
  }

  export async function suggestCareerSummary(data) {
    const workSummary = data.workExperiences.map(exp => `${exp.position} at ${exp.companyName}`).join(', ');
    const eduSummary = data.education.map(edu => `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institutionName}`).join(', ');
    const prompt = `Write a detailed career summary for a resume based on work experiences: ${workSummary} and education: ${eduSummary}. Highlight key achievements and skills in 5-7 sentences.`;
    const suggestion = await apiClient.post(process.env.GROK_API_URL, {
      model: 'grok-beta',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for generating resume content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    return suggestion.choices[0].message.content.trim();
  }


