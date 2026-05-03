import { renderHook } from '@testing-library/react'
import { useIssueService } from './use-issue-service'
import { BUG_REPORT_URL, FEATURE_REQUEST_URL } from '../config/constants'
import type { GatewayConfig } from '../types'

describe('useIssueService', () => {
    const mockConfig: GatewayConfig = {
        docs: 'https://docs.example.com',
        bug_report: 'https://github.com/example/issues',
        feature_request: 'https://github.com/example/discussions',
        sponsor: 'https://github.com/sponsors/example',
        rating_endpoint: 'https://api.example.com/rating',
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('normal mode: returns fixed Tally URLs', () => {
        // Arrange
        const isFallback = false

        // Act
        const { result } = renderHook(() => useIssueService(mockConfig, isFallback))

        // Assert
        expect(result.current.bugUrl).toBe(BUG_REPORT_URL)
        expect(result.current.featureUrl).toBe(FEATURE_REQUEST_URL)
    })

    test('fallback mode: still returns fixed Tally URLs', () => {
        // Arrange
        const isFallback = true

        // Act
        const { result } = renderHook(() => useIssueService(mockConfig, isFallback))

        // Assert
        expect(result.current.bugUrl).toBe(BUG_REPORT_URL)
        expect(result.current.featureUrl).toBe(FEATURE_REQUEST_URL)
    })

    test('returns fixed Tally URLs when config is null', () => {
        // Arrange
        const isFallback = false

        // Act
        const { result } = renderHook(() => useIssueService(null, isFallback))

        // Assert
        expect(result.current.bugUrl).toBe(BUG_REPORT_URL)
        expect(result.current.featureUrl).toBe(FEATURE_REQUEST_URL)
    })

    test('gateway-provided issue URLs are ignored', () => {
        // Arrange
        const isFallback = false

        // Act
        const { result } = renderHook(() => useIssueService(mockConfig, isFallback))

        // Assert
        expect(result.current.bugUrl).not.toBe(mockConfig.bug_report)
        expect(result.current.featureUrl).not.toBe(mockConfig.feature_request)
        expect(result.current.bugUrl).toBe(BUG_REPORT_URL)
        expect(result.current.featureUrl).toBe(FEATURE_REQUEST_URL)
    })
})
