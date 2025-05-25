import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { constants, createWriteStream } from 'fs';
import ApiError from '../error/apiError.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileTypeFromBuffer } from 'file-type';
import stream from 'stream';

const pipeline = promisify(stream.pipeline);
const execAsync = promisify(exec);

// Constants
const MAX_FILE_SIZE_MB = 10;
const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain'
];
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.xls', '.txt'];

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../temp/uploads');

// Track active files for cleanup safety
const activeFiles = new Set();

// Ensure upload directory exists
async function ensureUploadDirExists() {
  try {
    await fs.access(UPLOAD_DIR, constants.F_OK | constants.W_OK);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } else {
      throw err;
    }
  }
}

// Initialize upload directory
await ensureUploadDirExists().catch(err => {
  console.error('Failed to initialize upload directory:', err);
  process.exit(1);
});

// Virus scanning function
async function scanForViruses(filePath) {
  try {
    const { stdout } = await execAsync(`clamscan --no-summary ${filePath}`);
    if (stdout.includes('Infected files: 0')) {
      return true;
    }
    await fs.unlink(filePath);
    return false;
  } catch (error) {
    console.error('Virus scan failed:', error);
    await fs.unlink(filePath);
    return false;
  }
}

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      await ensureUploadDirExists();
      cb(null, UPLOAD_DIR);
    } catch (err) {
      cb(new ApiError.internal('Failed to process upload directory'));
    }
  },
  filename: function (req, file, cb) {
    try {
      const extension = path.extname(file.originalname).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(extension)) {
        return cb(ApiError.invalidFileType());
      }

      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const sanitizedName = file.originalname
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      
      const basename = path.basename(sanitizedName, extension);
      const finalName = `${basename}-${uniqueSuffix}${extension}`;
      
      cb(null, finalName);
    } catch (err) {
      cb(new ApiError.internal('Failed to process filename'));
    }
  }
});

const fileFilter = async (req, file, cb) => {
  try {
    // First check the declared MIME type
    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
      return cb(ApiError.invalidFileType());
    }

    // For memory storage, we'll validate after upload
    cb(null, true);
  } catch (err) {
    cb(new ApiError.internal('Failed to validate file type'));
  }
};

const limits = {
  fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  files: 1,
  fields: 5,
  parts: 10
};

const upload = multer({
  storage,
  fileFilter,
  limits,
  onError: (err, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new ApiError.badRequest(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit`));
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        next(new ApiError.badRequest('Only single file uploads are allowed'));
      } else {
        next(new ApiError.badRequest(err.message));
      }
    } else {
      next(err);
    }
  }
});

// Enhanced file validation middleware
const validateUploadedFile = async (req, res, next) => {
  if (!req.file) return next();
  
  const filePath = path.join(UPLOAD_DIR, req.file.filename);
  activeFiles.add(filePath);

  try {
    // 1. Verify actual file type
    const buffer = await fs.readFile(filePath);
    const type = await fileTypeFromBuffer(buffer);
    
    if (!type || !SUPPORTED_MIME_TYPES.includes(type.mime)) {
      await fs.unlink(filePath);
      return next(ApiError.invalidFileType());
    }

    // 2. Virus scanning (optional but recommended)
    const isClean = await scanForViruses(filePath);
    if (!isClean) {
      return next(new ApiError.badRequest('File contains malware'));
    }

    next();
  } catch (err) {
    await fs.unlink(filePath).catch(console.error);
    next(new ApiError.internal('File validation failed'));
  } finally {
    activeFiles.delete(filePath);
  }
};

// Stream-based file processing alternative
const processFileStream = async (fileStream, filename) => {
  const filePath = path.join(UPLOAD_DIR, filename);
  const writeStream = createWriteStream(filePath);
  
  try {
    await pipeline(fileStream, writeStream);
    return filePath;
  } catch (err) {
    await fs.unlink(filePath).catch(console.error);
    throw err;
  }
};

// Cleanup function for uploaded files
async function cleanupUploads() {
  try {
    const files = await fs.readdir(UPLOAD_DIR);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file);
      
      // Skip active files
      if (activeFiles.has(filePath)) continue;

      const stats = await fs.stat(filePath);
      
      if (now - stats.mtimeMs > oneHour) {
        await fs.unlink(filePath).catch(console.error);
      }
    }
  } catch (err) {
    console.error('Error during uploads cleanup:', err);
  }
}

// Run cleanup every hour
setInterval(cleanupUploads, 60 * 60 * 1000);

export default {
  upload,
  validateUploadedFile,
  processFileStream,
  cleanupUploads
};