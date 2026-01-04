import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Suppress deprecation warnings
process.removeAllListeners('warning');

console.log("GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY); // Log the API key for debugging

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-3-flash-preview",
  generationConfig: {
    temperature: 0.7,
    topP: 0.9
  }
});

// Define the getResponse function
export async function getResponse(prompt) {
    try {
        console.log("Sending prompt to Gemini API:", prompt); // Log the prompt for debugging

        const systemInstruction = `
            You are a professional career advisor and resume expert. Your task is to analyze the job advertisement and the candidate's resume, and provide a detailed, professional, and insightful analysis. Follow this structure for your response:

            1. **Matching Percentage**: Provide a percentage match between the resume and the job advertisement. Explain why this percentage was calculated.

            2. **Strengths**: Highlight the key strengths of the resume in relation to the job advertisement. Mention specific skills, experiences, or qualifications that align well.

            3. **Weaknesses**: Identify areas where the resume falls short compared to the job advertisement. Mention missing skills, experiences, or qualifications.

            4. **Improvement Suggestions**: Provide actionable advice on how the candidate can improve their resume to better match the job advertisement. Include specific keywords or phrases they should add.

            5. **Keywords for Resume and Cover Letter**: List the most important keywords and phrases from the job advertisement that the candidate should include in their resume and cover letter to attract the employer's attention.

            Be professional, concise, and insightful in your analysis. Use bullet points for clarity and readability.
        `;

        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: systemInstruction },
                        { text: prompt }
                    ]
                }
            ]
        });

        const response = await result.response;
        const text = response.text();
        
        console.log("Received response from Gemini API:", text); // Log the response for debugging
        return text;
    } catch (error) {
        console.error("Error in getResponse:", error); // Log any errors
        throw error; // Rethrow the error to handle it in the calling function
    }
}

// Export getResponse as the default export
export default getResponse;