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

router.post(
  '/generate',
  upload.single('file'),
  generatePPT
);


router.get(
  '/presentations',
  
  getUserPresentations
);

router.get(
  '/presentations/:id',
  
  getPresentationDetails
);


router.get(
  '/download/:type/:id',
  
  downloadFile
);


router.get('/download/pdf/:id', (req, res) => {
  req.params.type = 'pdf';
  return downloadFile(req, res);
});


router.get(
  '/stats',
  
  getGenerationStats
);


router.post(
  '/process-youtube',
  
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
        details: process.env.NODE_ENV === 'production' ? error.message : undefined
      });
    }
  }
);

export default router;