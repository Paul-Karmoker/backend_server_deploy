import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    const prompt = `Generate 5 interview questions (3 technical, 2 scenario-based) for this job description:\n\n${text}`;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    res.json({ questions: generatedText.split('\n').filter(q => q.trim()) });
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

    const prompt = `Analyze these answers, score them out of 100, and provide expert feedback if the score is ≤ 95:\n\n${JSON.stringify(answers)}`;
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const output = response.text();

    const scoreMatch = output.match(/\d+/);
    const score = scoreMatch ? parseInt(scoreMatch[0], 10) : 100;
    const feedback = score <= 95 ? output : null;

    res.json({ score, feedback });
  } catch (error) {
    console.error('Error analyzing answers:', error);
    res.status(500).json({ 
      error: 'Failed to analyze answers',
      details: error.message 
    });
  }
};