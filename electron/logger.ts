import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { app } from 'electron';
import * as path from 'path';

// Create logs directory in userData
const logsDir = path.join(app.getPath('userData'), 'logs');

// Ensure logs directory exists
import * as fs from 'fs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Daily rotating file transport
const dailyRotateFile = new DailyRotateFile({
  filename: path.join(logsDir, 'icarus-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '30d',
  format: logFormat,
  level: 'debug'
});

// Error file transport (separate file for errors)
const errorFile = new DailyRotateFile({
  filename: path.join(logsDir, 'icarus-error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '10m',
  maxFiles: '30d',
  format: logFormat,
  level: 'error'
});

// Console transport for development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
});

// Create the logger
const logger = winston.createLogger({
  level: 'debug',
  format: logFormat,
  transports: [
    dailyRotateFile,
    errorFile,
    consoleTransport
  ],
  exitOnError: false
});

// Handle transport events
dailyRotateFile.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log file rotated', { oldFilename, newFilename });
});

dailyRotateFile.on('error', (error) => {
  console.error('Daily rotate file error:', error);
});

// Export logger and helper functions
export { logger };

// Helper functions for common logging patterns
export const loggers = {
  // Application lifecycle
  startup: (message: string, meta?: any) => logger.info(`[STARTUP] ${message}`, meta),
  shutdown: (message: string, meta?: any) => logger.info(`[SHUTDOWN] ${message}`, meta),
  
  // IPC communication
  ipc: (message: string, meta?: any) => logger.debug(`[IPC] ${message}`, meta),
  
  // RAG operations
  rag: (message: string, meta?: any) => logger.info(`[RAG] ${message}`, meta),
  
  // Ollama operations
  ollama: (message: string, meta?: any) => logger.info(`[OLLAMA] ${message}`, meta),
  
  // File operations
  file: (message: string, meta?: any) => logger.debug(`[FILE] ${message}`, meta),
  
  // Chat operations
  chat: (message: string, meta?: any) => logger.debug(`[CHAT] ${message}`, meta),
  
  // Settings operations
  settings: (message: string, meta?: any) => logger.debug(`[SETTINGS] ${message}`, meta),
  
  // Error logging with context
  error: (message: string, error?: Error, meta?: any) => {
    logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
  },
  
  // Performance logging
  performance: (operation: string, duration: number, meta?: any) => {
    logger.info(`[PERFORMANCE] ${operation} took ${duration}ms`, meta);
  },
  
  // Security events
  security: (message: string, meta?: any) => logger.warn(`[SECURITY] ${message}`, meta),
  
  // User actions
  user: (action: string, meta?: any) => logger.info(`[USER] ${action}`, meta)
};

// Log application startup
logger.info('Logger initialized', {
  logsDir,
  environment: process.env.NODE_ENV || 'production',
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node
});

export default logger;