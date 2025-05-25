export const handleGenerationErrors = (err, req, res, next) => {
    console.error('[Cover Letter] Route Error:', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      body: { 
        jdLength: req.body.jobDescription?.length,
        resumeLength: req.body.resumeText?.length,
        style: req.body.style
      }
    });
  
    const statusCode = err.message.includes('required') || 
                      err.message.includes('Invalid') ? 400 : 500;
  
    res.status(statusCode).json({
      success: false,
      error: err.message,
      details: statusCode === 500 ? 'Internal server error' : undefined
    });
  };
  
  export const handleDocxErrors = (err, req, res, next) => {
    console.error('[DOCX Generation] Error:', err);
    res.status(500).json({
      success: false,
      error: "Failed to generate DOCX file"
    });
  };