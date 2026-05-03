import { useState } from 'react'
import type { RatingData, GatewayConfig } from '../types'

interface FeedbackMetadata {
    appId: string
    version: string
    platform: RatingData['platform']
    architecture: string
    os: string
}

interface UseRatingServiceResult {
    submitRating: (score: number) => Promise<void>
    submitFeedback: (context: string) => Promise<void>
    isSubmitting: boolean
}

export function useRatingService(
    config: GatewayConfig | null,
    isFallback: boolean,
    metadata: FeedbackMetadata,
): UseRatingServiceResult {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [lastRatingScore, setLastRatingScore] = useState<number | null>(null)

    const submitRating = async (score: number): Promise<void> => {
        if (isFallback || !config) {
            setLastRatingScore(score)
            return
        }

        setIsSubmitting(true)
        setLastRatingScore(score)

        try {
            const ratingData: RatingData = {
                score,
                appId: metadata.appId,
                version: metadata.version,
                platform: metadata.platform,
                architecture: metadata.architecture,
                os: metadata.os,
            }

            await fetch(config.rating_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ratingData),
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const submitFeedback = async (context: string): Promise<void> => {
        if (isFallback || !config || lastRatingScore === null) {
            return
        }

        setIsSubmitting(true)

        try {
            const ratingData: RatingData = {
                score: lastRatingScore,
                appId: metadata.appId,
                version: metadata.version,
                platform: metadata.platform,
                architecture: metadata.architecture,
                os: metadata.os,
                context,
            }

            await fetch(config.rating_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ratingData),
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return {
        submitRating,
        submitFeedback,
        isSubmitting,
    }
}
