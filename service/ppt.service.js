import PptxGenJS from 'pptxgenjs';
import { GoogleGenerativeAI } from "@google/generative-ai";
import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';
import { Buffer } from 'buffer';
import chroma from 'chroma-js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { createCanvas } from 'canvas';

dotenv.config();


if (!process.env.GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not defined in environment variables');
}


const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    response_mime_type: "application/json"
  }
});



const chartRenderer = new ChartJSNodeCanvas({
  width: 800,
  height: 600,
  backgroundColour: 'white'
});

export class PPTService {
  static async generatePresentation(
    content,
    slideCount = 5,
    design = 'professional',
    animation = true,
    includeGraphics = true,
    sourceType = 'text',
    sourceMetadata = {},
    presentationDetails = {}
  ) {
    try {
     
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('Presentation content must be a non-empty string');
      }
      
      if (typeof slideCount !== 'number' || slideCount < 1 || slideCount > 50) {
        throw new Error('Slide count must be a number between 1 and 50');
      }

      const validDesigns = ['modern', 'professional', 'creative', 'minimalist', 'corporate'];
      if (!validDesigns.includes(design)) {
        throw new Error(`Invalid design. Must be one of: ${validDesigns.join(', ')}`);
      }

      
      const details = {
        title: 'Presentation Title',
        subtitle: 'Presentation Subtitle',
        venue: 'Venue Name',
        date: new Date().toLocaleDateString(),
        presenterName: 'Presenter Name',
        presenterTitle: 'Presenter Title',
        contactInfo: {
          email: 'email@example.com',
          phone: '+1 (123) 456-7890',
          website: 'www.example.com'
        },
        ...presentationDetails
      };

      // Enhance content with fallback to original if enhancement fails
      let enhancedContent;
      try {
        enhancedContent = await this.enhanceContentWithAI(content, slideCount);
      } catch (enhanceError) {
        console.error('Content enhancement failed, using original content:', enhanceError.message);
        enhancedContent = { enhancedContent: content };
      }

      // Generate slides with retry logic
      const slides = await this.generateProfessionalSlideContent(
        enhancedContent.enhancedContent || content,
        slideCount, 
        design, 
        includeGraphics
      );
      
      const { pptx, processingTime } = await this.createProfessionalPptx(slides, design, animation, includeGraphics, details);
      
      // Generate output files
      const [pptBuffer, pdfBuffer, thumbnail] = await Promise.all([
        pptx.write({
          compression: true,
          outputType: 'nodebuffer',
          PowerPointCompat: true
        }),
        this.createPdfPresentation(slides, design, includeGraphics, details),
        this.generatePresentationThumbnail(slides, design)
      ]);
      
      // Validate output files
      if (!pptBuffer || pptBuffer.length < 1000) throw new Error('Generated PPTX file is corrupted');
      if (!pdfBuffer || pdfBuffer.length < 1000) throw new Error('Generated PDF file is corrupted');
      
      // Prepare metadata
      const metadata = {
        slideCount,
        design,
        animation,
        includeGraphics,
        sourceType,
        sourceMetadata,
        processingTime: Date.now() - processingTime,
        fileSize: {
          ppt: Math.round(pptBuffer.length / 1024),
          pdf: Math.round(pdfBuffer.length / 1024)
        },
        designSystem: slides.metadata,
        contentLength: content.length,
        enhancedContentLength: enhancedContent.enhancedContent?.length || 0,
        presentationDetails: details
      };

      return { 
        pptBuffer, 
        pdfBuffer,
        thumbnail,
        metadata
      };
    } catch (error) {
      console.error('Error in generatePresentation:', error.message);
      throw new Error(`Failed to generate presentation: ${error.message}`);
    }
  }

  static async generatePresentationThumbnail(slidesData, design) {
    try {
      const canvas = createCanvas(800, 600);
      const ctx = canvas.getContext('2d');
      const designSystem = this.getDesignSystem(design);

      // Fill background
      ctx.fillStyle = designSystem.primary;
      ctx.fillRect(0, 0, 800, 600);

      // Add title
      ctx.fillStyle = designSystem.textLight;
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Presentation Preview', 400, 50);

      // Add slide previews
      const previewSlides = slidesData.slides.slice(0, 3); // Show first 3 slides
      previewSlides.forEach((slide, i) => {
        const x = 100 + (i * 220);
        const y = 100;
        
        // Slide background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, 200, 150);
        
        // Slide title
        ctx.fillStyle = designSystem.primary;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(slide.title.substring(0, 30), x + 10, y + 20);
        
        // Content preview
        ctx.fillStyle = '#333333';
        ctx.font = '12px Arial';
        if (slide.content && slide.content.length > 0) {
          ctx.fillText(slide.content[0].substring(0, 40), x + 10, y + 40);
        }
        
        // Design indicator
        ctx.fillStyle = designSystem.accent;
        ctx.fillRect(x, y + 130, 200, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.fillText(`${design} design`, x + 100, y + 145, 200);
      });

      // Add footer
      ctx.fillStyle = designSystem.textLight;
      ctx.font = '14px Arial';
      ctx.fillText(`${slidesData.slides.length} slides | ${new Date().toLocaleDateString()}`, 400, 550);

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error generating thumbnail:', error.message);
      return null;
    }
  }

  static async enhanceContentWithAI(content, slideCount) {
    // Enhanced validation with content length check
    if (!content || content.trim().length < 10) {
      console.warn('Content too short for enhancement, using as-is');
      return {
        enhancedContent: content,
        narratives: [],
        visualSuggestions: [],
        dataPoints: [],
        speakerNotes: [],
        transitions: []
      };
    }

    try {
      const prompt = `Enhance this presentation content with:
      1. Detailed narratives (50-75 words per main point)
      2. Visual suggestions with specific placement instructions
      3. Data visualization opportunities
      4. Speaker notes for each slide
      5. Transition suggestions between slides
      6. Detailed narratives (20-30 words per sub point)
      7. Use charts and table as per need 
      
      Content: "${content.substring(0, 10000)}" // Limit content length
      
      Required output format (JSON):
      {
        "enhancedContent": "Enhanced content with detailed analysis",
        "narratives": ["detailed narrative with insights"],
        "visualSuggestions": [
          {
            "type": "icon|chart|image|diagram",
            "description": "Specific description",
            "placement": "left|right|full|header",
            "reference": "Relevant to which content point",
            "style": "flat|3d|outline"
          }
        ],
        "dataPoints": [
          {
            "fact": "Specific statistic",
            "source": "Optional source",
            "visualization": "bar|pie|line|area"
          }
        ],
        "speakerNotes": [
          {
            "slide": 1,
            "notes": "Detailed talking points"
          }
        ],
        "transitions": [
          {
            "from": 1,
            "to": 2,
            "type": "fade|push|wipe",
            "duration": 0.5
          }
        ]
      }`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      const response = await result.response;
      const text = response.text();
      
      // Enhanced JSON cleaning with additional fixes
      let jsonString = text
        .replace(/```json|```/g, '')
        .replace(/[-\u001F\u007F-\u009F]/g, '')
        .replace(/(\w+)\s*:/g, '"$1":')  // Fix unquoted keys
        .replace(/:\s*'([^']+)'/g, ': "$1"')  // Fix single-quoted values
        .trim();

      try {
        return JSON.parse(jsonString);
      } catch (parseError) {
        console.warn('Initial JSON parse failed, attempting to fix...');
        jsonString = this.fixMalformedJson(jsonString);
        return JSON.parse(jsonString);
      }
    } catch (error) {
      console.error('AI enhancement failed:', error.message);
      return { 
        enhancedContent: content,
        narratives: [], 
        visualSuggestions: [],
        dataPoints: [],
        speakerNotes: [],
        transitions: []
      };
    }
  }

  static async generateProfessionalSlideContent(content, slideCount, design, includeGraphics, retries = 3) {
    // Enhanced validation with better error messages
    if (!content) {
      throw new Error('Content is required for slide generation');
    }
    
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }
    
    const cleanedContent = content.trim();
    if (cleanedContent.length === 0) {
      throw new Error('Content cannot be empty');
    }
    
    if (typeof slideCount !== 'number' || isNaN(slideCount) || slideCount < 1 || slideCount > 20) {
      throw new Error('Slide count must be a number between 1 and 20');
    }

    const designSystem = this.getDesignSystem(design);
    
    const prompt = `
    Act as a professional presentation designer with 10 years experience.
    Create a detailed, ready-to-use PowerPoint about: ${cleanedContent.substring(0, 5000)} // Limit content length

    STRICT REQUIREMENTS:
    1. Slide Count: ${slideCount}
    2. Design Style: ${design} (use this color palette: ${JSON.stringify(designSystem)})
    3. ${includeGraphics ? 'Include relevant graphics/illustrations' : 'Text only'}
    4. Include speaker notes for each slide
    5. Suggest slide transitions
    6. Maintain consistent design throughout

    OUTPUT FORMAT (JSON):
    {
      "slides": [
        {
          "title": "Title",
          "content": ["rich paragraph with detailed analysis", "bullet points"],
          "design": {
            "background": "#FFFFFF",
            "textColor": "#2F5496",
            "accentColor": "#4472C4",
            "font": {
              "heading": "Arial",
              "body": "Calibri"
            }
          },
          "graphics": [
            {
              "type": "icon|chart|image|diagram",
              "description": "Relevant icon for content",
              "placement": "right",
              "style": "flat|3d|outline"
            }
          ],
          "speakerNotes": "Detailed talking points for presenters",
          "animation": {
            "entrance": "fade",
            "emphasis": "pulse",
            "exit": "fade"
          }
        }
      ],
      "metadata": {
        "colorPalette": ["#2F5496", "#4472C4", "#A5A5A5"],
        "fontScheme": {
          "heading": "Calibri Light",
          "body": "Calibri"
        },
        "transitions": [
          {
            "from": 1,
            "to": 2,
            "type": "fade",
            "duration": 0.5
          }
        ]
      }
    }`;

    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        
        const response = await result.response;
        const text = response.text();
        
        // Enhanced JSON cleaning and parsing
        let jsonString = text
          .replace(/```json|```/g, '')
          .replace(/[-\u001F\u007F-\u009F]/g, '')
          .trim();

        try {
          const parsed = JSON.parse(jsonString);
          // Enhanced validation
          if (!parsed.slides || !Array.isArray(parsed.slides)) {
            throw new Error('Invalid slide data structure');
          }
          
          // Ensure each slide has required fields
          parsed.slides = parsed.slides.map(slide => ({
            title: slide.title || 'Untitled Slide',
            content: slide.content || [],
            design: slide.design || {
              background: '#FFFFFF',
              textColor: designSystem.textDark,
              accentColor: designSystem.accent
            },
            graphics: slide.graphics || [],
            speakerNotes: slide.speakerNotes || '',
            animation: slide.animation || {
              entrance: 'fade',
              emphasis: 'none',
              exit: 'fade'
            }
          }));
          
          return parsed;
        } catch (parseError) {
          console.warn(`JSON parse attempt ${attempt} failed, trying to fix...`);
          jsonString = this.fixMalformedJson(jsonString);
          const parsed = JSON.parse(jsonString);
          if (!parsed.slides) throw new Error('Failed to fix JSON structure');
          return parsed;
        }
        
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    
    throw new Error(`Failed after ${retries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  static fixMalformedJson(jsonString) {
    try {
      // First try to parse directly (might work for simple cases)
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        // If direct parse fails, attempt fixes
        return jsonString
          .replace(/'/g, '"') // Single to double quotes
          .replace(/(\w+):\s*([^"{\[\d][^,}\]\s]*)/g, '"$1": "$2"') // Unquoted properties
          .replace(/:\s*([^"{\[\d][^,}\]\s]*)/g, ': "$1"') // Unquoted values
          .replace(/,\s*([}\]])/g, '$1') // Trailing commas
          .replace(/\n/g, '\\n') // Newlines in strings
          .replace(/\r/g, '\\r') // Carriage returns
          .replace(/\t/g, '\\t') // Tabs
          .replace(/\\"/g, '"') // Remove escaped quotes
          .replace(/"(true|false|null)"/g, '$1'); // Fix quoted primitives
      }
    } catch (error) {
      console.error('Failed to fix JSON:', error.message);
      throw new Error('Unable to parse AI response');
    }
  }

  static getDesignSystem(design) {
    const systems = {
      modern: {
        primary: '#2F5496',
        secondary: '#4472C4',
        accent: '#ED7D31',
        textDark: '#2F2F2F',
        textLight: '#FFFFFF',
        fonts: {
          heading: 'Calibri Light',
          body: 'Calibri'
        }
      },
      professional: {
        primary: '#404040',
        secondary: '#808080',
        accent: '#C00000',
        textDark: '#000000',
        textLight: '#FFFFFF',
        fonts: {
          heading: 'Arial',
          body: 'Times New Roman'
        }
      },
      creative: {
        primary: '#5B9BD5',
        secondary: '#ED7D31',
        accent: '#A5A5A5',
        textDark: '#000000',
        textLight: '#FFFFFF',
        fonts: {
          heading: 'Verdana',
          body: 'Georgia'
        }
      },
      minimalist: {
        primary: '#FFFFFF',
        secondary: '#F5F5F5',
        accent: '#333333',
        textDark: '#333333',
        textLight: '#FFFFFF',
        fonts: {
          heading: 'Helvetica',
          body: 'Helvetica'
        }
      },
      corporate: {
        primary: '#1F4E79',
        secondary: '#2E75B6',
        accent: '#FFC000',
        textDark: '#1F1F1F',
        textLight: '#FFFFFF',
        fonts: {
          heading: 'Garamond',
          body: 'Garamond'
        }
      }
    };
    return systems[design] || systems.modern;
  }

  static async generateChartImage(chartConfig) {
    try {
      // Default configuration if not provided
      const config = chartConfig || {
        type: 'bar',
        data: {
          labels: ['Q1', 'Q2', 'Q3', 'Q4'],
          datasets: [{
            label: 'Sample Data',
            data: [12, 19, 3, 5],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Sample Chart'
            }
          }
        }
      };

      return await chartRenderer.renderToBuffer(config);
    } catch (error) {
      console.error('Error generating chart:', error.message);
      return null;
    }
  }

  static async createProfessionalPptx(slidesData, design, animation, includeGraphics, presentationDetails) {
    const startTime = Date.now();
    try {
      if (!slidesData?.slides || !Array.isArray(slidesData.slides)) {
        throw new Error('Invalid slides data structure');
      }

      const pptx = new PptxGenJS();
      const designSystem = this.getDesignSystem(design);
      
      // Helper function to clean color values
      const cleanColor = (color) => {
        if (!color) return designSystem.textDark.replace('#', '');
        return color.replace(/[^0-9A-F]/gi, '').substring(0, 6);
      };

      // Define professional slide master
      pptx.defineSlideMaster({
        title: `PRO_MASTER_${design.toUpperCase()}`,
        background: { color: cleanColor(designSystem.primary) },
        margin: [0.3, 0.3, 0.3, 0.3],
        slideNumber: { x: 0.5, y: 7.0, color: cleanColor(designSystem.textLight) },
        objects: [
          { 
            rect: { 
              x: 0, y: 0, w: '100%', h: 0.4,
              fill: { color: cleanColor(designSystem.secondary) },
              line: { 
                color: cleanColor(designSystem.accent), 
                width: 1 
              }
            } 
          },
          {
            text: {
              text: presentationDetails.title || 'Professional Presentation',
              options: {
                x: 0.5, y: 0.1,
                fontFace: designSystem.fonts.heading,
                fontSize: 10,
                color: cleanColor(designSystem.textLight)
              }
            }
          }
        ]
      });

      // Add Title Slide (First Page)
      const titleSlide = pptx.addSlide(`PRO_MASTER_${design.toUpperCase()}`);
      titleSlide.background = { color: cleanColor(designSystem.primary) };
      
      // Title
      titleSlide.addText(presentationDetails.title, {
        x: 1, y: 1, w: 8, h: 1.5,
        fontFace: designSystem.fonts.heading,
        fontSize: 36,
        bold: true,
        color: cleanColor(designSystem.textLight),
        align: 'center',
        valign: 'middle'
      });
      
      // Subtitle
      if (presentationDetails.subtitle) {
        titleSlide.addText(presentationDetails.subtitle, {
          x: 1, y: 2.5, w: 8, h: 0.8,
          fontFace: designSystem.fonts.heading,
          fontSize: 24,
          color: cleanColor(designSystem.textLight),
          align: 'center'
        });
      }
      
      // Presenter Info
      const presenterInfo = [
        presentationDetails.presenterName,
        presentationDetails.presenterTitle,
        `\n${presentationDetails.venue}`,
        presentationDetails.date
      ].filter(Boolean).join('\n');
      
      titleSlide.addText(presenterInfo, {
        x: 3, y: 4, w: 4, h: 1.5,
        fontFace: designSystem.fonts.body,
        fontSize: 18,
        color: cleanColor(designSystem.textLight),
        align: 'center',
        valign: 'middle'
      });

      // Add Contact Table Slide (Second Page)
      const contactSlide = pptx.addSlide(`PRO_MASTER_${design.toUpperCase()}`);
      
      contactSlide.addText('Contact Information', {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontFace: designSystem.fonts.heading,
        fontSize: 28,
        bold: true,
        color: cleanColor(designSystem.textDark),
        align: 'left'
      });
      
      const contactRows = [
        [{ text: 'Email', options: { bold: true, color: cleanColor(designSystem.accent) }}, 
         { text: presentationDetails.contactInfo.email || 'N/A', options: { color: cleanColor(designSystem.textDark) }}],
        [{ text: 'Phone', options: { bold: true, color: cleanColor(designSystem.accent) }}, 
         { text: presentationDetails.contactInfo.phone || 'N/A', options: { color: cleanColor(designSystem.textDark) }}],
        [{ text: 'Website', options: { bold: true, color: cleanColor(designSystem.accent) }}, 
         { text: presentationDetails.contactInfo.website || 'N/A', options: { color: cleanColor(designSystem.textDark) }}]
      ];
      
      contactSlide.addTable(contactRows, {
        x: 0.5, y: 1.5,
        w: 9,
        colW: [2, 7],
        border: { type: 'none' },
        autoPage: false,
        fontSize: 16,
        fontFace: designSystem.fonts.body,
        valign: 'middle',
        rowH: 0.5
      });

      // Add Content Slides
      for (const [index, slide] of slidesData.slides.entries()) {
        if (index > 50) break; // Limit to 50 slides for safety
        
        const pptSlide = pptx.addSlide(`PRO_MASTER_${design.toUpperCase()}`);
        
        // Set slide background if specified
        if (slide.design?.background) {
          pptSlide.background = { color: cleanColor(slide.design.background) };
        }

        // Title with professional styling
        pptSlide.addText(slide.title || `Slide ${index + 1}`, {
          x: 0.5, y: 0.5, w: 9, h: 0.8,
          fontFace: slide.design?.font?.heading || designSystem.fonts.heading,
          fontSize: 28,
          bold: true,
          color: cleanColor(slide.design?.textColor || designSystem.textDark),
          align: 'left'
        });

        // Rich content with formatted text
        for (const [i, text] of (slide.content || []).entries()) {
          if (i > 10) break; // Limit to 10 content items per slide
          
          const bulletOptions = {
            x: 0.5, y: 1.5 + (i * 0.6),
            w: includeGraphics ? 5.5 : 8.5,
            fontFace: slide.design?.font?.body || designSystem.fonts.body,
            fontSize: 16,
            color: cleanColor(chroma(slide.design?.textColor || designSystem.textDark).darken(0.2).hex()),
            bullet: { type: 'bullet', indent: 0.5 }
          };

          // Add animation if enabled
          if (animation && slide.animation?.entrance) {
            bulletOptions.animations = [{ 
              effect: slide.animation.entrance, 
              delay: i * 200 
            }];
          }

          pptSlide.addText(`• ${String(text).substring(0, 500)}`, bulletOptions);
        }

        // Add graphics if enabled and available
        if (includeGraphics && slide.graphics?.length > 0) {
          for (const graphic of slide.graphics.slice(0, 3)) {
            if (graphic?.description) {
              const placement = graphic.placement || 'right';
              const graphicOptions = {
                x: placement === 'left' ? 6.0 : 0.5,
                y: placement === 'header' ? 0.2 : 1.5,
                w: placement === 'full' ? 9.0 : 4.0,
                h: placement === 'full' ? 5.0 : 3.0,
                align: 'center',
                valign: 'middle'
              };

              if (graphic.type === 'chart') {
                try {
                  const chartBuffer = await this.generateChartImage({
                    type: graphic.style || 'bar',
                    data: {
                      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                      datasets: [{
                        label: graphic.description.substring(0, 30),
                        data: [12, 19, 3, 5],
                        backgroundColor: [
                          `rgba(${chroma(designSystem.accent).rgb().join(',')}, 0.7)`
                        ],
                        borderColor: [
                          `rgba(${chroma(designSystem.accent).rgb().join(',')}, 1)`
                        ],
                        borderWidth: 1
                      }]
                    },
                    options: {
                      responsive: true,
                      plugins: {
                        title: [
                          {
                            display: true,
                            text: graphic.description.substring(0, 50)
                          }
                        ]
                      }
                    }
                  });

                  if (chartBuffer) {
                    pptSlide.addImage({
                      data: chartBuffer,
                      ...graphicOptions
                    });
                    continue;
                  }
                } catch (error) {
                  console.error('Error generating chart:', error.message);
                }
              }

              // Fallback to text placeholder
              pptSlide.addText(`[${graphic.type?.toString().toUpperCase() || 'GRAPHIC'}: ${graphic.description?.substring(0, 100) || ''}]`, {
                ...graphicOptions,
                fill: { color: cleanColor(designSystem.accent) + '20' },
                fontSize: 12,
                color: cleanColor(designSystem.textDark)
              });
            }
          }
        }

        // Add speaker notes if available
        if (slide.speakerNotes) {
          pptSlide.addNotes(String(slide.speakerNotes).substring(0, 1000));
        }

        // Add transition if specified in metadata
        if (slidesData.metadata?.transitions) {
          const transition = slidesData.metadata.transitions.find(t => t.from === index);
          if (transition) {
            pptSlide.slideTransition = {
              type: transition.type || 'fade',
              duration: transition.duration || 0.5
            };
          }
        }
      }

      // Add Thank You Slide (Last Page)
      const thankYouSlide = pptx.addSlide(`PRO_MASTER_${design.toString().toUpperCase()}`);
      thankYouSlide.background = { color: cleanColor(designSystem.primary) };
      
      thankYouSlide.addText('Thank You', {
        x: 1, y: 2, w: 8, h: 2,
        fontFace: designSystem.fonts.heading,
        fontSize: 48,
        bold: true,
        color: cleanColor(designSystem.textLight),
        align: 'center',
        valign: 'middle'
      });
      
      if (presentationDetails.contactInfo) {
        const contactText = [
          presentationDetails.contactInfo.email,
          presentationDetails.contactInfo.phone,
          presentationDetails.contactInfo.website
        ].filter(Boolean).join(' | ');
        
        thankYouSlide.addText(contactText, {
          x: 1, y: 4.5, w: 8, h: 0.5,
          fontFace: designSystem.fonts.body,
          fontSize: 14,
          color: cleanColor(designSystem.textLight),
          align: 'center'
        });
      }

      return { pptx, processingTime: Date.now() - startTime };
    } catch (error) {
      console.error('Error creating professional PPTx:', error.message);
      throw new Error(`Failed to create PowerPoint: ${error.message}`);
    }
  }

  static async createPdfPresentation(slidesData, design, includeGraphics, presentationDetails) {
    return new Promise((resolve, reject) => {
      try {
        if (!slidesData?.slides || !Array.isArray(slidesData.slides)) {
          throw new Error('Invalid slides data structure');
        }

        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 50, left: 50, right: 50, bottom: 50 },
          pdfVersion: '1.7',
          info: {
            Title: presentationDetails.title || 'AI Generated Presentation',
            Author: presentationDetails.presenterName || 'AI PPT Generator',
            Creator: 'Presentation Service'
          }
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (error) => reject(error));

        const designSystem = this.getDesignSystem(design);

        // Title Page
        doc.fillColor(designSystem.primary)
           .rect(0, 0, doc.page.width, doc.page.height)
           .fill();
        
        doc.font('Helvetica-Bold')
           .fontSize(36)
           .fillColor(designSystem.textLight)
           .text(presentationDetails.title, { 
             align: 'center',
             width: doc.page.width - 100,
             x: 50,
             y: doc.page.height / 3
           });
           
        if (presentationDetails.subtitle) {
          doc.font('Helvetica')
             .fontSize(24)
             .text(presentationDetails.subtitle, {
               align: 'center',
               width: doc.page.width - 100,
               x: 50,
               y: doc.page.height / 3 + 60
             });
        }
        
        const presenterInfo = [
          presentationDetails.presenterName,
          presentationDetails.presenterTitle,
          presentationDetails.venue,
          presentationDetails.date
        ].filter(Boolean).join('\n');
        
        doc.font('Helvetica')
           .fontSize(18)
           .text(presenterInfo, {
             align: 'center',
             width: doc.page.width - 100,
             x: 50,
             y: doc.page.height / 2
           });

        // Contact Page
        doc.addPage()
           .font('Helvetica-Bold')
           .fontSize(24)
           .fillColor(designSystem.textDark)
           .text('Contact Information', { align: 'left' });
           
        doc.moveDown()
           .font('Helvetica')
           .fontSize(14);
           
        const contactInfo = presentationDetails.contactInfo || {};
        if (contactInfo.email) {
          doc.text(`Email: ${contactInfo.email}`, { indent: 30 });
          doc.moveDown(0.5);
        }
        if (contactInfo.phone) {
          doc.text(`Phone: ${contactInfo.phone}`, { indent: 30 });
          doc.moveDown(0.5);
        }
        if (contactInfo.website) {
          doc.text(`Website: ${contactInfo.website}`, { indent: 30 });
        }

        // Content Slides
        slidesData.slides.slice(0, 50).forEach((slide, index) => {
          doc.addPage();
          
          // Title
          doc.font('Helvetica-Bold')
             .fontSize(24)
             .fillColor(designSystem.textDark)
             .text(slide.title || `Slide ${index + 1}`, { align: 'left' });
          
          // Content
          doc.moveDown();
          doc.font('Helvetica')
             .fontSize(14)
             .fillColor(designSystem.textDark);
          
          (slide.content || []).slice(0, 10).forEach(point => {
            doc.text(`• ${String(point).substring(0, 500)}`, {
              indent: 30,
              paragraphGap: 5,
              lineGap: 2
            });
          });

          // Speaker notes
          if (slide.speakerNotes) {
            doc.moveDown()
               .fontSize(12)
               .fillColor('#666666')
               .text(String(slide.speakerNotes).substring(0, 1000), {
                 indent: 30
               });
          }

          // Graphics placeholder
          if (includeGraphics && slide.graphics?.length > 0 && slide.graphics[0]?.description) {
            doc.moveDown()
               .rect(300, 200, 200, 100)
               .fill(designSystem.secondary || '#FFFFFF20')
               .stroke(designSystem.accent)
               .fontSize(10)
               .fillColor(designSystem.textDark)
               .text(`Visual: ${slide.graphics[0].description.substring(0, 100)}`, 300, 240, { 
                 align: 'center',
                 width: 200
               });
          }
          
          // Footer
          doc.fontSize(10)
             .fillColor(designSystem.accent)
             .text(`Page ${index + 3}`, { align: 'right' }); // +3 to account for title and contact pages
        });

        // Thank You Page
        doc.addPage()
           .fillColor(designSystem.primary)
           .rect(0, 0, doc.page.width, doc.page.height)
           .fill();
           
        doc.font('Helvetica-Bold')
           .fontSize(48)
           .fillColor(designSystem.textLight)
           .text('Thank You', {
             align: 'center',
             width: doc.page.width - 100,
             x: 50,
             y: doc.page.height / 3
           });
           
        if (presentationDetails.contactInfo) {
          const contactText = [
            contactInfo.email,
            contactInfo.phone,
            contactInfo.website
          ].filter(Boolean).join(' | ');
          
          doc.font('Helvetica')
             .fontSize(14)
             .text(contactText, {
               align: 'center',
               width: doc.page.width - 100,
               x: 50,
               y: doc.page.height / 2
             });
        }

        doc.end();
      } catch (error) {
        console.error('Error creating PDF:', error.message);
        reject(new Error(`Failed to create PDF: ${error.message}`));
      }
    });
  }
}