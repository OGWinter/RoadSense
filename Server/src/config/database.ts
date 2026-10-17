import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../shared/logger';

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    logger.info({ uri: env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@') }, 'Connecting to MongoDB...');
    
    mongoose.set('strictQuery', true);
    
    const connection = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
    });

    logger.info('MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB runtime connection error');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    return connection;
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB');
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected cleanly');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting MongoDB');
  }
};
