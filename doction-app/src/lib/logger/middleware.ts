import { NextRequest, NextResponse } from 'next/server'
import { logger } from './Logger'

export interface RequestContext {
  requestId: string
  startTime: number
  method: string
  path: string
  userAgent?: string
  ip?: string
  userId?: string
}

// Generate unique request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Request logging middleware
export function withRequestLogging(handler: Function) {
  return async (req: NextRequest, context?: any) => {
    const requestId = generateRequestId()
    const startTime = Date.now()
    const method = req.method
    const path = req.nextUrl.pathname
    const userAgent = req.headers.get('user-agent') || undefined
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    // Extract user ID from headers/auth if available
    const userId = req.headers.get('x-user-id') || undefined

    const requestContext: RequestContext = {
      requestId,
      startTime,
      method,
      path,
      userAgent,
      ip,
      userId
    }

    // Log incoming request
    logger.apiRequest(method, path, requestId, {
      userAgent,
      ip,
      query: Object.fromEntries(req.nextUrl.searchParams.entries())
    })

    try {
      // Add request context to request object for use in handlers
      (req as any).context = requestContext

      // Execute the original handler
      const response = await handler(req, context)
      
      // Log successful response
      const duration = Date.now() - startTime
      const status = response.status || 200
      logger.apiResponse(method, path, status, duration, requestId)

      // Add request ID to response headers for tracking
      response.headers.set('x-request-id', requestId)

      return response

    } catch (error) {
      // Log error response
      const duration = Date.now() - startTime
      logger.apiError(method, path, error as Error, requestId)
      
      // Re-throw the error to be handled by Next.js
      throw error
    }
  }
}

// Helper to get request context from Next.js request object
export function getRequestContext(req: NextRequest): RequestContext | null {
  return (req as any).context || null
}

// Performance logging decorator for functions
export function withPerformanceLogging<T extends (...args: any[]) => any>(
  fn: T,
  operation: string,
  category: string = 'performance'
): T {
  return ((...args: Parameters<T>) => {
    const startTime = Date.now()
    const result = fn(...args)

    // Handle both sync and async functions
    if (result instanceof Promise) {
      return result.then((value) => {
        const duration = Date.now() - startTime
        logger.performanceMetric(`${operation} (async)`, duration, 'ms', { category })
        return value
      }).catch((error) => {
        const duration = Date.now() - startTime
        logger.error(category, `${operation} failed after ${duration}ms`, error)
        throw error
      })
    } else {
      const duration = Date.now() - startTime
      logger.performanceMetric(operation, duration, 'ms', { category })
      return result
    }
  }) as T
}

// Database operation logging wrapper
export function withDatabaseLogging<T extends (...args: any[]) => any>(
  fn: T,
  operation: string,
  collection: string
): T {
  return ((...args: Parameters<T>) => {
    const startTime = Date.now()
    const result = fn(...args)

    if (result instanceof Promise) {
      return result.then((value) => {
        const duration = Date.now() - startTime
        logger.databaseQuery(operation, collection, duration)
        return value
      }).catch((error) => {
        logger.databaseError(operation, collection, error)
        throw error
      })
    } else {
      const duration = Date.now() - startTime
      logger.databaseQuery(operation, collection, duration)
      return result
    }
  }) as T
}

// Error boundary logging
export function logUnhandledError(error: Error, context?: any): void {
  logger.error('system', 'Unhandled error occurred', error, context)
}

// Process monitoring
export function logProcessMetrics(): void {
  if (typeof process !== 'undefined') {
    const memUsage = process.memoryUsage()
    logger.performanceMetric('memory-rss', Math.round(memUsage.rss / 1024 / 1024), 'MB')
    logger.performanceMetric('memory-heap-used', Math.round(memUsage.heapUsed / 1024 / 1024), 'MB')
    logger.performanceMetric('memory-heap-total', Math.round(memUsage.heapTotal / 1024 / 1024), 'MB')
  }
}

// Set up periodic process monitoring
let processMonitoringInterval: NodeJS.Timeout | null = null

export function startProcessMonitoring(intervalMs: number = 60000): void {
  if (processMonitoringInterval) {
    clearInterval(processMonitoringInterval)
  }
  
  processMonitoringInterval = setInterval(logProcessMetrics, intervalMs)
  logger.info('system', `Process monitoring started with ${intervalMs}ms interval`)
}

export function stopProcessMonitoring(): void {
  if (processMonitoringInterval) {
    clearInterval(processMonitoringInterval)
    processMonitoringInterval = null
    logger.info('system', 'Process monitoring stopped')
  }
}