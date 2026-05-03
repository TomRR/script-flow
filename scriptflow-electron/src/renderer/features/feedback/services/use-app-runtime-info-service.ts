import { useEffect, useState } from 'react'
import type { AppRuntimeInfo } from '../../../../shared/app-runtime-info'
import { AppRuntimeInfoService } from './app-runtime-info-service'

interface UseAppRuntimeInfoServiceResult {
    appInfo: AppRuntimeInfo
    isLoading: boolean
}

export function useAppRuntimeInfoService(fallbackVersion: string): UseAppRuntimeInfoServiceResult {
    const [appInfo, setAppInfo] = useState<AppRuntimeInfo>(() =>
        AppRuntimeInfoService.createFallbackInfo(fallbackVersion),
    )
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        setIsLoading(true)

        const loadAppInfo = async () => {
            const info = await AppRuntimeInfoService.getInfo(fallbackVersion)

            if (!isMounted) {
                return
            }

            setAppInfo(info)
            setIsLoading(false)
        }

        loadAppInfo()

        return () => {
            isMounted = false
        }
    }, [fallbackVersion])

    return {
        appInfo,
        isLoading,
    }
}
