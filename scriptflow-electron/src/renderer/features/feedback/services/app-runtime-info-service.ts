import type { AppPlatform, AppRuntimeInfo } from '../../../../shared/app-runtime-info'

const UNKNOWN_ARCHITECTURE = 'unknown'

export class AppRuntimeInfoService {
    static createFallbackInfo(version: string): AppRuntimeInfo {
        return {
            platform: 'unknown',
            architecture: UNKNOWN_ARCHITECTURE,
            version,
        }
    }

    static async getInfo(fallbackVersion: string): Promise<AppRuntimeInfo> {
        try {
            const runtimeWindow = window as unknown as Window & {
                api: {
                    app: {
                        getInfo(): Promise<AppRuntimeInfo>
                    }
                }
            }
            const info = await runtimeWindow.api.app.getInfo()

            return {
                platform: info.platform ?? 'unknown',
                architecture: info.architecture || UNKNOWN_ARCHITECTURE,
                version: info.version || fallbackVersion,
            }
        } catch {
            return this.createFallbackInfo(fallbackVersion)
        }
    }

    static toOs(platform: AppPlatform): string {
        return platform
    }
}
