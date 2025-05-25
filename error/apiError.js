/**
 * Custom API Error Class
 * @class ApiError
 * @extends Error
 */
export class ApiError extends Error {
  /**
   * Create an API Error
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {boolean} [isOperational=true] - Is this a known operational error?
   * @param {string} [stack=''] - Error stack trace
   * @param {object} [details=null] - Additional error details
   */
  constructor(statusCode, message, isOperational = true, stack = '', details = null) {
    super(message);
    
    // Standard Error properties
    this.name = this.constructor.name;
    this.message = message;
    
    // Custom properties
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Stack trace handling
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for API response
   * @returns {object} - Standardized error response
   */
  toJSON() {
    return {
      error: {
        name: this.name,
        statusCode: this.statusCode,
        status: this.status,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
        isOperational: this.isOperational,
        ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
      }
    };
  }

  // ========== HTTP 4xx Client Errors ========== //
  
  /** 400 Bad Request */
  static badRequest(message = 'Bad Request', details = null) {
    return new ApiError(400, message, true, '', details);
  }
  
  /** 401 Unauthorized */
  static unauthorized(message = 'Unauthorized', details = null) {
    return new ApiError(401, message, true, '', details);
  }
  
  /** 403 Forbidden */
  static forbidden(message = 'Forbidden', details = null) {
    return new ApiError(403, message, true, '', details);
  }
  
  /** 404 Not Found */
  static notFound(message = 'Not Found', details = null) {
    return new ApiError(404, message, true, '', details);
  }
  
  /** 409 Conflict */
  static conflict(message = 'Conflict', details = null) {
    return new ApiError(409, message, true, '', details);
  }
  
  /** 429 Too Many Requests */
  static tooManyRequests(message = 'Too Many Requests', details = null) {
    return new ApiError(429, message, true, '', details);
  }

  // ========== HTTP 5xx Server Errors ========== //
  
  /** 500 Internal Server Error */
  static internal(message = 'Internal Server Error', details = null) {
    return new ApiError(500, message, false, '', details);
  }
  
  /** 503 Service Unavailable */
  static serviceUnavailable(message = 'Service Unavailable', details = null) {
    return new ApiError(503, message, false, '', details);
  }

  // ========== Domain-Specific Errors ========== //
  
  /** 422 Validation Error */
  static validationError(message = 'Validation Error', errors = []) {
    return new ApiError(422, message, true, '', { errors });
  }
  
  /** 400 Invalid File Type */
  static invalidFileType(message = 'Invalid file type', allowedTypes = ['pdf', 'docx', 'xlsx', 'xls', 'txt']) {
    return new ApiError(400, message, true, '', { allowedTypes });
  }
  
  /** 422 File Processing Error */
  static fileProcessingError(message = 'Error processing file', details = null) {
    return new ApiError(422, message, true, '', details);
  }
  
  /** 500 AI Generation Failed */
  static aiGenerationFailed(message = 'AI generation failed', details = null) {
    return new ApiError(500, message, false, '', details);
  }
  
  /** 429 Rate Limit Exceeded */
  static rateLimitExceeded(message = 'Rate limit exceeded', details = null) {
    return new ApiError(429, message, true, '', details);
  }
}

// Default export for backward compatibility
export default ApiError;
