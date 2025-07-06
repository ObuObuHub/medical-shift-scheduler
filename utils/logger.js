/**
 * Simple logging utility for the medical shift scheduler
 * In production, this could be replaced with a proper logging service
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  error: (message, data = {}) => {
    if (isDevelopment) {
      console.error(`[${LOG_LEVELS.ERROR}] ${message}`, data);
    }
    // In production, send to error tracking service
  },
  
  warn: (message, data = {}) => {
    if (isDevelopment) {
      console.warn(`[${LOG_LEVELS.WARN}] ${message}`, data);
    }
    // In production, send to logging service
  },
  
  info: (message, data = {}) => {
    if (isDevelopment) {
      console.log(`[${LOG_LEVELS.INFO}] ${message}`, data);
    }
    // In production, only log important info
  },
  
  debug: (message, data = {}) => {
    if (isDevelopment) {
      console.log(`[${LOG_LEVELS.DEBUG}] ${message}`, data);
    }
    // Debug logs only in development
  }
};

export default logger;