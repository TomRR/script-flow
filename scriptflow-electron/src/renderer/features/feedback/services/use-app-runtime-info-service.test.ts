import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { useAppRuntimeInfoService } from './use-app-runtime-info-service'

describe('useAppRuntimeInfoService', () => {
    const mockGetInfo = jest.fn<() => Promise<{ platform: string; architecture: string; version: string }>>()

    beforeEach(() => {
        jest.clearAllMocks()
        ;(window as any).api = {
            app: {
                getInfo: mockGetInfo,
            },
        }
    })

    test('loads app info once and keeps the runtime metadata', async () => {
        mockGetInfo.mockResolvedValue({
            platform: 'mac',
            architecture: 'arm64',
            version: '1.2.3',
        })

        const { result, rerender } = renderHook(() => useAppRuntimeInfoService('0.0.0'))

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        rerender()

        expect(mockGetInfo).toHaveBeenCalledTimes(1)
        expect(result.current.appInfo).toEqual({
            platform: 'mac',
            architecture: 'arm64',
            version: '1.2.3',
        })
    })

    test('falls back when runtime info cannot be loaded', async () => {
        mockGetInfo.mockRejectedValue(new Error('unavailable'))

        const { result } = renderHook(() => useAppRuntimeInfoService('0.0.0'))

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.appInfo).toEqual({
            platform: 'unknown',
            architecture: 'unknown',
            version: '0.0.0',
        })
    })
})
