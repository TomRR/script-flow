import { useEffect, useState } from 'react'
import type { DiscoveryState, GatewayConfig } from '../types'
import { GATEWAY_API_URL, API_TIMEOUT_MS, FALLBACK_EMAIL } from '../config/constants'

interface UseDiscoveryServiceResult {
    config: GatewayConfig | null
    isLoading: boolean
    isFallback: boolean
    fallbackEmail: string
}

export function useDiscoveryService(appId: string): UseDiscoveryServiceResult {
    const [state, setState] = useState<DiscoveryState>({
        config: null,
        isLoading: true,
        isFallback: false,
        fallbackEmail: FALLBACK_EMAIL,
    })

    useEffect(() => {
        const fetchConfig = async () => {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

            try {
                const response = await fetch(`${GATEWAY_API_URL}?appId=${encodeURIComponent(appId)}`, {
                    signal: controller.signal,
                })

                clearTimeout(timeoutId)

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const config: GatewayConfig = await response.json()

                setState({
                    config,
                    isLoading: false,
                    isFallback: false,
                    fallbackEmail: FALLBACK_EMAIL,
                })
            } catch {
                clearTimeout(timeoutId)
                setState({
                    config: null,
                    isLoading: false,
                    isFallback: true,
                    fallbackEmail: FALLBACK_EMAIL,
                })
            }
        }

        fetchConfig()
    }, [appId])

    return {
        config: state.config,
        isLoading: state.isLoading,
        isFallback: state.isFallback,
        fallbackEmail: state.fallbackEmail,
    }
}
