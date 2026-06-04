import pino from 'pino';

/**
 * Bhagyoday Cloud ERP - Structured Logger (Pino)
 */

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined,
});

export default logger;
