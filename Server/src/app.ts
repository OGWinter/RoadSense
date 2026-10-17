import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './shared/logger';
import { createApiV1Router } from './presentation/routes';
import { errorHandler } from './presentation/middleware/error.middleware';
import { generalApiLimiter } from './presentation/middleware/rateLimit.middleware';

export const createApp = (): Application => {
  const app = express();

  // 1. Security Headers
  app.use(helmet());

  // 2. CORS Configuration
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  // 3. Request Logging (excluding raw secrets/passwords)
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/api/v1/health'
      }
    })
  );

  // 4. Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 5. Global Rate Limiter
  app.use(generalApiLimiter);

  // 6. API v1 Versioned Routes
  app.use('/api/v1', createApiV1Router());

  // 7. 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        code: 'ROUTE_NOT_FOUND',
        statusCode: 404
      }
    });
  });

  // 8. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
