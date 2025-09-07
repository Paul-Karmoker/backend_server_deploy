import ExcelJS from 'exceljs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
import XLSX from 'xlsx';
import ExcelGeneration from '../model/xlsx.model.js';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';
import sanitizeFilename from 'sanitize-filename';

// Constants
const MAX_INPUT_LENGTH = 100000; // ~100KB
const MAX_LOG_LENGTH = 1000;
const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain'
];
const DEFAULT_AI_MODEL = "gemini-2.0-flash";
const TEMP_DIR = path.join(process.cwd(), 'temp');

class ExcelGenerationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_CLIENT_ID);
    this.model = this.genAI.getGenerativeModel({ 
      model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
      generationConfig: {
        maxOutputTokens: 4000,
        temperature: 0.3
      }
    });

    // Initialize Google Cloud Storage if configured
    this.storage = process.env.GCS_BUCKET_NAME 
      ? new Storage({
          projectId: process.env.GCP_PROJECT_ID,
          keyFilename: process.env.GCS_KEY_FILE
        }) 
      : null;
    this.bucket = this.storage?.bucket(process.env.GCS_BUCKET_NAME);

    // Ensure temp directory exists
    fs.mkdir(TEMP_DIR, { recursive: true }).catch(console.error);
  }

  async extractTextFromFile(file) {
    if (!file) return '';
    
    try {
      if (!SUPPORTED_FILE_TYPES.includes(file.mimetype)) {
        throw new Error(`Unsupported file type: ${file.mimetype}`);
      }

      let text = '';

      if (file.mimetype === 'application/pdf') {
        text = await this.extractTextFromPDF(file.path);
      } 
      else if (file.mimetype.includes('wordprocessingml.document')) {
        const result = await mammoth.extractRawText({ path: file.path });
        text = result.value;
      } 
      else if (file.mimetype.includes('spreadsheetml.sheet') || file.mimetype.includes('ms-excel')) {
        const workbook = XLSX.readFile(file.path);
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          text += XLSX.utils.sheet_to_csv(worksheet) + '\n\n';
        });
      } 
      else {
        text = await fs.readFile(file.path, 'utf8');
      }

      if (text.length > MAX_INPUT_LENGTH) {
        throw new Error(`Extracted text exceeds maximum length of ${MAX_INPUT_LENGTH} characters`);
      }

      return text;
    } catch (error) {
      throw new Error(`Error extracting text from ${file.originalname}: ${error.message}`);
    } finally {
      try {
        if (file.path) await fs.unlink(file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
  }

  async extractTextFromPDF(filePath) {
    try {
      const pdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      let extractedText = '';
      
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const page = pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        extractedText += textContent.items.map(item => item.str).join(' ') + '\n';
      }
      
      return extractedText;
    } catch (error) {
      if (error.message.includes('password')) {
        throw new Error('Password-protected PDFs are not supported');
      }
      throw new Error(`PDF text extraction failed: ${error.message}`);
    }
  }

  async generateExcelWithAI(inputText, formatInstructions) {
    try {
      if (inputText && inputText.length > MAX_INPUT_LENGTH) {
        throw new Error(`Input text exceeds maximum length of ${MAX_INPUT_LENGTH} characters`);
      }

      if (!formatInstructions || formatInstructions.length < 10) {
        throw new Error('Format instructions must be at least 10 characters long');
      }

      const prompt = this.buildAIPrompt(inputText, formatInstructions);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const jsonString = this.extractJsonFromAIResponse(response.text());

      try {
        const aiResponse = JSON.parse(jsonString);
        return this.validateAIResponse(aiResponse);
      } catch (parseError) {
        console.error('Response JSON:', jsonString);
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }
    } catch (error) {
      throw new Error(`Generation failed: ${error.message}`);
    }
  }

  buildAIPrompt(inputText, formatInstructions) {
    return `
    You are an expert Excel spreadsheet generator. Your task is to create a professional Excel file based on the following input data and format instructions.

    Input Data:
    ${inputText || 'No input data provided - create from scratch based on instructions'}

    Format Instructions:
    ${formatInstructions}

    Your response should be a JSON object with the following structure:
    {
      "sheets": [
        {
          "name": "Sheet1",
          "data": [
            ["Header1", "Header2", "Header3"],
            ["Value1", "Value2", "Value3"],
            ...
          ],
          "formulas": {
            "C2": "A2*B2",
            ...
          },
          "styles": {
            "headers": {
              "fill": "DEEPFBLUE",
              "font": { "color": "FFFFFF", "bold": true }
            },
            "columns": {
              "A": { "width": 20 },
              "B": { "width": 15, "numFmt": "$#,##0.00" }
            },
            "conditionalFormats": [
              {
                "range": "C2:C100",
                "type": "cellIs",
                "operator": "greaterThan",
                "formula": [1000],
                "style": { "fill": "FF00FF00", "font": { "color": "006100" } }
              }
            ]
          },
          "charts": [
            {
              "type": "bar",
              "title": "Sales Report",
              "dataRange": "A1:C10",
              "location": "E1"
            }
          ]
        }
      ],
      "description": "Brief description of what was created"
    }

    Important:
    - Always include proper headers
    - Use appropriate data types (dates, currencies, etc.)
    - Add formulas where calculations are needed
    - Apply professional styling
    - Include any requested charts or special features
    - Make the spreadsheet user-friendly and intuitive
    - Never include any malicious formulas or code
    - Ensure all formulas are valid Excel formulas
    - Keep the response under 4000 tokens
    `;
  }

  extractJsonFromAIResponse(text) {
    const jsonMatch = text.match(/```json([\s\S]*?)```/);
    if (jsonMatch) return jsonMatch[1].trim();

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return text.slice(jsonStart, jsonEnd);
    }

    return text;
  }

  validateAIResponse(response) {
    if (!response.sheets || !Array.isArray(response.sheets)) {
      throw new Error('AI response must contain sheets array');
    }

    response.sheets.forEach(sheet => {
      if (!sheet.data || !Array.isArray(sheet.data)) {
        throw new Error('Each sheet must have a data array');
      }

      if (sheet.name) {
        sheet.name = sheet.name
          .replace(/[\\/?*[\]:]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 31);
        
        if (!sheet.name) {
          sheet.name = `Sheet${response.sheets.indexOf(sheet) + 1}`;
        }
      } else {
        sheet.name = `Sheet${response.sheets.indexOf(sheet) + 1}`;
      }

      if (sheet.formulas) {
        for (const [cell, formula] of Object.entries(sheet.formulas)) {
          if (typeof formula !== 'string') {
            throw new Error(`Formula for ${cell} must be a string`);
          }
          if (formula.includes('=') || formula.toLowerCase().includes('javascript')) {
            throw new Error(`Potentially unsafe formula in cell ${cell}`);
          }
        }
      }
    });

    return response;
  }

  async createExcelWorkbook(aiResponse) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Excel Generator';
    workbook.created = new Date();

    try {
      for (const sheetConfig of aiResponse.sheets) {
        const worksheet = workbook.addWorksheet(sheetConfig.name);
        
        worksheet.addRows(sheetConfig.data);

        if (sheetConfig.formulas) {
          for (const [cell, formula] of Object.entries(sheetConfig.formulas)) {
            worksheet.getCell(cell).value = { formula };
          }
        }

        this.applyWorksheetStyles(worksheet, sheetConfig);

        if (sheetConfig.charts) {
          this.addChartsToWorksheet(worksheet, sheetConfig.charts);
        }

        if (sheetConfig.data.length > 0) {
          worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: sheetConfig.data[0].length }
          };
        }

        worksheet.views = [
          { state: 'frozen', ySplit: 1 }
        ];
      }

      return workbook;
    } catch (error) {
      throw new Error(`Error creating workbook: ${error.message}`);
    }
  }

  applyWorksheetStyles(worksheet, sheetConfig) {
    if (!sheetConfig.styles) return;

    if (sheetConfig.styles.headers && worksheet.rowCount > 0) {
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: sheetConfig.styles.headers.fill || '4472C4' }
        };
        cell.font = {
          color: { argb: sheetConfig.styles.headers.font?.color || 'FFFFFF' },
          bold: sheetConfig.styles.headers.font?.bold !== false
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    }

    if (sheetConfig.styles.columns) {
      for (const [col, style] of Object.entries(sheetConfig.styles.columns)) {
        const column = worksheet.getColumn(col);
        if (style.width) column.width = style.width;
        if (style.numFmt) column.numFmt = style.numFmt;
      }
    }

    if (sheetConfig.styles.conditionalFormats) {
      for (const cf of sheetConfig.styles.conditionalFormats) {
        worksheet.addConditionalFormatting({
          ref: cf.range,
          rules: [
            {
              type: cf.type,
              operator: cf.operator,
              formulae: cf.formula,
              style: {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: cf.style.fill }
                },
                font: {
                  color: { argb: cf.style.font?.color }
                }
              }
            }
          ]
        });
      }
    }
  }

  addChartsToWorksheet(worksheet, chartsConfig) {
    chartsConfig.forEach(chartConfig => {
      try {
        const chart = worksheet.addChart({
          type: chartConfig.type || 'bar',
          title: chartConfig.title,
        });

        const values = worksheet.getCell(chartConfig.dataRange.split(':')[0]).address;
        const categories = worksheet.getCell(chartConfig.dataRange.split(':')[1]).address;
        
        chart.addSeries({
          categories,
          values,
        });

        worksheet.addChart(chart, chartConfig.location || 'E1');
      } catch (error) {
        console.error('Error adding chart:', error);
      }
    });
  }

  async uploadToCloudStorage(buffer, fileName) {
    if (!this.bucket) return null;

    try {
      const sanitizedFileName = sanitizeFilename(fileName || `generated-${Date.now()}.xlsx`);
      const cloudFileName = `excel-files/${uuidv4()}-${sanitizedFileName}`;
      const file = this.bucket.file(cloudFileName);

      await file.save(buffer, {
        metadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      await file.makePublic();
      return file.publicUrl();
    } catch (error) {
      console.error('Error uploading to cloud storage:', error);
      return null;
    }
  }

  async generateExcelFile(inputText, formatInstructions, file, userId) {
    const startTime = Date.now();
    let generationRecord;
    let tempFilePath = null;

    try {
      generationRecord = new ExcelGeneration({
        userId,
        inputText: inputText?.slice(0, MAX_LOG_LENGTH),
        formatInstructions: formatInstructions?.slice(0, MAX_LOG_LENGTH),
        fileName: file?.originalname,
        fileType: file?.mimetype,
        fileSize: file?.size,
        status: 'processing'
      });
      await generationRecord.save();

      let extractedText = inputText || '';
      if (file) {
        extractedText += (extractedText ? '\n\n' : '') + await this.extractTextFromFile(file);
      }

      const aiResponse = await this.generateExcelWithAI(extractedText, formatInstructions);
      const workbook = await this.createExcelWorkbook(aiResponse);

      const buffer = await workbook.xlsx.writeBuffer();
      tempFilePath = path.join(TEMP_DIR, `temp-${Date.now()}.xlsx`);
      await fs.writeFile(tempFilePath, buffer);

      let fileUrl = null;
      if (this.bucket) {
        fileUrl = await this.uploadToCloudStorage(buffer, file?.originalname || 'generated.xlsx');
      }

      generationRecord.status = 'completed';
      generationRecord.processingTime = Date.now() - startTime;
      generationRecord.outputFileUrl = fileUrl;
      generationRecord.aiModelUsed = process.env.AI_MODEL || DEFAULT_AI_MODEL;
      await generationRecord.save();

      return {
        buffer,
        fileUrl,
        description: aiResponse.description,
        generationId: generationRecord._id
      };
    } catch (error) {
      console.error('Error in generateExcelFile:', error);

      if (generationRecord) {
        generationRecord.status = 'failed';
        generationRecord.error = error.message.slice(0, 1000);
        await generationRecord.save().catch(e => console.error('Error saving failed record:', e));
      }

      throw error;
    } finally {
      if (tempFilePath) {
        fs.unlink(tempFilePath).catch(console.error);
      }
    }
  }
}

export default new ExcelGenerationService();