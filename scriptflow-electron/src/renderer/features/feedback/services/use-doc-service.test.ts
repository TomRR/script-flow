import { renderHook } from '@testing-library/react'
import { useDocService } from './use-doc-service'
import type { GatewayConfig } from '../types'

describe('useDocService', () => {
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

    test('normal mode: returns docsUrl and sponsorUrl', () => {
        // Arrange
        const isFallback = false

        // Act
        const { result } = renderHook(() => useDocService(mockConfig, isFallback))

        // Assert
        expect(result.current.docsUrl).toBe(mockConfig.docs)
        expect(result.current.sponsorUrl).toBe(mockConfig.sponsor)
    })

    test('fallback mode: returns null for both URLs', () => {
        // Arrange
        const isFallback = true

        // Act
        const { result } = renderHook(() => useDocService(mockConfig, isFallback))

        // Assert
        expect(result.current.docsUrl).toBeNull()
        expect(result.current.sponsorUrl).toBeNull()
    })

    test('fallback mode when config is null', () => {
        // Arrange
        const isFallback = false

        // Act
        const { result } = renderHook(() => useDocService(null, isFallback))

        // Assert
        expect(result.current.docsUrl).toBeNull()
        expect(result.current.sponsorUrl).toBeNull()
    })

    test('fallback mode takes precedence over config', () => {
        // Arrange - even with valid config, fallback=true should return null
        const isFallback = true

        // Act
        const { result } = renderHook(() => useDocService(mockConfig, isFallback))

        // Assert
        expect(result.current.docsUrl).toBeNull()
        expect(result.current.sponsorUrl).toBeNull()
    })
})
