import { toast } from 'sonner'

export const TOASTER_CONFIG = {
    DURATION_ERROR: 4000,
    DURATION_WARNING: 4000,
    DURATION_SUCCESS: 3000,
    DELAY_SHOW: 100,
} as const

export class ToasterService {
    static showError(message: string): void {
        toast.error(message, {
            duration: TOASTER_CONFIG.DURATION_ERROR,
            style: {
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
            },
        })
    }

    static showWarning(message: string): void {
        toast.warning(message, {
            duration: TOASTER_CONFIG.DURATION_WARNING,
            style: {
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                color: '#d97706',
            },
        })
    }

    static showSuccess(message: string): void {
        toast.success(message, {
            duration: TOASTER_CONFIG.DURATION_SUCCESS,
            style: {
                background: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#16a34a',
            },
        })
    }
}
