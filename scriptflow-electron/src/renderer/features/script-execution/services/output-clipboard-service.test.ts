import { OutputClipboardService } from './output-clipboard-service'

describe('OutputClipboardService', () => {
    let writeText: jest.Mock

    beforeEach(() => {
        writeText = jest.fn().mockResolvedValue(undefined)

        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText,
            },
        })
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('should copy output text exactly', async () => {
        const output = 'script activity output'

        const result = await OutputClipboardService.copyOutput(output)

        expect(result).toBe(true)
        expect(writeText).toHaveBeenCalledWith(output)
    })

    it('should copy multiline output without changing line breaks', async () => {
        const output = 'first line\nsecond line\r\nthird line'

        const result = await OutputClipboardService.copyOutput(output)

        expect(result).toBe(true)
        expect(writeText).toHaveBeenCalledWith(output)
    })

    it('should not copy empty output', async () => {
        const result = await OutputClipboardService.copyOutput('')

        expect(result).toBe(false)
        expect(writeText).not.toHaveBeenCalled()
    })

    it('should return false when clipboard writing fails', async () => {
        const error = new Error('Clipboard denied')
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        writeText.mockRejectedValueOnce(error)

        const result = await OutputClipboardService.copyOutput('output')

        expect(result).toBe(false)
        expect(consoleError).toHaveBeenCalledWith('Failed to copy output:', error)
    })
})
