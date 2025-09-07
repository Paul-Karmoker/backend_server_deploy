import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLIENT_SECRET);

async function extractTextFromPDF(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(dataBuffer);
    const pages = pdfDoc.getPages();
    let text = '';
    for (const page of pages) {
      text += await page.getTextContent();
    }
    return text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Extract text from job description file
export const extractText = async (req, res) => {
  let filePath;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let extractedText = '';

    if (ext === '.docx') {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (ext === '.pdf') {
      extractedText = await extractTextFromPDF(filePath);
    } else {
      extractedText = await fs.readFile(filePath, 'utf-8');
    }

    res.json({ text: extractedText });
  } catch (error) {
    console.error('Error extracting text:', error);
    res.status(500).json({ 
      error: 'Failed to extract text',
      details: error.message 
    });
  } finally {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
  }
};

export const generateQuestions = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const prompt = `Based on the following job description, generate exactly 5 interview questions: 3 technical questions that test specific skills and knowledge required for the role, and 2 scenario-based questions that assess problem-solving and behavioral fit. Make the questions relevant, concise, and tailored to the key responsibilities, requirements, and technologies mentioned in the description.

Output the response strictly in JSON format as an array of objects, each with:
- "type": "technical" or "scenario"
- "question": the question text

Job description:\n\n${text}`;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Corrected model name assumption; adjust if needed
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    // Parse the JSON output
    let questions;
    try {
      // Clean up potential markdown or extra text
      const jsonString = generatedText.replace(/```json\n?|\n?```/g, '').trim();
      questions = JSON.parse(jsonString);
      if (!Array.isArray(questions) || questions.length !== 5) {
        throw new Error('Invalid questions format');
      }
    } catch (parseError) {
      console.error('Error parsing questions:', parseError);
      return res.status(500).json({ error: 'Failed to parse generated questions' });
    }

    res.json({ questions });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ 
      error: 'Failed to generate questions',
      details: error.message 
    });
  }
};

export const analyzeAnswers = async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    const prompt = `You are an expert interviewer evaluating candidate responses for a job interview. Analyze the following answers provided by the candidate. For each answer, assess based on:
- Relevance to the question
- Depth and accuracy of knowledge (for technical questions)
- Problem-solving approach, clarity, and behavioral insights (for scenario-based questions)
- Overall communication quality

Calculate an overall score out of 100, averaging scores across all answers. If the overall score is 95 or below, provide detailed expert feedback including strengths, weaknesses, and specific suggestions for improvement. If the score is above 95, provide no feedback.

Output strictly in JSON format with:
- "score": the overall integer score (0-100)
- "feedback": a string with detailed feedback if score <= 95, otherwise null

Answers:\n\n${JSON.stringify(answers)}`;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Corrected model name assumption; adjust if needed
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const output = response.text();

    // Parse the JSON output
    let analysis;
    try {
      // Clean up potential markdown or extra text
      const jsonString = output.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(jsonString);
      if (typeof analysis.score !== 'number' || (analysis.feedback !== null && typeof analysis.feedback !== 'string')) {
        throw new Error('Invalid analysis format');
      }
    } catch (parseError) {
      console.error('Error parsing analysis:', parseError);
      return res.status(500).json({ error: 'Failed to parse analysis' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing answers:', error);
    res.status(500).json({ 
      error: 'Failed to analyze answers',
      details: error.message 
    });
  }
};