import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLIENT_ID);

// Helper function to safely parse JSON responses
function safeJsonParse(jsonString) {
  try {
    // First try direct parse
    return JSON.parse(jsonString);
  } catch (e) {
    try {
      // If fails, try cleaning Markdown code blocks
      const cleaned = jsonString.replace(/```json|```/g, '').trim();
      // Try extracting JSON from between curly braces if needed
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw e;
    } catch (cleanError) {
      console.error('Failed to clean and parse JSON:', {
        originalError: e.message,
        cleanError: cleanError.message,
        input: jsonString
      });
      throw new Error('Invalid JSON format from AI response');
    }
  }
}

export const generateQuestions = async ({ 
  jobDescription, 
  jobTitle, 
  experienceLevel, 
  requirements 
}) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are an expert interview question generator. Follow these instructions precisely:
      
      1. Generate exactly ${requirements.technicalCount || 7} technical questions with answers
      2. Generate exactly ${requirements.situationalCount || 3} situational questions with answers
      3. Return ONLY valid JSON format without any additional text or markdown
      
      Required JSON structure:
      {
        "technical": [
          {
            "question": "Clear, specific technical question",
            "answer": "Comprehensive, detailed answer (3-5 sentences)"
          }
        ],
        "situational": [
          {
            "question": "Behavioral/situational question",
            "answer": "Detailed suggested answer approach"
          }
        ]
      }
      
      Job Information:
      - Title: ${jobTitle || 'Not specified'}
      - Level: ${experienceLevel || 'Not specified'}
      - Description: ${jobDescription}
      
      Important Notes:
      - Questions should be relevant to the job level
      - Answers should demonstrate depth of knowledge
      - Do not include any text outside the JSON structure
      - Ensure perfect JSON syntax that can be parsed directly
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Validate and parse the response
    const parsedResponse = safeJsonParse(text);
    
    // Additional validation of the structure
    if (!parsedResponse?.technical || !Array.isArray(parsedResponse.technical)) {
      throw new Error('Invalid technical questions format');
    }
    if (!parsedResponse?.situational || !Array.isArray(parsedResponse.situational)) {
      throw new Error('Invalid situational questions format');
    }
    
    return parsedResponse;
  } catch (error) {
    console.error('Error in generateQuestions:', {
      error: error.message,
      stack: error.stack,
      input: { jobTitle, experienceLevel }
    });
    throw new Error(`Question generation failed: ${error.message}`);
  }
};