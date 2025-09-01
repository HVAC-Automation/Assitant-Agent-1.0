/**
 * Production logging utility
 * Sends logs to console in development, and can be extended with external services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  url?: string
  userAgent?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private logs: LogEntry[] = []
  private maxLogs = 100

  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    }
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Always log to console
    const consoleMethod = entry.level === 'debug' ? 'log' : entry.level
    if (entry.data) {
      console[consoleMethod](`[${entry.level.toUpperCase()}] ${entry.message}`, entry.data)
    } else {
      console[consoleMethod](`[${entry.level.toUpperCase()}] ${entry.message}`)
    }

    // In production, could send to external logging service here
    if (!this.isDevelopment && entry.level === 'error') {
      this.sendToExternalService(entry)
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    // Future: Send to Sentry, LogRocket, or other service
    // For now, we could send to our own API endpoint
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch (e) {
      // Silently fail - don't want logging to break the app
    }
  }

  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      this.addLog(this.createLogEntry('debug', message, data))
    }
  }

  info(message: string, data?: any) {
    this.addLog(this.createLogEntry('info', message, data))
  }

  warn(message: string, data?: any) {
    this.addLog(this.createLogEntry('warn', message, data))
  }

  error(message: string, data?: any) {
    this.addLog(this.createLogEntry('error', message, data))
  }

  // Voice-specific logging methods
  voiceStart(message: string, data?: any) {
    this.info(`🎤 VOICE: ${message}`, data)
  }

  voiceEnd(message: string, data?: any) {
    this.info(`🎤 VOICE END: ${message}`, data)
  }

  voiceError(message: string, data?: any) {
    this.error(`🎤 VOICE ERROR: ${message}`, data)
  }

  // Get recent logs for debugging
  getRecentLogs(count = 20): LogEntry[] {
    return this.logs.slice(-count)
  }

  // Export logs for support
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

export const logger = new Logger()
export type { LogLevel, LogEntry }