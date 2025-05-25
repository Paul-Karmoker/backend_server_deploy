import { body, param, validationResult } from 'express-validator';
import ApiError from '../error/apiError.js';

// Supported file types and constants
const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain'
];
const MAX_FILE_SIZE_MB = 10;
const MAX_INPUT_TEXT_LENGTH = 100000;
const MAX_FORMAT_INSTRUCTIONS_LENGTH = 10000;

// Cover Letter Validation
export const coverLetter = [
  body('jobDescription')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 50 })
    .withMessage('Must be at least 50 characters')
    .isLength({ max: MAX_INPUT_TEXT_LENGTH })
    .withMessage(`Cannot exceed ${MAX_INPUT_TEXT_LENGTH} characters`),

  body('resumeText')
    .trim()
    .notEmpty()
    .withMessage('Resume text is required')
    .isLength({ min: 100 })
    .withMessage('Must be at least 100 characters')
    .isLength({ max: MAX_INPUT_TEXT_LENGTH })
    .withMessage(`Cannot exceed ${MAX_INPUT_TEXT_LENGTH} characters`),

  body('style')
    .optional()
    .isIn(['European', 'USA', 'Worldwide', 'Academic', 'Creative'])
    .withMessage('Invalid style selected'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        ApiError.validationError(
          'Invalid cover letter request',
          errors.array()
        )
      );
    }
    next();
  }
];

// DOCX Generation Validation
export const docxGeneration = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 100 })
    .withMessage('Must be at least 100 characters'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        ApiError.badRequest(
          'Invalid DOCX generation request',
          errors.array()
        )
      );
    }
    next();
  }
];

// Existing Excel Generation Validation
const excelGenerationValidation = [
  body('formatInstructions')
    .trim()
    .notEmpty()
    .withMessage('Format instructions are required')
    .isLength({ min: 10 })
    .withMessage('Must be at least 10 characters long')
    .isLength({ max: MAX_FORMAT_INSTRUCTIONS_LENGTH })
    .withMessage(`Cannot exceed ${MAX_FORMAT_INSTRUCTIONS_LENGTH} characters`)
    .customSanitizer(value => {
      return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }),

  body('inputText')
    .optional()
    .trim()
    .isLength({ max: MAX_INPUT_TEXT_LENGTH })
    .withMessage(`Cannot exceed ${MAX_INPUT_TEXT_LENGTH} characters`)
    .customSanitizer(value => {
      return value.replace(/<\/?[^>]+(>|$)/g, '').replace(/\n{3,}/g, '\n\n');
    }),

  body('file')
    .optional()
    .custom((_, { req }) => {
      if (req.file) {
        if (!SUPPORTED_FILE_TYPES.includes(req.file.mimetype)) {
          throw new Error(
            `Unsupported file type. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`
          );
        }
        if (req.file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          throw new Error(
            `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`
          );
        }
      }
      return true;
    }),

  body().custom((_, { req }) => {
    if (!req.file && !req.body.inputText?.trim()) {
      throw new Error('Either a file upload or input text is required');
    }
    return true;
  }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        type: err.type || 'validation'
      }));

      return next(
        ApiError.validationError(
          'Invalid input data',
          errorMessages,
          {
            supportedFileTypes: SUPPORTED_FILE_TYPES,
            maxFileSize: `${MAX_FILE_SIZE_MB}MB`,
            limits: {
              inputText: MAX_INPUT_TEXT_LENGTH,
              formatInstructions: MAX_FORMAT_INSTRUCTIONS_LENGTH
            }
          }
        )
      );
    }
    next();
  }
];

// Status Check Validation
const statusCheckValidation = [
  param('generationId')
    .trim()
    .notEmpty()
    .withMessage('Generation ID is required')
    .isMongoId()
    .withMessage('Invalid generation ID format')
    .isLength({ min: 24, max: 24 })
    .withMessage('Generation ID must be 24 characters long'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorData = {
        validation: {
          generationId: {
            required: 'Must be a valid MongoDB ID',
            format: '24 character hexadecimal string'
          }
        }
      };
      return next(
        ApiError.badRequest(
          'Invalid generation ID',
          errorData
        )
      );
    }
    next();
  }
];

export default {
  coverLetter,
  docxGeneration,
  excelGeneration: excelGenerationValidation,
  statusCheck: statusCheckValidation,
  constants: {
    SUPPORTED_FILE_TYPES,
    MAX_FILE_SIZE_MB,
    MAX_INPUT_TEXT_LENGTH,
    MAX_FORMAT_INSTRUCTIONS_LENGTH
  }
};