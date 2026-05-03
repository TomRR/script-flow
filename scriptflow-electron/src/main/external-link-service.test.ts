import { shell } from 'electron'
import { ExternalLinkService } from './external-link-service'

jest.mock('electron', () => ({
    shell: {
        openExternal: jest.fn(),
    },
}))

describe('ExternalLinkService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('opens URLs in the system browser', async () => {
        const service = new ExternalLinkService()

        await service.open('https://tally.so/r/pbAL6B')

        expect(shell.openExternal).toHaveBeenCalledWith('https://tally.so/r/pbAL6B')
    })
})
