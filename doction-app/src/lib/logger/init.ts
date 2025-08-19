import { logger, LogLevel } from './Logger'
import { startProcessMonitoring } from './middleware'

// Initialize logging system
export function initializeLogging() {
  // Ensure we only initialize once per process
  const g: any = globalThis as any
  if (g.__DOCTION_LOGGING_INITIALIZED__) {
    return logger
  }
  g.__DOCTION_LOGGING_INITIALIZED__ = true
  // Set log level based on environment
  const logLevel = process.env.NODE_ENV === 'production' 
    ? LogLevel.INFO 
    : LogLevel.DEBUG

  logger.setLogLevel(logLevel)
  
  // Start process monitoring in production
  if (process.env.NODE_ENV === 'production') {
    startProcessMonitoring(60000) // Every minute
  } else {
    startProcessMonitoring(300000) // Every 5 minutes in development
  }

  // Log system startup
  logger.info('system', 'Logging system initialized', {
    nodeEnv: process.env.NODE_ENV,
    logLevel: LogLevel[logLevel],
    processMonitoring: true
  })

  // Set up global error handlers
  if (typeof process !== 'undefined') {
    process.on('uncaughtException', (error) => {
      logger.error('system', 'Uncaught exception', error)
      // In production, you might want to gracefully shutdown
      if (process.env.NODE_ENV === 'production') {
        setTimeout(() => process.exit(1), 1000)
      }
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('system', 'Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString()
      })
    })
  }

  // Clean up old logs on startup (keep 30 days)
  logger.cleanOldLogs(30)

  return logger
}

// Export commonly used logging functions
export { logger } from './Logger'
export { 
  withRequestLogging, 
  withPerformanceLogging, 
  withDatabaseLogging 
} from './middleware'
