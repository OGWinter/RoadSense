import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../../config/env';

export class HealthController {
  getHealth = (_req: Request, res: Response): void => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.status(200).json({
      success: true,
      service: 'RoadSense Backend API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      database: {
        status: mongoStatus
      }
    });
  };
}
