import { VariablesUiService } from './variables-ui-service'

describe('VariablesUiService', () => {
    let consoleSpy: jest.SpyInstance

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
        consoleSpy.mockRestore()
    })

    it('should trigger addEnvironmentalUi', async () => {
        await VariablesUiService.addEnvironmentalUi()
        expect(consoleSpy).toHaveBeenCalledWith('addEnvironmentalUi triggered')
    })

    it('should trigger addSecretUi', async () => {
        await VariablesUiService.addSecretUi()
        expect(consoleSpy).toHaveBeenCalledWith('addSecretUi triggered')
    })
})
