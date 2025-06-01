import express from 'express';
import {
  generateContent,
  generateDocx,
  getContentHistory
} from '../controller/doc.controller.js';
import { protect } from '../utils/auth.middleware.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {

    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text, PDF, Word, and Excel files are allowed.'), false);
    }
  }
});

// Content generation routes with file upload support
router.post('/generate-content', upload.single('file'), generateContent);
router.post('/generate-docx', upload.single('file'), generateDocx);

// Protected routes (require authentication)
router.get('/history', protect, getContentHistory);

// Error handling middleware for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ // 413 Payload Too Large
        success: false,
        error: 'File size exceeds 10MB limit'
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message || 'File upload error'
    });
  } else if (err) {
    // Handle other errors
    return res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
  next();
});

export default router;