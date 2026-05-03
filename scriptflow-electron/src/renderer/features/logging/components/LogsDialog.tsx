import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Trash2, Terminal } from 'lucide-react'
import { LogsService } from '../services/logs-service'
import type { LogEntry } from '../../../../renderer.d'

interface LogsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function LogsDialog({ open, onOpenChange }: LogsDialogProps) {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [copied, setCopied] = useState(false)
    const logsEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (open) {
            loadLogs()
        }
    }, [open])

    useEffect(() => {
        scrollToBottom()
    }, [logs])

    const loadLogs = async () => {
        try {
            const logEntries = await LogsService.getAllLogs()
            setLogs(logEntries)
        } catch (error) {
            console.error('Failed to load logs:', error)
        }
    }

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleCopy = async () => {
        const text = logs.map((log) => formatLogEntry(log)).join('\n')
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleClear = async () => {
        await LogsService.clearLogs()
        setLogs([])
    }

    const formatLogEntry = (entry: LogEntry): string => {
        const timestamp = new Date(entry.timestamp).toISOString().replace('T', ' ').substring(0, 23)
        const level = entry.level.toUpperCase().padEnd(5)
        const source = entry.source === 'main' ? '[MAIN]' : '[RENDERER]'
        return `${timestamp} ${level} ${source} ${entry.message}`
    }

    const getLevelColor = (level: string): string => {
        switch (level) {
            case 'error':
                return 'text-red-400'
            case 'warn':
                return 'text-yellow-400'
            case 'info':
                return 'text-blue-400'
            case 'debug':
                return 'text-gray-400'
            default:
                return 'text-green-400'
        }
    }

    const getSourceBadge = (source: string): string => {
        switch (source) {
            case 'main':
                return 'bg-purple-900/50 text-purple-300'
            default:
                return 'bg-blue-900/50 text-blue-300'
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Terminal className="h-5 w-5" />
                        Application Logs
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <div className="text-sm text-muted-foreground">{logs.length} log entries</div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={handleClear} title="Clear logs">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy all logs">
                                {copied ? (
                                    <span className="text-green-400 text-sm">Copied!</span>
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-950 rounded-lg overflow-auto font-mono text-xs p-4 border">
                        {logs.length === 0 ? (
                            <div className="text-center text-slate-500 py-8">No logs captured yet</div>
                        ) : (
                            <div className="space-y-1">
                                {logs.map((log, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-2 hover:bg-slate-900/50 rounded px-1 py-0.5"
                                    >
                                        <span className="text-slate-500 shrink-0">
                                            {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 23)}
                                        </span>
                                        <span className={`w-14 shrink-0 font-semibold ${getLevelColor(log.level)}`}>
                                            {log.level.toUpperCase()}
                                        </span>
                                        <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded ${getSourceBadge(log.source)}`}
                                        >
                                            {log.source === 'main' ? 'MAIN' : 'RENDERER'}
                                        </span>
                                        <span className="text-slate-200 whitespace-pre-wrap break-all">
                                            {log.message}
                                        </span>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
