import type { LogEntry } from '../../../../renderer.d'

class LogsServiceClass {
    private originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
    }

    private initialized = false

    init(): void {
        if (this.initialized) return
        this.initialized = true
        this.overrideConsole()
    }

    private overrideConsole(): void {
        console.log = (...args: unknown[]) => {
            this.sendLog('log', args)
            this.originalConsole.log(...args)
        }

        console.error = (...args: unknown[]) => {
            this.sendLog('error', args)
            this.originalConsole.error(...args)
        }

        console.warn = (...args: unknown[]) => {
            this.sendLog('warn', args)
            this.originalConsole.warn(...args)
        }

        console.info = (...args: unknown[]) => {
            this.sendLog('info', args)
            this.originalConsole.info(...args)
        }

        console.debug = (...args: unknown[]) => {
            this.sendLog('debug', args)
            this.originalConsole.debug(...args)
        }
    }

    private sendLog(level: string, args: unknown[]): void {
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

        try {
            window.api.logs.addFromRenderer(level as any, message)
        } catch (error) {
            this.originalConsole.error('Failed to send log to main process:', error)
        }
    }

    async getAllLogs(): Promise<LogEntry[]> {
        try {
            return await window.api.logs.getAll()
        } catch (error) {
            console.error('Failed to get logs:', error)
            return []
        }
    }

    async clearLogs(): Promise<void> {
        try {
            await window.api.logs.clear()
        } catch (error) {
            console.error('Failed to clear logs:', error)
        }
    }
}

export const LogsService = new LogsServiceClass()
