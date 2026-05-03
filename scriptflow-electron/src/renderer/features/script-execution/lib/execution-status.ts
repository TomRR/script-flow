import type { ExecutionStatus } from '../../../../renderer.d'

export interface ExecutionStatusStyles {
    container: string
    badge: string
    line: string
    bar: string
}

const STATUS_STYLES: Record<ExecutionStatus, ExecutionStatusStyles> = {
    idle: {
        container: '',
        badge: '',
        line: '',
        bar: 'bg-border/40',
    },
    running: {
        container: [
            'border-amber-400/40 ring-1 ring-amber-400/30',
            'relative overflow-hidden',
            "after:content-[''] after:absolute after:inset-0 after:rounded-md after:pointer-events-none",
            'after:bg-gradient-to-br after:from-emerald-400/35 after:via-emerald-400/15 after:to-amber-400/40',
            'after:[background-size:200%_200%] after:[background-position:0%_0%]',
            'after:animate-gradient-shift',
        ].join(' '),
        badge: [
            'border-amber-400/40 text-amber-700',
            'bg-gradient-to-br from-emerald-400/25 via-emerald-400/10 to-amber-400/30',
            '[background-size:200%_200%] [background-position:0%_0%]',
            'animate-gradient-shift',
        ].join(' '),
        line: 'bg-gradient-to-b from-emerald-400/80 to-amber-400/80',
        bar: [
            'bg-gradient-to-br from-emerald-400/80 via-emerald-400/50 to-amber-400/80',
            '[background-size:200%_200%] [background-position:0%_0%]',
            'animate-gradient-shift',
        ].join(' '),
    },
    success: {
        container: 'border-emerald-400/40 bg-emerald-500/5 ring-1 ring-emerald-400/30',
        badge: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700',
        line: 'bg-emerald-400/60',
        bar: 'bg-emerald-400/60',
    },
    failed: {
        container: 'border-red-400/40 bg-red-500/5 ring-1 ring-red-400/30',
        badge: 'border-red-400/40 bg-red-500/10 text-red-700',
        line: 'bg-red-400/60',
        bar: 'bg-red-400/60',
    },
    condition_failed: {
        container: 'border-yellow-400/50 bg-yellow-500/5 ring-1 ring-yellow-400/30',
        badge: 'border-yellow-400/50 bg-yellow-500/10 text-yellow-700',
        line: 'bg-yellow-400/60',
        bar: 'bg-yellow-400/60',
    },
}

export function getExecutionStatusStyles(status: ExecutionStatus): ExecutionStatusStyles {
    return STATUS_STYLES[status]
}
