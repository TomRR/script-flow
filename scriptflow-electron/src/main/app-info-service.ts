import { app } from 'electron'
import type { AppPlatform, AppRuntimeInfo } from '../shared/app-runtime-info'

interface AppInfoServiceOptions {
    getVersion?: () => string
    platform?: string
    architecture?: string
}

export class AppInfoService {
    private readonly getVersionValue: () => string
    private readonly platformValue: string
    private readonly architectureValue: string

    constructor(options: AppInfoServiceOptions = {}) {
        this.getVersionValue = options.getVersion ?? (() => app.getVersion())
        this.platformValue = options.platform ?? process.platform
        this.architectureValue = options.architecture ?? process.arch
    }

    static normalizePlatform(platform: string): AppPlatform {
        switch (platform) {
            case 'darwin':
                return 'mac'
            case 'win32':
                return 'windows'
            case 'linux':
                return 'linux'
            default:
                return 'unknown'
        }
    }

    getInfo(): AppRuntimeInfo {
        return {
            platform: AppInfoService.normalizePlatform(this.platformValue),
            architecture: this.architectureValue,
            version: this.getVersionValue(),
        }
    }
}
