export type AppPlatform = 'mac' | 'windows' | 'linux' | 'unknown'

export interface AppRuntimeInfo {
    platform: AppPlatform
    architecture: string
    version: string
}
