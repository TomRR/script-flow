import type { GatewayConfig } from '../types'

interface UseDocServiceResult {
    docsUrl: string | null
    sponsorUrl: string | null
}

export function useDocService(config: GatewayConfig | null, isFallback: boolean): UseDocServiceResult {
    if (isFallback || !config) {
        return {
            docsUrl: null,
            sponsorUrl: null,
        }
    }

    return {
        docsUrl: config.docs,
        sponsorUrl: config.sponsor,
    }
}
