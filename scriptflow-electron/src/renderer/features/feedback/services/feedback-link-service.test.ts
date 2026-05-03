import { FeedbackLinkService } from './feedback-link-service'

type TestWindow = {
    api: {
        external: {
            open: jest.Mock<Promise<void>, [string]>
        }
    }
}

describe('FeedbackLinkService', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        const testWindow = window as unknown as TestWindow

        testWindow.api = {
            external: {
                open: jest.fn().mockResolvedValue(undefined),
            },
        }
    })

    test('opens URLs through the Electron external API', async () => {
        const testWindow = window as unknown as TestWindow

        await FeedbackLinkService.open('https://tally.so/r/pbAL6B')

        expect(testWindow.api.external.open).toHaveBeenCalledWith('https://tally.so/r/pbAL6B')
    })
})
