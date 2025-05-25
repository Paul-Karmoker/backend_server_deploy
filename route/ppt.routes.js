import express from 'express';
import multer from 'multer';
import { 
  generatePPT, 
  getUserPresentations,
  downloadFile,
  getGenerationStats,
  getPresentationDetails 
} from '../controller/ppt.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   - name: Presentations
 *     description: AI Presentation Generation
 *   - name: Analytics
 *     description: Presentation statistics
 */

// PPT Generation Routes
router.post(
  '/generate',
  upload.single('file'),  // Handle file uploads
  /**
   * @swagger
   * /api/generate:
   *   post:
   *     tags: [Presentations]
   *     summary: Generate a new presentation
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               content:
   *                 type: string
   *               youtubeUrl:
   *                 type: string
   *               file:
   *                 type: string
   *                 format: binary
   *               slideCount:
   *                 type: number
   *                 default: 10
   *               design:
   *                 type: string
   *                 enum: [modern, classic, professional, creative, minimalist]
   *                 default: modern
   *               animation:
   *                 type: boolean
   *                 default: false
   *               includeGraphics:
   *                 type: boolean
   *                 default: false
   */
  generatePPT
);

// Presentation Retrieval Routes
router.get(
  '/presentations',
  /**
   * @swagger
   * /api/presentations:
   *   get:
   *     tags: [Presentations]
   *     summary: Get user presentations
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   */
  getUserPresentations
);

router.get(
  '/presentations/:id',
  /**
   * @swagger
   * /api/presentations/{id}:
   *   get:
   *     tags: [Presentations]
   *     summary: Get presentation details
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   */
  getPresentationDetails
);

// File Download Routes
router.get(
  '/download/:type/:id',
  /**
   * @swagger
   * /api/download/{type}/{id}:
   *   get:
   *     tags: [Presentations]
   *     summary: Download presentation file
   *     parameters:
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           type: string
   *           enum: [pptx, pdf]
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   */
  downloadFile
);

// Backward compatibility route
router.get('/download/pdf/:id', (req, res) => {
  req.params.type = 'pdf';
  return downloadFile(req, res);
});

// Analytics Route
router.get(
  '/stats',
  /**
   * @swagger
   * /api/stats:
   *   get:
   *     tags: [Analytics]
   *     summary: Get generation statistics
   */
  getGenerationStats
);

// New endpoint for YouTube URL processing
router.post(
  '/process-youtube',
  /**
   * @swagger
   * /api/process-youtube:
   *   post:
   *     tags: [Presentations]
   *     summary: Process YouTube URL
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               youtubeUrl:
   *                 type: string
   *                 required: true
   */
  async (req, res) => {
    try {
      const { youtubeUrl } = req.body;
      if (!youtubeUrl) {
        return res.status(400).json({ error: 'YouTube URL is required' });
      }
      
      const transcript = await PPTService.getYouTubeTranscript(youtubeUrl);
      res.json({
        success: true,
        transcript,
        videoId: youtubeUrl.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1] || null
      });
    } catch (error) {
      console.error('YouTube processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process YouTube URL',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;