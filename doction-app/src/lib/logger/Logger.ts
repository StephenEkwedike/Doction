import fs from 'fs'
import path from 'path'

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  timestamp: string
  level: string
  category: string
  message: string
  data?: any
  stack?: string
  requestId?: string
  userId?: string
  sessionId?: string
}

export class Logger {
  private static instance: Logger
  private logDir: string
  private currentLogLevel: LogLevel = LogLevel.INFO
  
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs')
    this.ensureLogDirectory()
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }

    // Create subdirectories for different log types
    const subDirs = ['api', 'chat', 'providers', 'auth', 'database', 'errors', 'performance', 'system']
    subDirs.forEach(dir => {
      const dirPath = path.join(this.logDir, dir)
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
      }
    })
  }

  private getLogFileName(category: string): string {
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    return path.join(this.logDir, category, `${category}-${date}.log`)
  }

  private formatLogEntry(entry: LogEntry): string {
    let logLine = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`
    
    if (entry.requestId) logLine += ` [REQ:${entry.requestId}]`
    if (entry.userId) logLine += ` [USER:${entry.userId}]`
    if (entry.sessionId) logLine += ` [SESSION:${entry.sessionId}]`
    
    logLine += ` ${entry.message}`
    
    if (entry.data) {
      logLine += `\n  DATA: ${typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)}`
    }
    
    if (entry.stack) {
      logLine += `\n  STACK: ${entry.stack}`
    }
    
    return logLine + '\n'
  }

  private writeToFile(category: string, entry: LogEntry): void {
    try {
      const fileName = this.getLogFileName(category)
      const logLine = this.formatLogEntry(entry)
      
      fs.appendFileSync(fileName, logLine)
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLogLevel
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level
  }

  private log(level: LogLevel, category: string, message: string, data?: any, context?: {
    requestId?: string
    userId?: string
    sessionId?: string
    stack?: string
  }): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      category,
      message,
      data,
      ...context
    }

    // Write to file
    this.writeToFile(category, entry)
    
    // Also log to console with color coding
    const colorCodes = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[35m', // Magenta
      TRACE: '\x1b[37m'  // White
    }
    
    const resetCode = '\x1b[0m'
    const color = colorCodes[entry.level as keyof typeof colorCodes] || colorCodes.INFO
    
    console.log(`${color}[${entry.timestamp}] [${entry.level}] [${entry.category}] ${entry.message}${resetCode}`)
    if (entry.data) console.log('  DATA:', entry.data)
    if (entry.stack) console.log('  STACK:', entry.stack)
  }

  // Convenience methods for different log levels
  error(category: string, message: string, error?: Error | any, context?: any): void {
    const stack = error?.stack || (error instanceof Error ? error.stack : undefined)
    this.log(LogLevel.ERROR, category, message, error?.message || error, { ...context, stack })
  }

  warn(category: string, message: string, data?: any, context?: any): void {
    this.log(LogLevel.WARN, category, message, data, context)
  }

  info(category: string, message: string, data?: any, context?: any): void {
    this.log(LogLevel.INFO, category, message, data, context)
  }

  debug(category: string, message: string, data?: any, context?: any): void {
    this.log(LogLevel.DEBUG, category, message, data, context)
  }

  trace(category: string, message: string, data?: any, context?: any): void {
    this.log(LogLevel.TRACE, category, message, data, context)
  }

  // Specialized logging methods for different components
  apiRequest(method: string, path: string, requestId: string, data?: any): void {
    this.info('api', `${method} ${path} - Request started`, data, { requestId })
  }

  apiResponse(method: string, path: string, status: number, duration: number, requestId: string): void {
    this.info('api', `${method} ${path} - Response ${status} (${duration}ms)`, null, { requestId })
  }

  apiError(method: string, path: string, error: Error, requestId: string): void {
    this.error('api', `${method} ${path} - Request failed`, error, { requestId })
  }

  chatMessage(role: string, message: string, sessionId: string, userId?: string): void {
    this.info('chat', `Message from ${role}`, { message: message.substring(0, 100) + '...' }, { sessionId, userId })
  }

  chatProcessing(step: string, data: any, sessionId: string): void {
    this.debug('chat', `Processing step: ${step}`, data, { sessionId })
  }

  providerNotification(providerId: string, patientRequest: any, requestId: string): void {
    this.info('providers', `Notification sent to provider ${providerId}`, {
      requestType: patientRequest.specialty,
      urgency: patientRequest.urgency,
      location: patientRequest.location
    }, { requestId })
  }

  providerMatch(query: string, matchCount: number, sessionId: string): void {
    this.info('providers', `Provider matching completed`, {
      query: query.substring(0, 50) + '...',
      matches: matchCount
    }, { sessionId })
  }

  databaseQuery(operation: string, collection: string, duration: number, requestId?: string): void {
    this.debug('database', `${operation} on ${collection} (${duration}ms)`, null, { requestId })
  }

  databaseError(operation: string, collection: string, error: Error, requestId?: string): void {
    this.error('database', `${operation} on ${collection} failed`, error, { requestId })
  }

  authAction(action: string, userId: string, success: boolean, sessionId?: string): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN
    this.log(level, 'auth', `${action} for user ${userId} - ${success ? 'Success' : 'Failed'}`, null, { userId, sessionId })
  }

  performanceMetric(metric: string, value: number, unit: string, context?: any): void {
    this.info('performance', `${metric}: ${value}${unit}`, null, context)
  }

  fileUpload(fileName: string, size: number, processingTime: number, success: boolean, sessionId: string): void {
    this.info('performance', `File upload: ${fileName}`, {
      sizeKB: Math.round(size / 1024),
      processingTimeMs: processingTime,
      success
    }, { sessionId })
  }

  // Method to get log statistics
  getLogStats(): { [category: string]: number } {
    const stats: { [category: string]: number } = {}
    
    try {
      const categories = fs.readdirSync(this.logDir)
      categories.forEach(category => {
        const categoryPath = path.join(this.logDir, category)
        if (fs.statSync(categoryPath).isDirectory()) {
          const files = fs.readdirSync(categoryPath)
          stats[category] = files.length
        }
      })
    } catch (error) {
      this.error('logger', 'Failed to get log statistics', error)
    }
    
    return stats
  }

  // Method to clean old log files (older than specified days)
  cleanOldLogs(daysToKeep: number = 30): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    try {
      const categories = fs.readdirSync(this.logDir)
      categories.forEach(category => {
        const categoryPath = path.join(this.logDir, category)
        if (fs.statSync(categoryPath).isDirectory()) {
          const files = fs.readdirSync(categoryPath)
          files.forEach(file => {
            const filePath = path.join(categoryPath, file)
            const fileStats = fs.statSync(filePath)
            
            if (fileStats.mtime < cutoffDate) {
              fs.unlinkSync(filePath)
              this.info('logger', `Deleted old log file: ${file}`)
            }
          })
        }
      })
    } catch (error) {
      this.error('logger', 'Failed to clean old logs', error)
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Export types
export type { LogEntry }