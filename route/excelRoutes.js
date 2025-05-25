import express from 'express';
import multer from 'multer';
import { generateExcel } from '../controller/excelController.js';

const router = express.Router();
const upload = multer({ 
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain'
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

// Updated to match frontend expectation
router.post(
  '/excel/generate-excel',  // Changed to match what frontend is calling
  upload.single('file'),
  generateExcel
);

export default router;