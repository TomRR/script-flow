import { DuplicateScriptEntryService } from './duplicate-script-entry-service'

const mockVault = {
    duplicateScriptInSubSection: jest.fn(),
}

describe('DuplicateScriptEntryService', () => {
    beforeAll(() => {
        Object.defineProperty(window, 'api', {
            value: {
                vault: mockVault,
            },
            writable: true,
        })
    })
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('duplicateScriptInSubSection calls vault.duplicateScriptInSubSection', async () => {
        const mockScript = { id: '2', name: 'Script New', type: 'bash', path: '' }
        mockVault.duplicateScriptInSubSection.mockResolvedValue(mockScript)

        const result = await DuplicateScriptEntryService.duplicateScriptInSubSection('section-1', 'sub-1', 'script-1')
        expect(mockVault.duplicateScriptInSubSection).toHaveBeenCalledWith('section-1', 'sub-1', 'script-1')
        expect(result).toEqual(mockScript)
    })
})
