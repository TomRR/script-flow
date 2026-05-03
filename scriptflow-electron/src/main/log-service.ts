export type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug'

export interface LogEntry {
    timestamp: Date
    level: LogLevel
    source: 'main' | 'renderer'
    message: string
    args?: unknown[]
}

export class LogService {
    private static logs: LogEntry[] = []
    private static maxLogs = 10000

    private static originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
    }

    static init(): void {
        this.overrideConsole()
    }

    private static overrideConsole(): void {
        console.log = (...args: unknown[]) => {
            this.addLog('log', 'main', args)
            this.originalConsole.log(...args)
        }

        console.error = (...args: unknown[]) => {
            this.addLog('error', 'main', args)
            this.originalConsole.error(...args)
        }

        console.warn = (...args: unknown[]) => {
            this.addLog('warn', 'main', args)
            this.originalConsole.warn(...args)
        }

        console.info = (...args: unknown[]) => {
            this.addLog('info', 'main', args)
            this.originalConsole.info(...args)
        }

        console.debug = (...args: unknown[]) => {
            this.addLog('debug', 'main', args)
            this.originalConsole.debug(...args)
        }
    }

    private static addLog(level: LogLevel, source: 'main' | 'renderer', args: unknown[]): void {
        const message = args
            .map((arg) => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2)
                    } catch {
                        return String(arg)
                    }
                }
                return String(arg)
            })
            .join(' ')

        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            source,
            message,
            args,
        }

        this.logs.push(entry)

        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs)
        }
    }

    static addRendererLog(level: LogLevel, message: string, args?: unknown[]): void {
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            source: 'renderer',
            message,
            args,
        }

        this.logs.push(entry)

        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs)
        }
    }

    static getLogs(): LogEntry[] {
        return [...this.logs]
    }

    static clearLogs(): void {
        this.logs = []
    }

    static formatLogEntry(entry: LogEntry): string {
        const timestamp = entry.timestamp.toISOString().replace('T', ' ').substring(0, 23)
        const level = entry.level.toUpperCase().padEnd(5)
        const source = entry.source === 'main' ? '[MAIN]' : '[RENDERER]'
        return `${timestamp} ${level} ${source} ${entry.message}`
    }

    static getAllLogsAsString(): string {
        return this.logs.map((entry) => this.formatLogEntry(entry)).join('\n')
    }
}
