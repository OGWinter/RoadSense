import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../../shared/errors/app.error';
import { logger } from '../../shared/logger';
import { env } from '../../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDev = env.NODE_ENV === 'development';

  // 1. AppError subclasses
  if (err instanceof AppError) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
        statusCode: err.statusCode,
        code: err.code,
        message: err.message
      },
      'Operational application error'
    );

    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || 'APP_ERROR',
        statusCode: err.statusCode,
        details: err.details || null
      }
    });
    return;
  }

  // 2. Multer upload errors
  if (err instanceof multer.MulterError) {
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `Uploaded file exceeds maximum allowed size of ${env.MAX_FILE_SIZE_MB}MB`;
    }

    res.status(400).json({
      success: false,
      error: {
        message,
        code: 'UPLOAD_ERROR',
        statusCode: 400
      }
    });
    return;
  }

  // 3. Mongoose CastError / ValidationError
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: {
        message: `Invalid format for field '${err.path}'`,
        code: 'INVALID_ID_FORMAT',
        statusCode: 400
      }
    });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: 'DATABASE_VALIDATION_ERROR',
        statusCode: 400
      }
    });
    return;
  }

  // 4. Unknown/Unexpected Server Errors
  logger.error(
    {
      path: req.path,
      method: req.method,
      error: err.message,
      stack: err.stack
    },
    'Unhandled server error'
  );

  res.status(500).json({
    success: false,
    error: {
      message: isDev ? err.message : 'An internal server error occurred',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      details: isDev ? err.stack : undefined
    }
  });
};
