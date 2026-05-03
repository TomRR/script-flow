import * as React from 'react'
import type { DiscoveryState } from './types'
import { FeedbackContext } from './FeedbackContext'
import { useDiscoveryService } from './services/use-discovery-service'
import { AppRuntimeInfoService } from './services/app-runtime-info-service'
import { useAppRuntimeInfoService } from './services/use-app-runtime-info-service'
import { RatingDialog } from './components/RatingDialog'
import { FALLBACK_EMAIL } from './config/constants'

interface FeedbackProviderProps {
    appId: string
    version: string
    children?: React.ReactNode
}

export function FeedbackProvider({ appId, version, children }: FeedbackProviderProps) {
    const { appInfo, isLoading: isAppInfoLoading } = useAppRuntimeInfoService(version)
    const { config, isLoading, isFallback } = useDiscoveryService(appId)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [currentRating, setCurrentRating] = React.useState<number | null>(null)
    const os = React.useMemo(() => AppRuntimeInfoService.toOs(appInfo.platform), [appInfo.platform])

    const discovery: DiscoveryState = {
        config,
        isLoading,
        isFallback,
        fallbackEmail: FALLBACK_EMAIL,
    }

    const contextValue = {
        appId,
        version: appInfo.version,
        platform: appInfo.platform,
        architecture: appInfo.architecture,
        os,
        isAppInfoLoading,
        discovery,
        isDialogOpen,
        setIsDialogOpen,
        currentRating,
        setCurrentRating,
    }

    const handleDialogClose = () => {
        setIsDialogOpen(false)
        setCurrentRating(null)
    }

    return (
        <FeedbackContext.Provider value={contextValue}>
            {children}
            <RatingDialog isOpen={isDialogOpen} onClose={handleDialogClose} rating={currentRating} />
        </FeedbackContext.Provider>
    )
}
