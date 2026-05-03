import { beforeEach, describe, expect, jest, test } from '@jest/globals'

interface ExposedApi {
    app: {
        getInfo(): Promise<unknown>
        updates: {
            getState(): Promise<unknown>
            checkForUpdates(): Promise<unknown>
            downloadUpdate(): Promise<unknown>
            installUpdate(): Promise<unknown>
            onStateChange(callback: (state: unknown) => void): () => void
        }
    }
    external: {
        open(url: string): Promise<unknown>
    }
}

type UpdateStateListener = (_event: unknown, state: { status: string }) => void

const mockExposeInMainWorld = jest.fn<(key: string, api: ExposedApi) => void>()
const mockInvoke = jest.fn<(...args: unknown[]) => Promise<unknown>>()
const mockOn = jest.fn<(channel: string, listener: UpdateStateListener) => void>()
const mockRemoveListener = jest.fn<(channel: string, listener: UpdateStateListener) => void>()

jest.mock('electron', () => ({
    contextBridge: {
        exposeInMainWorld: mockExposeInMainWorld,
    },
    ipcRenderer: {
        invoke: mockInvoke,
        on: mockOn,
        removeListener: mockRemoveListener,
    },
}))

describe('preload app API', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.resetModules()
    })

    test('exposes app.getInfo through the preload bridge', async () => {
        mockInvoke.mockResolvedValue({
            platform: 'mac',
            architecture: 'arm64',
            version: '1.2.3',
        })

        await import('./preload')

        expect(mockExposeInMainWorld).toHaveBeenCalledTimes(1)

        const exposedApi = mockExposeInMainWorld.mock.calls[0][1]
        const result = await exposedApi.app.getInfo()

        expect(mockInvoke).toHaveBeenCalledWith('app:getInfo')
        expect(result).toEqual({
            platform: 'mac',
            architecture: 'arm64',
            version: '1.2.3',
        })
    })

    test('exposes updater actions and state subscription through the preload bridge', async () => {
        await import('./preload')

        const exposedApi = mockExposeInMainWorld.mock.calls[0][1]
        const callback = jest.fn()
        const unsubscribe = exposedApi.app.updates.onStateChange(callback)

        await exposedApi.app.updates.getState()
        await exposedApi.app.updates.checkForUpdates()
        await exposedApi.app.updates.downloadUpdate()
        await exposedApi.app.updates.installUpdate()

        expect(mockInvoke).toHaveBeenCalledWith('app:update:getState')
        expect(mockInvoke).toHaveBeenCalledWith('app:update:check')
        expect(mockInvoke).toHaveBeenCalledWith('app:update:download')
        expect(mockInvoke).toHaveBeenCalledWith('app:update:install')
        expect(mockOn).toHaveBeenCalledWith('app:update:state', expect.any(Function))

        const listener = mockOn.mock.calls[0][1]
        listener({}, { status: 'idle' })
        expect(callback).toHaveBeenCalledWith({ status: 'idle' })

        unsubscribe()

        expect(mockRemoveListener).toHaveBeenCalledWith('app:update:state', listener)
    })

    test('exposes external.open through the preload bridge', async () => {
        await import('./preload')

        const exposedApi = mockExposeInMainWorld.mock.calls[0][1]
        await exposedApi.external.open('https://tally.so/r/pbAL6B')

        expect(mockInvoke).toHaveBeenCalledWith('external:open', 'https://tally.so/r/pbAL6B')
    })
})
