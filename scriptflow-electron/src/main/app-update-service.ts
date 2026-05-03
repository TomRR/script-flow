import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { AppUpdateActionResult, AppUpdateState, AppUpdateStatus } from '../shared/app-update-state'

interface UpdateInfoLike {
    version: string
}

interface DownloadProgressLike {
    percent: number
}

export interface AutoUpdaterLike {
    autoDownload: boolean
    autoInstallOnAppQuit: boolean
    on(event: 'checking-for-update', listener: () => void): this
    on(event: 'update-available', listener: (info: UpdateInfoLike) => void): this
    on(event: 'update-not-available', listener: () => void): this
    on(event: 'download-progress', listener: (progress: DownloadProgressLike) => void): this
    on(event: 'update-downloaded', listener: (info: UpdateInfoLike) => void): this
    on(event: 'error', listener: (error: unknown) => void): this
    checkForUpdates(): Promise<unknown>
    downloadUpdate(): Promise<unknown>
    quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
}

export interface AppUpdateServiceOptions {
    currentVersion?: string
    isPackaged?: boolean
    resourcesPath?: string
    autoUpdater?: AutoUpdaterLike
    onStateChange?: (state: AppUpdateState) => void
}

export class AppUpdateService {
    private readonly currentVersion: string
    private readonly isPackaged: boolean
    private readonly resourcesPath: string
    private readonly updater: AutoUpdaterLike
    private readonly onStateChange?: (state: AppUpdateState) => void
    private state: AppUpdateState
    private isConfigured = false
    private hasRegisteredListeners = false

    constructor(options: AppUpdateServiceOptions = {}) {
        this.currentVersion = options.currentVersion ?? app.getVersion()
        this.isPackaged = options.isPackaged ?? app.isPackaged
        this.resourcesPath = options.resourcesPath ?? process.resourcesPath
        this.updater = options.autoUpdater ?? autoUpdater
        this.onStateChange = options.onStateChange
        this.state = this.createState('unavailable', {
            errorMessage: 'Auto-update feed is not configured.',
        })
    }

    public configure(): AppUpdateState {
        if (!this.isPackaged || !this.hasUpdateConfig()) {
            this.setState(
                this.createState('unavailable', {
                    errorMessage: 'Auto-update feed is not configured.',
                }),
            )
            return this.state
        }

        if (!this.hasRegisteredListeners) {
            this.registerUpdaterListeners()
            this.hasRegisteredListeners = true
        }

        this.updater.autoDownload = false
        this.updater.autoInstallOnAppQuit = false
        this.isConfigured = true
        this.setState(
            this.createState('idle', {
                errorMessage: undefined,
            }),
        )
        return this.state
    }

    public getState(): AppUpdateState {
        return this.state
    }

    public async checkForUpdates(): Promise<AppUpdateActionResult> {
        if (!this.isConfigured || !this.state.canCheckForUpdates) {
            return {
                accepted: false,
                state: this.state,
            }
        }

        this.setState(
            this.createState('checking', {
                availableVersion: undefined,
                downloadProgressPercent: undefined,
                errorMessage: undefined,
            }),
        )

        try {
            await this.updater.checkForUpdates()
            return {
                accepted: true,
                state: this.state,
            }
        } catch (error) {
            this.setState(
                this.createState('error', {
                    errorMessage: AppUpdateService.formatError(error),
                }),
            )
            return {
                accepted: true,
                state: this.state,
            }
        }
    }

    public async downloadUpdate(): Promise<AppUpdateActionResult> {
        if (!this.isConfigured || this.state.status !== 'available') {
            return {
                accepted: false,
                state: this.state,
            }
        }

        this.setState(
            this.createState('downloading', {
                availableVersion: this.state.availableVersion,
                downloadProgressPercent: 0,
                errorMessage: undefined,
            }),
        )

        try {
            await this.updater.downloadUpdate()
            return {
                accepted: true,
                state: this.state,
            }
        } catch (error) {
            this.setState(
                this.createState('error', {
                    availableVersion: this.state.availableVersion,
                    errorMessage: AppUpdateService.formatError(error),
                }),
            )
            return {
                accepted: true,
                state: this.state,
            }
        }
    }

    public installUpdate(): AppUpdateActionResult {
        if (!this.isConfigured || this.state.status !== 'downloaded') {
            return {
                accepted: false,
                state: this.state,
            }
        }

        try {
            this.updater.quitAndInstall(true, true)
            return {
                accepted: true,
                state: this.state,
            }
        } catch (error) {
            this.setState(
                this.createState('error', {
                    availableVersion: this.state.availableVersion,
                    errorMessage: AppUpdateService.formatError(error),
                }),
            )
            return {
                accepted: true,
                state: this.state,
            }
        }
    }

    private hasUpdateConfig(): boolean {
        return fs.existsSync(path.join(this.resourcesPath, 'app-update.yml'))
    }

    private registerUpdaterListeners(): void {
        this.updater.on('checking-for-update', () => {
            this.setState(
                this.createState('checking', {
                    availableVersion: undefined,
                    downloadProgressPercent: undefined,
                    errorMessage: undefined,
                }),
            )
        })

        this.updater.on('update-available', (info) => {
            this.setState(
                this.createState('available', {
                    availableVersion: info.version,
                    downloadProgressPercent: undefined,
                    errorMessage: undefined,
                    lastCheckedAt: new Date().toISOString(),
                }),
            )
        })

        this.updater.on('update-not-available', () => {
            this.setState(
                this.createState('up-to-date', {
                    availableVersion: undefined,
                    downloadProgressPercent: undefined,
                    errorMessage: undefined,
                    lastCheckedAt: new Date().toISOString(),
                }),
            )
        })

        this.updater.on('download-progress', (progress) => {
            this.setState(
                this.createState('downloading', {
                    availableVersion: this.state.availableVersion,
                    downloadProgressPercent: Math.max(0, Math.min(100, Math.round(progress.percent))),
                    errorMessage: undefined,
                    lastCheckedAt: this.state.lastCheckedAt,
                }),
            )
        })

        this.updater.on('update-downloaded', (info) => {
            this.setState(
                this.createState('downloaded', {
                    availableVersion: info.version,
                    downloadProgressPercent: 100,
                    errorMessage: undefined,
                    lastCheckedAt: this.state.lastCheckedAt,
                }),
            )
        })

        this.updater.on('error', (error) => {
            this.setState(
                this.createState('error', {
                    availableVersion: this.state.availableVersion,
                    downloadProgressPercent: undefined,
                    errorMessage: AppUpdateService.formatError(error),
                    lastCheckedAt: this.state.lastCheckedAt,
                }),
            )
        })
    }

    private createState(status: AppUpdateStatus, overrides: Partial<AppUpdateState> = {}): AppUpdateState {
        const nextState: AppUpdateState = {
            status,
            currentVersion: this.currentVersion,
            canCheckForUpdates: false,
            canDownloadUpdate: false,
            canInstallUpdate: false,
            ...overrides,
        }

        nextState.canCheckForUpdates = this.isConfigured && status !== 'checking' && status !== 'downloading'
        nextState.canDownloadUpdate = this.isConfigured && status === 'available'
        nextState.canInstallUpdate = this.isConfigured && status === 'downloaded'

        return nextState
    }

    private setState(nextState: AppUpdateState): void {
        this.state = nextState
        this.onStateChange?.(nextState)
    }

    private static formatError(error: unknown): string {
        if (error instanceof Error) {
            return error.message
        }

        return String(error)
    }
}
