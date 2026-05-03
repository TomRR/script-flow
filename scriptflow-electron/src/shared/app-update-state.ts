export type AppUpdateStatus =
    | 'unavailable'
    | 'idle'
    | 'checking'
    | 'available'
    | 'up-to-date'
    | 'downloading'
    | 'downloaded'
    | 'error'

export interface AppUpdateState {
    status: AppUpdateStatus
    currentVersion: string
    availableVersion?: string
    downloadProgressPercent?: number
    errorMessage?: string
    lastCheckedAt?: string
    canCheckForUpdates: boolean
    canDownloadUpdate: boolean
    canInstallUpdate: boolean
}

export interface AppUpdateActionResult {
    accepted: boolean
    state: AppUpdateState
}
