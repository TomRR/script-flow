import { BUG_REPORT_URL, FEATURE_REQUEST_URL } from '../config/constants'
import type { GatewayConfig } from '../types'

interface UseIssueServiceResult {
    bugUrl: string
    featureUrl: string
}

export function useIssueService(_config: GatewayConfig | null, _isFallback: boolean): UseIssueServiceResult {
    return {
        bugUrl: BUG_REPORT_URL,
        featureUrl: FEATURE_REQUEST_URL,
    }
}
