import { renderHook, act, waitFor } from '@testing-library/react'
import { useRatingService } from './use-rating-service'
import type { GatewayConfig, RatingData } from '../types'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('useRatingService', () => {
    const mockConfig: GatewayConfig = {
        docs: 'https://docs.example.com',
        bug_report: 'https://github.com/example/issues',
        feature_request: 'https://github.com/example/discussions',
        sponsor: 'https://github.com/sponsors/example',
        rating_endpoint: 'https://api.example.com/rating',
    }

    const appId = 'scriptflow'
    const version = '1.0.0'
    const platform = 'mac' as const
    const architecture = 'arm64'
    const os = 'mac'
    const metadata = {
        appId,
        version,
        platform,
        architecture,
        os,
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockFetch.mockResolvedValue({ ok: true })
    })

    test('normal mode: submitRating POSTs to rating_endpoint', async () => {
        // Arrange
        const isFallback = false
        const score = 5

        const { result } = renderHook(() => useRatingService(mockConfig, isFallback, metadata))

        // Act
        await act(async () => {
            await result.current.submitRating(score)
        })

        // Assert
        expect(mockFetch).toHaveBeenCalledWith(mockConfig.rating_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                score,
                appId,
                version,
                platform,
                architecture,
                os,
            } as RatingData),
        })
    })

    test('normal mode: submitFeedback POSTs with context', async () => {
        // Arrange
        const isFallback = false
        const score = 4
        const context = 'Great app, but could use more features'

        const { result } = renderHook(() => useRatingService(mockConfig, isFallback, metadata))

        // First submit a rating
        await act(async () => {
            await result.current.submitRating(score)
        })

        // Act - submit feedback
        await act(async () => {
            await result.current.submitFeedback(context)
        })

        // Assert
        expect(mockFetch).toHaveBeenLastCalledWith(mockConfig.rating_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                score,
                appId,
                version,
                platform,
                architecture,
                os,
                context,
            } as RatingData),
        })
    })

    test('fallback mode: submitRating does nothing', async () => {
        // Arrange
        const isFallback = true
        const score = 3

        const { result } = renderHook(() => useRatingService(mockConfig, isFallback, metadata))

        // Act
        await act(async () => {
            await result.current.submitRating(score)
        })

        // Assert
        expect(mockFetch).not.toHaveBeenCalled()
    })

    test('fallback mode: submitFeedback does nothing', async () => {
        // Arrange
        const isFallback = true
        const context = 'Some feedback'

        const { result } = renderHook(() => useRatingService(mockConfig, isFallback, metadata))

        // Act
        await act(async () => {
            await result.current.submitFeedback(context)
        })

        // Assert
        expect(mockFetch).not.toHaveBeenCalled()
    })

    test('isSubmitting state changes during submitRating', async () => {
        // Arrange
        const isFallback = false
        const score = 5

        // Create a delayed promise to check state during submission
        let resolveFetch: (value: { ok: boolean }) => void
        mockFetch.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve
                }),
        )

        const { result } = renderHook(() => useRatingService(mockConfig, isFallback, metadata))

        // Act - start submission but don't await yet
        act(() => {
            result.current.submitRating(score)
        })

        // Assert - isSubmitting should be true during submission
        expect(result.current.isSubmitting).toBe(true)

        // Resolve the fetch
        act(() => {
            resolveFetch!({ ok: true })
        })

        // Wait for submission to complete
        await waitFor(() => {
            expect(result.current.isSubmitting).toBe(false)
        })
    })

    test('isSubmitting state changes during submitFeedback', async () => {
        // Arrange
        const isFallback = false
        const score = 4
        const context = 'Feedback text'

        // First submit rating normally
        const { result } = renderHook(() => useRatingService(mockConfig, isFallback, metadata))

        await act(async () => {
            await result.current.submitRating(score)
        })

        // Create a delayed promise for feedback
        let resolveFetch: (value: { ok: boolean }) => void
        mockFetch.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve
                }),
        )

        // Act - start feedback submission
        act(() => {
            result.current.submitFeedback(context)
        })

        // Assert - isSubmitting should be true during submission
        expect(result.current.isSubmitting).toBe(true)

        // Resolve the fetch
        act(() => {
            resolveFetch!({ ok: true })
        })

        // Wait for submission to complete
        await waitFor(() => {
            expect(result.current.isSubmitting).toBe(false)
        })
    })

    test('submitFeedback does nothing if no rating was submitted first', async () => {
        // Arrange
        const isFallback = false
        const context = 'Feedback without rating'

        const { result } = renderHook(() => useRatingService(mockConfig, isFallback, metadata))

        // Act - submit feedback without submitting rating first
        await act(async () => {
            await result.current.submitFeedback(context)
        })

        // Assert - fetch should not be called
        expect(mockFetch).not.toHaveBeenCalled()
    })

    test('submitFeedback does nothing when config is null', async () => {
        // Arrange
        const isFallback = false
        const score = 5
        const context = 'Some feedback'

        // First submit rating with config
        const { result } = renderHook(() => useRatingService(mockConfig, isFallback, metadata))

        await act(async () => {
            await result.current.submitRating(score)
        })

        // Now render with null config
        const { result: resultNull } = renderHook(() => useRatingService(null, isFallback, metadata))

        // Act - try to submit feedback with null config
        await act(async () => {
            await resultNull.current.submitFeedback(context)
        })

        // Assert - fetch should not be called for the feedback submission
        expect(mockFetch).toHaveBeenCalledTimes(1) // Only the rating call
    })

    test('handles fetch error gracefully', async () => {
        // Arrange
        const isFallback = false
        const score = 5

        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const { result } = renderHook(() => useRatingService(mockConfig, isFallback, metadata))

        // Act - error should propagate
        let error: Error | null = null
        await act(async () => {
            try {
                await result.current.submitRating(score)
            } catch (e) {
                error = e as Error
            }
        })

        // Assert - error should have been thrown and isSubmitting should be false
        expect(error).not.toBeNull()
        expect((error as unknown as Error).message).toBe('Network error')
        expect(result.current.isSubmitting).toBe(false)
    })
})
