import { ApiError } from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  if (err.code === 11000) {
    statusCode = 400;
    const keys = Object.keys(err.keyPattern || {});
    if (keys.includes('testDate') || keys.includes('examDate')) {
      message = 'A test already exists for this class, subject, and date. Open it from the marks entry screen to edit.';
    } else if (keys.includes('className') && keys.includes('section')) {
      message = 'This class and section already exists for your school.';
    } else if (keys.includes('rollNo')) {
      message = 'Roll number already exists in this class.';
    } else {
      message = 'Duplicate record. Please check your input and try again.';
    }
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
  }

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
