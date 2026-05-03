import type { AppPlatform } from '../../../shared/app-runtime-info'

export interface GatewayConfig {
    docs: string
    bug_report: string
    feature_request: string
    sponsor: string
    rating_endpoint: string
}

export interface DiscoveryState {
    config: GatewayConfig | null
    isLoading: boolean
    isFallback: boolean
    fallbackEmail: string
}

export interface RatingData {
    score: number
    appId: string
    version: string
    platform: AppPlatform
    architecture: string
    os: string
    context?: string
}

export interface FeedbackContextType {
    appId: string
    version: string
    platform: AppPlatform
    architecture: string
    os: string
    isAppInfoLoading: boolean
    discovery: DiscoveryState
    isDialogOpen: boolean
    setIsDialogOpen: (open: boolean) => void
    currentRating: number | null
    setCurrentRating: (rating: number | null) => void
}
