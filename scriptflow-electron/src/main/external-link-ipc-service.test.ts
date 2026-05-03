import type { IpcMainInvokeEvent } from 'electron'
import { ExternalLinkIpcService } from './external-link-ipc-service'
import { ExternalLinkService } from './external-link-service'

describe('ExternalLinkIpcService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('registers the external open handler and delegates to the service', async () => {
        const handle = jest.fn()
        const ipcMain = {
            handle,
        } as unknown as { handle: jest.Mock }
        const externalLinkService = {
            open: jest.fn().mockResolvedValue(undefined),
        } as unknown as ExternalLinkService

        ExternalLinkIpcService.register(ipcMain as never, externalLinkService)

        expect(handle).toHaveBeenCalledTimes(1)
        expect(handle).toHaveBeenCalledWith('external:open', expect.any(Function))

        const registeredHandler = handle.mock.calls[0][1] as (event: IpcMainInvokeEvent, url: string) => Promise<void>

        await registeredHandler({} as IpcMainInvokeEvent, 'https://tally.so/r/68kdGJ')

        expect(externalLinkService.open).toHaveBeenCalledWith('https://tally.so/r/68kdGJ')
    })
})
