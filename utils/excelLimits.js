// Maximum allowed lengths for Excel generation inputs
export const MAX_INPUT_LENGTH = 100000; // ~100KB
export const MAX_FORMAT_INSTRUCTIONS_LENGTH = 10000;
export const MAX_FILE_SIZE_MB = 10;
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain'
];