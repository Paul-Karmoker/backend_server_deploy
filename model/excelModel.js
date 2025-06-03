import { GoogleGenerativeAI } from '@google/generative-ai';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import { PDFDocument } from 'pdf-lib';
import * as XLSX from 'xlsx';

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Helper function to extract text from different file types
export async function extractTextFromFile(file) {
  try {
    if (!file || !file.buffer) {
      throw new Error('Invalid file buffer provided');
    }
    const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer);

    if (file.mimetype === 'application/pdf') {
      try {
        // Load the PDF using pdf-lib
        const pdfDoc = await PDFDocument.load(buffer);
        
        // pdf-lib does not have a built-in text extraction method.
        // We can attempt to access the raw content, but this requires manual parsing.
        let text = '';
        const pages = pdfDoc.getPages();
        
        // Loop through each page (this is a simplified approach and may not work for all PDFs)
        for (const page of pages) {
          // pdf-lib doesn’t directly expose text content.
          // You’d need to parse the page’s content streams manually, which is complex.
          // As a placeholder, we can note that text extraction isn’t supported natively.
          text += '[Text extraction from PDF using pdf-lib is not directly supported]\n';
        }
        
        return text || '';
      } catch (pdfError) {
        console.error('Error processing PDF with pdf-lib:', pdfError.message);
        throw new Error('Failed to extract text from PDF');
      }
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } else if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        text += XLSX.utils.sheet_to_csv(worksheet) + '\n\n';
      });
      return text || '';
    } else if (file.mimetype === 'text/plain') {
      return buffer.toString('utf8') || '';
    }
    return '';
  } catch (error) {
    console.error('Error extracting text:', error.message);
    throw new Error(`Failed to extract text from file: ${error.message}`);
  }
}

// Generate Excel based on user input and instructions
export async function generateExcelTemplate(inputText, instructions) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');
  
  // Enhanced AI prompt
  const prompt = `
    You are an expert Excel template generator. Create a professional Excel template based on the following input and instructions.
    Your response must be ONLY a valid JSON object with the following structure - no additional text or markdown:

    Input: "${inputText}"
    
    Instructions: "${instructions}"
    
    Generate a JSON response with this exact structure:
    {
      "templateName": "Descriptive name for the template",
      "description": "Brief description of what this template does",
      "columns": [
        {"name": "Column1", "type": "text|number|date|boolean", "width": 15},
        {"name": "Column2", "type": "text|number|date|boolean", "width": 20}
      ],
      "formulas": [
        {"column": "Total", "formula": "SUM(B2:C2)", "applyToRows": "all"}
      ],
      "validations": [
        {"column": "Category", "type": "list", "options": ["Option1", "Option2"]}
      ],
      "formatting": {
        "header": {"bgColor": "blue", "fontColor": "white", "bold": true},
        "data": {"alternateRowColor": "lightgray"},
        "specificColumns": [
          {"column": "Amount", "numberFormat": "$#,##0.00"}
        ]
      },
      "sampleData": [
        {"Column1": "Example1", "Column2": 100},
        {"Column1": "Example2", "Column2": 200}
      ],
      "features": ["freezeHeader", "autoFilter"]
    }

    Important rules:
    1. The response must be pure JSON parsable by JSON.parse()
    2. Include all requested elements from the instructions
    3. Add appropriate Excel features like formulas, validations, and formatting
    4. Make the template professional and ready to use
    5. Include sample data that demonstrates the template's use
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean the response to extract pure JSON
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonString = text.slice(jsonStart, jsonEnd);
    
    const template = JSON.parse(jsonString);

    // Apply the template to the worksheet
    // Add columns
    worksheet.columns = template.columns.map(col => ({
      header: col.name,
      key: col.name.toLowerCase().replace(/\s+/g, '_'),
      width: col.width || 15,
      style: { 
        numFmt: col.type === 'number' ? '#,##0.00' : 
                col.type === 'date' ? 'dd/mm/yyyy' : undefined
      }
    }));

    // Apply header formatting
    if (template.formatting?.header) {
      const header = worksheet.getRow(1);
      header.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: template.formatting.header.bgColor === 'blue' ? 'FF4F81BD' : 'FF000000' }
        };
        cell.font = {
          bold: template.formatting.header.bold !== false,
          color: { argb: template.formatting.header.fontColor === 'white' ? 'FFFFFFFF' : 'FF000000' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    }

    // Add sample data
    if (template.sampleData && template.sampleData.length > 0) {
      template.sampleData.forEach(data => {
        const row = worksheet.addRow(Object.values(data));
        
        // Apply data formatting
        if (template.formatting?.data?.alternateRowColor) {
          if (row.number % 2 === 0) {
            row.eachCell(cell => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD3D3D3' }
              };
            });
          }
        }
      });
    }

    // Add formulas
    if (template.formulas) {
      template.formulas.forEach(formula => {
        const firstDataRow = 2; // Assuming header is row 1
        const lastRow = worksheet.lastRow?.number || firstDataRow;
        
        for (let i = firstDataRow; i <= lastRow; i++) {
          const cell = worksheet.getRow(i).getCell(formula.column);
          cell.value = {
            formula: formula.formula.replace(/ROW/g, i),
            result: 0
          };
          if (formula.bold) {
            cell.font = { bold: true };
          }
        }
      });
    }

    // Add data validations
    if (template.validations) {
      template.validations.forEach(validation => {
        const col = worksheet.getColumn(validation.column);
        if (col) {
          col.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
            if (rowNumber > 1) { // Skip header
              cell.dataValidation = {
                type: validation.type || 'list',
                allowBlank: true,
                formulae: validation.options ? [`"${validation.options.join(',')}"`] : undefined
              };
            }
          });
        }
      });
    }

    // Add features
    if (template.features) {
      if (template.features.includes('freezeHeader')) {
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      }
      if (template.features.includes('autoFilter')) {
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: worksheet.lastRow.number, column: worksheet.columns.length }
        };
      }
    }

    // Add description as a comment
    if (template.description) {
      worksheet.getCell('A1').note = {
        texts: [{ text: `AI-Generated Template: ${template.description}` }]
      };
    }

    return workbook;
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error(`AI failed to generate template: ${error.message}`);
  }
}