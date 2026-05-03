import { renderHook, waitFor } from '@testing-library/react'
import { useDiscoveryService } from './use-discovery-service'
import { GATEWAY_API_URL, FALLBACK_EMAIL } from '../config/constants'
import type { GatewayConfig } from '../types'

// Mock the constants module to use a shorter timeout for tests
jest.mock('../config/constants', () => ({
    GATEWAY_API_URL: 'https://api.scriptflow.com/v1/config/links',
    FALLBACK_EMAIL: 'jimmythe@schuh.com',
    API_TIMEOUT_MS: 100, // Short timeout for tests
}))

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('useDiscoveryService', () => {
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

    test('success case: API returns valid GatewayConfig', async () => {
        // Arrange
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockConfig,
        })

        // Act
        const { result } = renderHook(() => useDiscoveryService('scriptflow'))

        // Assert - initially loading
        expect(result.current.isLoading).toBe(true)
        expect(result.current.config).toBeNull()
        expect(result.current.isFallback).toBe(false)

        // Wait for the hook to update
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        // Assert - after successful fetch
        expect(result.current.config).toEqual(mockConfig)
        expect(result.current.isFallback).toBe(false)
        expect(result.current.fallbackEmail).toBe(FALLBACK_EMAIL)
        expect(mockFetch).toHaveBeenCalledWith(`${GATEWAY_API_URL}?appId=${encodeURIComponent('scriptflow')}`, {
            signal: expect.any(AbortSignal),
        })
    })

    test('failure case: API returns 500 error', async () => {
        // Arrange
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
        })

        // Act
        const { result } = renderHook(() => useDiscoveryService('scriptflow'))

        // Wait for the hook to update
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        // Assert - fallback mode
        expect(result.current.config).toBeNull()
        expect(result.current.isFallback).toBe(true)
        expect(result.current.fallbackEmail).toBe(FALLBACK_EMAIL)
    })

    test('timeout case: API takes too long (100ms timeout)', async () => {
        // Arrange - Mock fetch to check for abort signal and reject with AbortError
        mockFetch.mockImplementationOnce((url: string, options: { signal?: AbortSignal }) => {
            return new Promise((resolve, reject) => {
                // If signal is already aborted, reject immediately
                if (options.signal?.aborted) {
                    const error = new Error('The operation was aborted')
                    error.name = 'AbortError'
                    reject(error)
                    return
                }

                // Listen for abort event
                options.signal?.addEventListener('abort', () => {
                    const error = new Error('The operation was aborted')
                    error.name = 'AbortError'
                    reject(error)
                })

                // Never resolves - simulating a hanging request
            })
        })

        // Act
        const { result } = renderHook(() => useDiscoveryService('scriptflow'))

        // Wait for the hook to update (timeout should trigger abort)
        await waitFor(
            () => {
                expect(result.current.isLoading).toBe(false)
            },
            { timeout: 500 },
        )

        // Assert - fallback mode due to timeout
        expect(result.current.config).toBeNull()
        expect(result.current.isFallback).toBe(true)
        expect(result.current.fallbackEmail).toBe(FALLBACK_EMAIL)
    })

    test('network error case: fetch throws error', async () => {
        // Arrange
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        // Act
        const { result } = renderHook(() => useDiscoveryService('scriptflow'))

        // Wait for the hook to update
        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        // Assert - fallback mode
        expect(result.current.config).toBeNull()
        expect(result.current.isFallback).toBe(true)
        expect(result.current.fallbackEmail).toBe(FALLBACK_EMAIL)
    })

    test('encodes appId correctly in URL', async () => {
        // Arrange
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockConfig,
        })

        const appId = 'my app with spaces & special chars!'

        // Act
        const { result } = renderHook(() => useDiscoveryService(appId))

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        // Assert
        expect(mockFetch).toHaveBeenCalledWith(`${GATEWAY_API_URL}?appId=${encodeURIComponent(appId)}`, {
            signal: expect.any(AbortSignal),
        })
    })
})
